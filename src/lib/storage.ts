import { Transaction, ChatMessage, CategoryDistribution, AnomalyAlert, CategoryName } from '@/types';
import { CATEGORY_COLORS } from './parser';

const TRANSACTIONS_KEY = 'sakuchat_transactions_v1';
const MESSAGES_KEY = 'sakuchat_messages_v1';
const LEARNED_KEYWORDS_KEY = 'sakuchat_learned_keywords_v1';

// Initial seed transactions so new users immediately see rich reports & anomaly insights
const INITIAL_TRANSACTIONS: Transaction[] = [
  // {
  //   id: 't-1',
  //   rawText: 'Makan siang di resto korea 150rb',
  //   amount: 150000,
  //   category: 'Makanan & Minuman',
  //   date: new Date(Date.now() - 3 * 86400000).toISOString(),
  //   isSynced: false
  // },
  // {
  //   id: 't-2',
  //   rawText: 'Grab ke kantor 35rb',
  //   amount: 35000,
  //   category: 'Transportasi',
  //   date: new Date(Date.now() - 2 * 86400000).toISOString(),
  //   isSynced: false
  // },
  // {
  //   id: 't-3',
  //   rawText: 'Bayar listrik dan token PLN 450000',
  //   amount: 450000,
  //   category: 'Tagihan & Utilitas',
  //   date: new Date(Date.now() - 1 * 86400000).toISOString(),
  //   isSynced: false
  // },
  // {
  //   id: 't-4',
  //   rawText: 'Beli baju baru di mall 650000',
  //   amount: 650000,
  //   category: 'Belanja',
  //   date: new Date().toISOString(),
  //   isSynced: false
  // },
  // {
  //   id: 't-5',
  //   rawText: 'Kopi kenangan sore 25000',
  //   amount: 25000,
  //   category: 'Makanan & Minuman',
  //   date: new Date().toISOString(),
  //   isSynced: false
  // }
];

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'm-0',
    sender: 'assistant',
    text: 'Halo! Selamat datang di **SakuChat** 👋 Asisten keuangan pribadi berbasis obrolan.\n\nKamu tidak perlu mengisi formulir panjang! Cukup ketik pengeluaranmu secara alami di bawah ini, contoh:\n- *"Makan siang di warteg 25rb"*\n- *"Grab ke kantor 35000"*\n- *"Bayar tagihan listrik 350rb"*',
    timestamp: new Date(Date.now() - 3600000).toISOString()
  }
];

export function getStoredTransactions(): Transaction[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(TRANSACTIONS_KEY);
  if (!stored) {
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(INITIAL_TRANSACTIONS));
    return INITIAL_TRANSACTIONS;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveTransaction(tx: Transaction): Transaction[] {
  const current = getStoredTransactions();
  const updated = [tx, ...current];
  if (typeof window !== 'undefined') {
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(updated));
  }
  return updated;
}

export function deleteTransaction(id: string): Transaction[] {
  const current = getStoredTransactions();
  const updated = current.filter((t) => t.id !== id);
  if (typeof window !== 'undefined') {
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(updated));
  }
  return updated;
}

export function saveAllTransactions(transactions: Transaction[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
  }
}

export function getLearnedKeywords(): Record<string, CategoryName> {
  if (typeof window === 'undefined') return {};
  const stored = localStorage.getItem(LEARNED_KEYWORDS_KEY);
  if (!stored) return {};
  try {
    return JSON.parse(stored);
  } catch {
    return {};
  }
}

export function learnKeywordsFromCorrection(rawText: string, newCategory: CategoryName): void {
  if (typeof window === 'undefined') return;
  const current = getLearnedKeywords();
  
  // Clean numbers, currency, units
  const clean = rawText
    .toLowerCase()
    .replace(/(?:rp\.?\s*)?\d+(?:[\.,]\d+)*(?:\s*(?:rb|ribu|k|jt|juta))?/gi, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .trim();

  const stopWords = ['dan', 'untuk', 'beli', 'bayar', 'buat', 'oleh', 'di', 'ke', 'dari', 'yang', 'ini', 'itu', 'ada', 'sudah'];
  const words = clean.split(/\s+/).filter((w) => w.length >= 3 && !stopWords.includes(w));
  
  words.forEach((word) => {
    current[word] = newCategory;
  });

  localStorage.setItem(LEARNED_KEYWORDS_KEY, JSON.stringify(current));
}

export function updateTransactionCategory(id: string, newCategory: CategoryName): Transaction[] {
  const current = getStoredTransactions();
  const targetTx = current.find((t) => t.id === id);
  if (targetTx) {
    learnKeywordsFromCorrection(targetTx.rawText, newCategory);
  }
  const updated = current.map((t) => (t.id === id ? { ...t, category: newCategory } : t));
  if (typeof window !== 'undefined') {
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(updated));
  }
  return updated;
}

export function getStoredMessages(): ChatMessage[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(MESSAGES_KEY);
  if (!stored) {
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(INITIAL_MESSAGES));
    return INITIAL_MESSAGES;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveMessage(msg: ChatMessage): ChatMessage[] {
  const current = getStoredMessages();
  const updated = [...current, msg];
  if (typeof window !== 'undefined') {
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(updated));
  }
  return updated;
}

export function clearAllLocalData(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TRANSACTIONS_KEY);
    localStorage.removeItem(MESSAGES_KEY);
  }
}

// Analytics Helpers for FR-3 & FR-4
export function getCategoryDistribution(transactions: Transaction[]): CategoryDistribution[] {
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
  if (totalAmount === 0) return [];

  const map: Record<string, number> = {};
  transactions.forEach((t) => {
    map[t.category] = (map[t.category] || 0) + t.amount;
  });

  return Object.entries(map)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: Math.round((amount / totalAmount) * 1000) / 10,
      color: CATEGORY_COLORS[category] || '#6B7280'
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function getTopSpending(transactions: Transaction[]): CategoryDistribution[] {
  return getCategoryDistribution(transactions).slice(0, 3);
}

export function getAnomalyAlerts(transactions: Transaction[]): AnomalyAlert[] {
  if (transactions.length < 3) return [];

  const alerts: AnomalyAlert[] = [];
  const dist = getCategoryDistribution(transactions);
  const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
  const avgTransactionAmount = totalSpent / transactions.length;

  // Check top spending category ratio
  if (dist.length > 0 && dist[0].percentage > 45) {
    alerts.push({
      id: 'alert-top-cat',
      title: `Lonjakan Pengeluaran: ${dist[0].category}`,
      description: `Kategori '${dist[0].category}' menyedot ${dist[0].percentage}% dari total pengeluaranmu (Rp ${dist[0].amount.toLocaleString('id-ID')}).`,
      recommendation: `Actionable Insight: Batasi pengeluaran di kategori '${dist[0].category}' sebesar minimal 30% pada minggu berikutnya untuk menjaga arus kasmu tetap sehat.`,
      severity: 'high',
      category: dist[0].category
    });
  }

  // Check single transaction anomaly (> 2x average normal)
  const singleAnomalies = transactions.filter((t) => t.amount >= avgTransactionAmount * 2.2 && t.amount >= 200000);
  if (singleAnomalies.length > 0) {
    const latestAnomaly = singleAnomalies[0];
    alerts.push({
      id: `alert-anom-${latestAnomaly.id}`,
      title: 'Deteksi Transaksi Tak Wajar (Anomali)',
      description: `Tercatat pengeluaran tunggal sebesar Rp ${latestAnomaly.amount.toLocaleString('id-ID')} ("${latestAnomaly.rawText}"), jauh melampaui rata-rata transaksi harianmu (Rp ${Math.round(avgTransactionAmount).toLocaleString('id-ID')}).`,
      recommendation: `Actionable Insight: Evaluasi apakah transaksi ini merupakan pengeluaran insidental atau konsumtif. Jika konsumtif, pertimbangkan menunda pembelian serupa selama 14 hari ke depan.`,
      severity: 'medium',
      category: latestAnomaly.category
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      id: 'alert-normal',
      title: 'Pengeluaran Terkendali & Sehat',
      description: 'Seluruh distribusi pengeluaranmu berada dalam rentang wajar dan seimbang antar kategori.',
      recommendation: 'Pertahankan kebiasaan mencatat harian dan sisihkan 20% dari penghasilanmu untuk dana darurat.',
      severity: 'info'
    });
  }

  return alerts;
}
