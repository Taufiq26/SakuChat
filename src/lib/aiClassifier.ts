'use client';

import { CategoryName } from '@/types';

// We dynamically import @huggingface/transformers inside browser context
// to avoid any server-side initialization issues.

export type AIStatus = 'uninitialized' | 'loading' | 'ready' | 'error';

export interface AIClassificationResult {
  category: CategoryName | null;
  confidence: number;
  source: 'ai' | 'fallback';
}

const CATEGORY_ANCHORS: Record<CategoryName, string> = {
  'Makanan & Minuman': 'makan minum restoran cafe kopi sarapan makan siang malam camilan kue buah sayur susu minuman enak jajan gofood makan bersama warteg',
  'Transportasi': 'transportasi kendaraan bensin parkir tol ojek grab gojek servis service bengkel ganti oli ban cuci motor mobil krl kereta bus taksi ojol tambal ban aki perbaikan kendaraan',
  'Kebutuhan Rumah Tangga': 'belanja bulanan kebutuhan rumah perabot beras dapur galon air minum gas elpiji lpg deterjen sabun cuci pembersih rumah sapu pel wajan panci perlengkapan rumah',
  'Kebutuhan Pribadi': 'belanja baju pakaian sepatu tas kosmetik skincare perawatan wajah sabun mandi shampo salon barbershop potong rambut parfum jam tangan dompet perlengkapan pribadi',
  'Tagihan & Utilitas': 'tagihan bulanan bayar listrik token pln air pdam internet wifi pulsa paket data kuota kos sewa kontrakan cicilan asuransi bpjs iuran sampah keamanan',
  'Sosial & Sedekah': 'sedekah zakat infak sumbangan donasi kotak amal masjid kondangan amplop pernikahan hadiah kado santunan yatim piatu berbagi kebaikan traktir teman',
  'Hiburan & Liburan': 'hiburan rekreasi liburan nonton bioskop film netflix game main wisata karaoke hobi konser jalan santai healing hotel staycation pantai villa tiket wisata',
  'Kesehatan': 'kesehatan medis sakit dokter rumah sakit klinik apotek obat vitamin pemeriksaan checkup fitness gym olahraga gigi suplemen terapi pijat',
  'Edukasi & Investasi': 'pendidikan sekolah kuliah buku kursus seminar pelatihan spp les tutorial nabung reksadana saham emas kripto deposito investasi masa depan',
  'Lainnya': 'lainnya umum pengeluaran beragam tidak terklasifikasi transfer'
};

class AIClassifierSingleton {
  private static instance: AIClassifierSingleton;
  private pipe: any = null;
  private anchorEmbeddings: Record<string, number[]> = {};
  public status: AIStatus = 'uninitialized';
  public progress: number = 0;
  private progressListeners: ((status: AIStatus, progress: number) => void)[] = [];

  private constructor() {}

  public static getInstance(): AIClassifierSingleton {
    if (!AIClassifierSingleton.instance) {
      AIClassifierSingleton.instance = new AIClassifierSingleton();
    }
    return AIClassifierSingleton.instance;
  }

  public subscribe(listener: (status: AIStatus, progress: number) => void) {
    this.progressListeners.push(listener);
    listener(this.status, this.progress);
    return () => {
      this.progressListeners = this.progressListeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.progressListeners.forEach((l) => l(this.status, this.progress));
  }

  public async init() {
    if (typeof window === 'undefined') return;
    if (this.status === 'ready' || this.status === 'loading') return;

    if (!window.isSecureContext || typeof caches === 'undefined') {
      console.warn('Insecure HTTP LAN origin detected. WebAI requires HTTPS or localhost. Activating fast keyword parser fallback.');
      this.status = 'error';
      this.notify();
      return;
    }

    try {
      this.status = 'loading';
      this.progress = 5;
      this.notify();

      const { pipeline, env } = await import('@huggingface/transformers');
      env.allowLocalModels = false;
      env.useBrowserCache = true;

      this.pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
        dtype: 'fp32',
        progress_callback: (data: any) => {
          if (data.status === 'progress' && data.progress !== undefined) {
            const mapped = 5 + Math.round((Math.min(100, data.progress) / 100) * 75);
            if (mapped > this.progress) {
              this.progress = mapped;
              this.notify();
            }
          } else if (data.status === 'ready') {
            if (80 > this.progress) {
              this.progress = 80;
              this.notify();
            }
          }
        }
      });

      if (82 > this.progress) {
        this.progress = 82;
        this.notify();
      }

      // Yield to main UI thread so rendering/animations don't freeze after download completes
      await new Promise((resolve) => setTimeout(resolve, 80));

      // Pre-compute embeddings for all anchor categories with yielding
      const entries = Object.entries(CATEGORY_ANCHORS);
      let step = 0;
      for (const [cat, text] of entries) {
        if (cat === 'Lainnya') continue;
        const out = await this.pipe(text, { pooling: 'mean', normalize: true });
        this.anchorEmbeddings[cat] = Array.from(out.data);
        step++;
        const mappedStep = 82 + Math.round((step / entries.length) * 17);
        if (mappedStep > this.progress) {
          this.progress = mappedStep;
          this.notify();
        }
        // Yield 20ms to allow UI animation frames to render smoothly
        await new Promise((resolve) => setTimeout(resolve, 20));
      }

      this.status = 'ready';
      this.progress = 100;
      this.notify();
    } catch (err) {
      console.error('Failed to initialize On-Device WebAI:', err);
      this.status = 'error';
      this.notify();
    }
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dot = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
    }
    return dot;
  }

  public async classify(textInput: string): Promise<AIClassificationResult> {
    if (this.status !== 'ready' || !this.pipe) {
      return { category: null, confidence: 0, source: 'fallback' };
    }

    try {
      const cleanText = textInput.replace(/\d+/g, '').trim() || textInput;
      const out = await this.pipe(cleanText, { pooling: 'mean', normalize: true });
      const inputVec = Array.from(out.data) as number[];

      let bestCat: CategoryName = 'Lainnya';
      let maxSim = -1;

      for (const [cat, anchorVec] of Object.entries(this.anchorEmbeddings)) {
        const sim = this.cosineSimilarity(inputVec, anchorVec);
        if (sim > maxSim) {
          maxSim = sim;
          bestCat = cat as CategoryName;
        }
      }

      // Threshold for semantic match confidence
      if (maxSim > 0.22) {
        return {
          category: bestCat,
          confidence: Math.round(maxSim * 100),
          source: 'ai'
        };
      }

      return { category: null, confidence: Math.round(maxSim * 100), source: 'fallback' };
    } catch (err) {
      console.error('Semantic classification error:', err);
      return { category: null, confidence: 0, source: 'fallback' };
    }
  }
}

export const aiClassifier = AIClassifierSingleton.getInstance();
