import { CategoryName } from '@/types';
import { aiClassifier } from './aiClassifier';

export interface ParsedExpense {
  amount: number | null;
  category: CategoryName;
  cleanDescription: string;
  dateISO?: string;
  dateLabel?: string;
}

const CATEGORY_KEYWORDS: Record<CategoryName, string[]> = {
  'Makanan & Minuman': [
    'makan', 'minum', 'kopi', 'warteg', 'bakso', 'baso', 'sate', 'nasi', 'naspad', 'nasi padang', 'cafe', 'kafe',
    'resto', 'sarapan', 'siang', 'malam', 'gofood', 'grabfood', 'shopeefood',
    'jajan', 'jajanan', 'boba', 'teh', 'roti', 'martabak', 'terang bulan', 'ayam', 'mie', 'es', 'es teh', 'seblak',
    'snack', 'cemilan', 'camilan', 'kue', 'donat', 'pizza', 'burger', 'susu', 'buah',
    'sayur', 'daging', 'ikan', 'telur',
    'batagor', 'siomay', 'somay', 'baso tahu', 'cilok', 'cimol', 'cireng', 'basreng', 'gorengan', 'pempek',
    'tekwan', 'gudeg', 'rawon', 'soto', 'mie ayam', 'kwetiau', 'bihun', 'nasgor',
    'magelangan', 'bubur', 'lontong', 'ketoprak', 'gado-gado', 'pecel', 'pecel lele', 'geprek', 'penyet',
    'warmindo', 'wamindo', 'burjo', 'angkringan', 'sate padang', 'warung'
  ],
  'Transportasi': [
    'grab', 'gojek', 'gocar', 'goride', 'maxim', 'bensin', 'pertalite', 'pertamax',
    'parkir', 'tol', 'krl', 'mrt', 'busway', 'transjakarta', 'ongkos', 'ojek',
    'servis', 'service', 'motor', 'mobil', 'oli', 'ganti oli', 'bengkel', 'ban',
    'tambal ban', 'cuci motor', 'cuci mobil', 'helm', 'aki', 'sparepart', 'kampas',
    'uber', 'taxi', 'taksi', 'kereta', 'bus', 'travel', 'ojol'
  ],
  'Kebutuhan Rumah Tangga': [
    'dapur', 'beras', 'masak', 'galon', 'air minum', 'gas', 'elpiji', 'lpg', 'deterjen', 'rinso', 'sunlight', 'wipol',
    'sapu', 'pel', 'perabotan', 'panci', 'wajan', 'belanja bulanan', 'superindo', 'alfamart', 'indomaret',
    'laundry', 'cuci baju', 'sabun cuci', 'pewangi', 'tisue', 'tisu', 'perabot', 'sabun cuci piring'
  ],
  'Kebutuhan Pribadi': [
    'skincare', 'sabun', 'shampo', 'sampo', 'odol', 'parfum', 'deodorants', 'deodorant', 'body lotion', 'serum',
    'sunscreen', 'salon', 'barbershop', 'cukur', 'potong rambut', 'baju', 'celana', 'sepatu', 'jaket', 'tas', 'dompet',
    'kosmetik', 'makeup', 'lipstik', 'skincare wajah', 'perawatan'
  ],
  'Tagihan & Utilitas': [
    'listrik', 'token', 'pln', 'air', 'pdam', 'wifi', 'indihome', 'biznet', 'pulsa',
    'paket data', 'kuota', 'kos', 'kontrakan', 'cicilan', 'asuransi', 'bpjs', 'pajak',
    'tagihan', 'langganan', 'iuran', 'ipl', 'sampah', 'keamanan', 'sewa'
  ],
  'Sosial & Sedekah': [
    'sedekah', 'zakat', 'infak', 'infaq', 'kotak amal', 'masjid', 'kondangan', 'amplop', 'sumbangan',
    'donasi', 'nyumbang', 'traktir', 'hadiah', 'kado', 'santunan', 'yatim', 'dkm', 'amal'
  ],
  'Hiburan & Liburan': [
    'nonton', 'bioskop', 'netflix', 'spotify', 'game', 'steam', 'liburan', 'hotel',
    'tiket', 'karaoke', 'hobi', 'wisata', 'konser', 'xxi', 'cgv', 'healing', 'jalan', 'staycation', 'villa', 'pantai'
  ],
  'Kesehatan': [
    'dokter', 'obat', 'apotek', 'rumahsakit', 'rumah sakit', 'klinik', 'vitamin', 'gym', 'medical',
    'periksa', 'gigi', 'suplemen', 'fitness', 'olahraga', 'checkup', 'terapi', 'pijat'
  ],
  'Edukasi & Investasi': [
    'buku', 'kursus', 'kuliah', 'spp', 'sekolah', 'les', 'udemy', 'coursera', 'pelatihan',
    'seminar', 'reksadana', 'saham', 'emas', 'bibit', 'bareksa', 'kripto', 'deposito', 'tabungan'
  ],
  'Lainnya': []
};

function extractNaturalLanguageDate(text: string): { dateISO?: string; dateLabel?: string } {
  const now = new Date();

  // 1. Slang / Single Word Keywords
  if (/kemarin\s+lusa|(?:2|dua)\s+hari\s+(?:yang\s+)?lalu|\bh-2\b/i.test(text)) {
    return { dateISO: new Date(now.getTime() - 2 * 86400000).toISOString(), dateLabel: 'kemarin lusa' };
  }
  if (/\b(?:kemarin|kmrn|kemaren|semalam)\b|(?:1|satu)\s+hari\s+(?:yang\s+)?lalu|\bh-1\b/i.test(text)) {
    return { dateISO: new Date(now.getTime() - 1 * 86400000).toISOString(), dateLabel: 'kemarin' };
  }

  // 2. Multi-unit relative terms (X hari/minggu/bulan/tahun lalu)
  const timeAgoMatch = text.match(/\b(\d+|satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh|sebelas|duabelas)\s+(hari|hri|minggu|mggu|bulan|bln|tahun|thn|taon)\s+(?:yang\s+)?(?:lalu|llu|silam|kemaren)\b/i);
  if (timeAgoMatch) {
    const wordToNum: Record<string, number> = {
      'satu': 1, 'dua': 2, 'tiga': 3, 'empat': 4, 'lima': 5,
      'enam': 6, 'tujuh': 7, 'delapan': 8, 'sembilan': 9, 'sepuluh': 10,
      'sebelas': 11, 'duabelas': 12
    };
    let num = parseInt(timeAgoMatch[1], 10);
    if (isNaN(num)) num = wordToNum[timeAgoMatch[1].toLowerCase()] || 1;
    const unitRaw = timeAgoMatch[2].toLowerCase();

    const d = new Date(now);
    let unitLabel = 'hari';
    if (/minggu|mggu/.test(unitRaw)) {
      d.setDate(d.getDate() - num * 7);
      unitLabel = 'minggu';
    } else if (/bulan|bln/.test(unitRaw)) {
      d.setMonth(d.getMonth() - num);
      unitLabel = 'bulan';
    } else if (/tahun|thn|taon/.test(unitRaw)) {
      d.setFullYear(d.getFullYear() - num);
      unitLabel = 'tahun';
    } else {
      d.setDate(d.getDate() - num);
      unitLabel = 'hari';
    }
    return { dateISO: d.toISOString(), dateLabel: `${num} ${unitLabel} lalu` };
  }

  // 3. Singular / "se-" relative terms (seminggu lalu, sebulan lalu, setahun lalu)
  if (/\b(?:se|1\s*)minggu\s+(?:yang\s+)?lalu\b/i.test(text) || /(?<!\d+\s+)\bminggu\s+lalu\b/i.test(text)) {
    return { dateISO: new Date(now.getTime() - 7 * 86400000).toISOString(), dateLabel: 'seminggu lalu' };
  }
  if (/\b(?:se|1\s*)bulan\s+(?:yang\s+)?lalu\b/i.test(text) || /(?<!\d+\s+)\bbulan\s+lalu\b/i.test(text)) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 1);
    return { dateISO: d.toISOString(), dateLabel: 'sebulan lalu' };
  }
  if (/\b(?:se|1\s*)tahun\s+(?:yang\s+)?lalu\b/i.test(text) || /(?<!\d+\s+)\btahun\s+lalu\b/i.test(text)) {
    const d = new Date(now);
    d.setFullYear(d.getFullYear() - 1);
    return { dateISO: d.toISOString(), dateLabel: 'setahun lalu' };
  }

  // 4. Specific dates: DD Month YYYY (e.g. "20 April 2025" or "20 apr 25")
  const monthNamesMap: Record<string, number> = {
    'januari': 0, 'jan': 0, 'februari': 1, 'feb': 1, 'maret': 2, 'mar': 2,
    'april': 3, 'apr': 3, 'mei': 4, 'juni': 5, 'jun': 5, 'juli': 6, 'jul': 6,
    'agustus': 7, 'agu': 7, 'ags': 7, 'september': 8, 'sep': 8,
    'oktober': 9, 'okt': 9, 'november': 10, 'nov': 10, 'desember': 11, 'des': 11
  };

  const dateMatch = text.match(/(?:tgl|tanggal)?\s*(\d{1,2})\s+(januari|jan|februari|feb|maret|mar|april|apr|mei|juni|jun|juli|jul|agustus|agu|ags|september|sep|oktober|okt|november|nov|desember|des)\b(?:\s+(\d{2,4}))?/i);
  if (dateMatch) {
    const day = parseInt(dateMatch[1], 10);
    const monthStr = dateMatch[2]?.toLowerCase();
    const yearStr = dateMatch[3];
    let month = now.getMonth();
    if (monthStr && monthStr in monthNamesMap) month = monthNamesMap[monthStr];
    let year = now.getFullYear();
    if (yearStr) {
      year = parseInt(yearStr, 10);
      if (year < 100) year += 2000;
    }
    if (day >= 1 && day <= 31) {
      const d = new Date(year, month, day, 12, 0, 0);
      const shortMonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      return { dateISO: d.toISOString(), dateLabel: `${day} ${shortMonthNames[month]} ${year}` };
    }
  }

  // 5. Numeric Slash/Dash Dates DD/MM/YYYY or DD-MM-YYYY
  const slashMatch = text.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
  if (slashMatch) {
    const day = parseInt(slashMatch[1], 10);
    const month = parseInt(slashMatch[2], 10) - 1;
    let year = slashMatch[3] ? parseInt(slashMatch[3], 10) : now.getFullYear();
    if (year < 100) year += 2000;
    if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
      const d = new Date(year, month, day, 12, 0, 0);
      const shortMonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      return { dateISO: d.toISOString(), dateLabel: `${day} ${shortMonthNames[month]} ${year}` };
    }
  }

  return {};
}

export function parseExpenseInput(rawInput: string): ParsedExpense {
  const text = rawInput.toLowerCase().trim();

  // 1. Extract Amount
  let amount: number | null = null;

  // Patterns:
  // 2.5jt / 2,5 jt / 2jt -> million
  // 25rb / 25k / 25 ribu -> thousand
  // 25.000 / 25,000 / 25000 / Rp 25.000
  const millionRegex = /(?:rp\.?\s*)?(\d+(?:[\.,]\d+)?)\s*(?:jt|juta)/i;
  const thousandRegex = /(?:rp\.?\s*)?(\d+(?:[\.,]\d+)?)\s*(?:rb|ribu|k\b)/i;
  const standardNumberRegex = /(?:rp\.?\s*)?(\d{1,3}(?:[\.,]\d{3})+(?:[\.,]\d+)?|\d+)/i;

  const millionMatch = text.match(millionRegex);
  const thousandMatch = text.match(thousandRegex);

  if (millionMatch) {
    const num = parseFloat(millionMatch[1].replace(',', '.'));
    if (!isNaN(num) && num > 0) amount = num * 1000000;
  } else if (thousandMatch) {
    const num = parseFloat(thousandMatch[1].replace(',', '.'));
    if (!isNaN(num) && num > 0) amount = num * 1000;
  } else {
    // Look for numbers like 25000 or 25.000
    // Find all numbers in text
    const numMatches = [...text.matchAll(/(?:rp\.?\s*)?(\d{1,3}(?:[\.,]\d{3})+|\d+)/gi)];
    if (numMatches && numMatches.length > 0) {
      // Pick the largest reasonable number as the expense amount
      let bestNum = 0;
      for (const match of numMatches) {
        const cleanStr = match[1].replace(/\./g, '').replace(/,/g, '');
        const parsed = parseInt(cleanStr, 10);
        if (!isNaN(parsed) && parsed > bestNum && parsed >= 500) {
          bestNum = parsed;
        }
      }
      if (bestNum > 0) {
        amount = bestNum;
      }
    }
  }

  // Extract Date early so early returns preserve date parsing
  const { dateISO, dateLabel } = extractNaturalLanguageDate(text);

  // 2. Determine Category
  let matchedCategory: CategoryName = 'Lainnya';

  // Rule 0: Check Self-Learning Memory (User Learned Keywords)
  if (typeof window !== 'undefined') {
    try {
      const storedLearned = localStorage.getItem('sakuchat_learned_keywords_v1');
      if (storedLearned) {
        const learnedMap = JSON.parse(storedLearned) as Record<string, CategoryName>;
        for (const [kw, cat] of Object.entries(learnedMap)) {
          if (text.includes(kw)) {
            return {
              amount,
              category: cat,
              cleanDescription: rawInput.trim(),
              dateISO,
              dateLabel
            };
          }
        }
      }
    } catch {
      // Ignore storage errors
    }
  }

  let maxScore = 0;
  for (const [catName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (catName === 'Lainnya') continue;
    let score = 0;
    for (const kw of keywords) {
      // Check word boundary or substring match
      if (text.includes(kw)) {
        score += kw.length; // Longer matching keywords get higher confidence
      }
    }
    if (score > maxScore) {
      maxScore = score;
      matchedCategory = catName as CategoryName;
    }
  }

  return {
    amount,
    category: matchedCategory,
    cleanDescription: rawInput.trim(),
    dateISO,
    dateLabel
  };
}

export async function parseExpenseInputAsync(rawInput: string): Promise<ParsedExpense> {
  const syncResult = parseExpenseInput(rawInput);
  
  // Rule 1: Always prioritize exact keyword matches from our dictionary
  if (syncResult.category !== 'Lainnya') {
    return syncResult;
  }
  
  // Rule 2: If local keyword matcher returned 'Lainnya', try On-Device WebAI semantic classification
  const aiRes = await aiClassifier.classify(rawInput);
  if (aiRes.category && aiRes.confidence > 32 && aiRes.category !== 'Lainnya') {
    return {
      amount: syncResult.amount,
      category: aiRes.category,
      cleanDescription: syncResult.cleanDescription,
      dateISO: syncResult.dateISO,
      dateLabel: syncResult.dateLabel
    };
  }

  return syncResult;
}

export const CATEGORY_COLORS: Record<string, string> = {
  'Makanan & Minuman': '#FB7185',       // Rose
  'Transportasi': '#38BDF8',            // Sky Blue
  'Kebutuhan Rumah Tangga': '#34D399',  // Emerald Mint
  'Kebutuhan Pribadi': '#F43F5E',       // Coral Pink
  'Tagihan & Utilitas': '#A78BFA',      // Lavender Violet
  'Sosial & Sedekah': '#10B981',        // Green Emerald
  'Hiburan & Liburan': '#FBBF24',       // Warm Amber Gold
  'Kesehatan': '#22D3EE',              // Cyan
  'Edukasi & Investasi': '#6366F1',     // Indigo Blue
  'Lainnya': '#94A3B8'                 // Slate Gray
};

export const STANDARD_CATEGORIES: CategoryName[] = [
  'Makanan & Minuman',
  'Transportasi',
  'Kebutuhan Rumah Tangga',
  'Kebutuhan Pribadi',
  'Tagihan & Utilitas',
  'Sosial & Sedekah',
  'Hiburan & Liburan',
  'Kesehatan',
  'Edukasi & Investasi',
  'Lainnya'
];

/**
 * Smart Category Alignment: Automatically maps any manual/custom imported category
 * or non-standard category string into one of SakuChat's 10 standardized categories.
 */
export function alignCategoryToStandard(customCatInput?: string, rawText?: string): CategoryName {
  if (!customCatInput || !customCatInput.trim()) {
    if (rawText) {
      return parseExpenseInput(rawText).category;
    }
    return 'Lainnya';
  }

  const cleanCat = customCatInput.trim();

  // 1. Check exact match (case-insensitive) against existing standard categories
  for (const std of STANDARD_CATEGORIES) {
    if (std.toLowerCase() === cleanCat.toLowerCase()) {
      return std;
    }
  }

  // 2. Keyword/Synonym alignment dictionary for non-standard or manual categories
  const lowerCat = cleanCat.toLowerCase();

  const SYNONYM_MAP: Record<CategoryName, string[]> = {
    'Makanan & Minuman': [
      'makan', 'minum', 'jajan', 'kuliner', 'snack', 'cafe', 'kafe', 'resto',
      'sarapan', 'siang', 'malam', 'roti', 'kopi', 'cemilan', 'gofood',
      'shopeefood', 'grabfood', 'bahan pokok', 'sembako', 'daging', 'sayur', 'buah', 'kue', 'groceries'
    ],
    'Transportasi': [
      'transport', 'transportasi', 'bensin', 'ojek', 'grab', 'gojek', 'gocar', 'goride',
      'parkir', 'tol', 'servis motor', 'servis mobil', 'kendaraan', 'ongkir', 'ongkos kirim',
      'taxi', 'taksi', 'krl', 'mrt', 'kereta', 'bus', 'motor', 'mobil', 'bengkel', 'travel', 'fuel'
    ],
    'Kebutuhan Rumah Tangga': [
      'rumah tangga', 'belanja bulanan', 'dapur', 'belanja dapur', 'supermarket', 'galon',
      'gas', 'laundry', 'perabot', 'kebersihan', 'sabun cuci', 'alat rumah', 'household', 'keperluan rumah'
    ],
    'Kebutuhan Pribadi': [
      'pribadi', 'belanja pribadi', 'skincare', 'pakaian', 'baju', 'sepatu', 'salon',
      'cukur', 'makeup', 'kosmetik', 'fashion', 'aksesoris', 'tas', 'perawatan', 'personal'
    ],
    'Tagihan & Utilitas': [
      'tagihan', 'utilitas', 'listrik', 'pln', 'air', 'pdam', 'internet', 'wifi',
      'pulsa', 'paket data', 'langganan', 'netflix', 'spotify', 'bpjs', 'cicilan',
      'sewa', 'kontrakan', 'bayar hutang', 'pinjol', 'kartu kredit', 'asuransi', 'bill', 'utility', 'utilities', 'kredit'
    ],
    'Sosial & Sedekah': [
      'sosial', 'sedekah', 'zakat', 'infaq', 'infak', 'sumbangan', 'donasi', 'hadiah',
      'kondangan', 'amplop', 'kado', 'traktir', 'keluarga', 'ortu', 'orang tua', 'charity', 'gift'
    ],
    'Hiburan & Liburan': [
      'hiburan', 'liburan', 'rekreasi', 'nonton', 'bioskop', 'game', 'gaming',
      'topup', 'top up', 'wisata', 'healing', 'staycation', 'jalan-jalan', 'karaoke', 'hobi', 'entertainment'
    ],
    'Kesehatan': [
      'kesehatan', 'obat', 'apotek', 'dokter', 'rumah sakit', 'klinik', 'vitamin', 'suplemen', 'medis', 'health', 'medical'
    ],
    'Edukasi & Investasi': [
      'edukasi', 'pendidikan', 'sekolah', 'kuliah', 'buku', 'kursus', 'pelatihan',
      'spp', 'les', 'investasi', 'reksadana', 'saham', 'emas', 'tabungan', 'crypto', 'kripto', 'education', 'investment'
    ],
    'Lainnya': ['lainnya', 'lain-lain', 'other', 'umum']
  };

  for (const [stdCat, keywords] of Object.entries(SYNONYM_MAP)) {
    if (stdCat === 'Lainnya') continue;
    for (const kw of keywords) {
      if (lowerCat.includes(kw)) {
        return stdCat as CategoryName;
      }
    }
  }

  // 3. If category name doesn't match synonyms directly, test combined category name + rawText through parseExpenseInput
  const combinedText = `${cleanCat} ${rawText || ''}`.trim();
  const parsed = parseExpenseInput(combinedText);
  if (parsed.category !== 'Lainnya') {
    return parsed.category;
  }

  return 'Lainnya';
}
