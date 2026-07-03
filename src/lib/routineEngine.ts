import { Transaction, RoutineReminder, CategoryName } from '@/types';

const DISMISSED_KEY = 'sakuchat_dismissed_routines_v1';

export function getDismissedRoutines(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(DISMISSED_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

export function dismissRoutine(id: string, daysSnooze: number = 7): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getDismissedRoutines();
    const until = new Date(Date.now() + daysSnooze * 86400 * 1000).toISOString();
    current[id] = until;
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(current));
  } catch {}
}

export function clearDismissedRoutines(): void {
  if (typeof window !== 'undefined') {
    try { localStorage.removeItem(DISMISSED_KEY); } catch {}
  }
}

interface RoutineTemplate {
  id: string;
  keywords: string[];
  title: string;
  category: CategoryName;
  intervalDays: number;
  frequencyLabel: string;
  defaultAmount: number;
}

const ROUTINE_TEMPLATES: RoutineTemplate[] = [
  {
    id: 'rt-servis-motor',
    keywords: ['servis motor', 'service motor', 'ganti oli', 'bengkel motor', 'oli motor'],
    title: 'Servis Motor & Ganti Oli',
    category: 'Transportasi',
    intervalDays: 30,
    frequencyLabel: 'Bulanan (~30 Hari)',
    defaultAmount: 85000
  },
  {
    id: 'rt-potong-rambut',
    keywords: ['potong rambut', 'cukur', 'barbershop', 'salon', 'cukur rambut'],
    title: 'Potong Rambut / Perawatan Diri',
    category: 'Kebutuhan Pribadi',
    intervalDays: 30,
    frequencyLabel: 'Bulanan (~30 Hari)',
    defaultAmount: 35000
  },
  {
    id: 'rt-sedekah-jumat',
    keywords: ['sedekah', 'infak', 'infaq', 'kotak amal', 'masjid', 'zakat'],
    title: 'Sedekah & Berbagi Rutin',
    category: 'Sosial & Sedekah',
    intervalDays: 7,
    frequencyLabel: 'Mingguan (~7 Hari)',
    defaultAmount: 20000
  },
  {
    id: 'rt-listrik-token',
    keywords: ['listrik', 'token pln', 'pln', 'wifi', 'indihome', 'tagihan internet'],
    title: 'Tagihan Listrik / Token & WiFi',
    category: 'Tagihan & Utilitas',
    intervalDays: 30,
    frequencyLabel: 'Bulanan (~30 Hari)',
    defaultAmount: 150000
  },
  {
    id: 'rt-belanja-dapur',
    keywords: ['beras', 'galon', 'air minum', 'gas elpiji', 'lpg', 'belanja bulanan'],
    title: 'Belanja Pokok Dapur (Beras/Galon/Gas)',
    category: 'Kebutuhan Rumah Tangga',
    intervalDays: 14,
    frequencyLabel: 'Dua Mingguan (~14 Hari)',
    defaultAmount: 120000
  }
];

export function detectSmartRoutines(transactions: Transaction[]): RoutineReminder[] {
  const reminders: RoutineReminder[] = [];
  const dismissed = getDismissedRoutines();
  const now = new Date();

  // FR-1 & EC-2: Periodic Routine Detection
  ROUTINE_TEMPLATES.forEach((tpl) => {
    // Check if currently snoozed/dismissed
    if (dismissed[tpl.id]) {
      const snoozeDate = new Date(dismissed[tpl.id]);
      if (snoozeDate > now) return; // Still snoozed
    }

    // Find all historical transactions matching this routine's keywords
    const matches = transactions.filter((t) => {
      const lower = t.rawText.toLowerCase();
      return tpl.keywords.some((kw) => lower.includes(kw));
    });

    let suggestedAmount = tpl.defaultAmount;
    let lastDateObj = new Date(Date.now() - tpl.intervalDays * 86400 * 1000); // default fallback

    if (matches.length > 0) {
      // Sort descending by date
      const sorted = [...matches].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const latest = sorted[0];
      lastDateObj = new Date(latest.date);
      suggestedAmount = latest.amount || tpl.defaultAmount;

      const daysSinceLast = (now.getTime() - lastDateObj.getTime()) / (1000 * 86400);

      // EC-2: If already recorded within the last 80% of interval (e.g. within last 24 days for a 30-day routine), do not remind yet!
      if (daysSinceLast < tpl.intervalDays * 0.8) {
        return;
      }
    } else {
      // If user has > 5 transactions total in app, suggest common monthly life routines proactively
      if (transactions.length < 3) return;
    }

    const nextDue = new Date(lastDateObj.getTime() + tpl.intervalDays * 86400 * 1000);
    const isDueOrOverdue = now >= nextDue || (nextDue.getTime() - now.getTime()) / (1000 * 86400) <= 3;

    if (isDueOrOverdue || matches.length > 0) {
      reminders.push({
        id: tpl.id,
        type: 'periodic',
        title: tpl.title,
        description: matches.length > 0
          ? `Sudah tiba waktunya! Terakhir dicatat pada ${lastDateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}.`
          : `Rutinitas berkala yang disarankan untuk menjaga kondisi kendaraan & kehidupanmu tetap terawat.`,
        suggestedAmount: Math.round(suggestedAmount),
        category: tpl.category,
        frequencyLabel: tpl.frequencyLabel,
        lastOccurredDate: lastDateObj.toISOString(),
        nextDueDate: nextDue.toISOString()
      });
    }
  });

  // FR-2: Anomaly & Frequency Detection (Short-term spending spikes)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400 * 1000);
  const recentTxs = transactions.filter((t) => new Date(t.date) >= sevenDaysAgo);

  const indulgenceGroups = [
    { id: 'anom-kopi', name: 'Kopi / Cafe', keywords: ['kopi', 'coffee', 'starbucks', 'kenangan', 'janji jiwa', 'fore', 'cafe', 'kafe'] },
    { id: 'anom-jajan', name: 'Jajan & Camilan', keywords: ['jajan', 'camilan', 'snack', 'boba', 'mixue', 'es krim', 'goréngan', 'gorengan', 'martabak'] },
    { id: 'anom-rokok', name: 'Rokok / Vape', keywords: ['rokok', 'roko', 'vape', 'pod', 'liquid'] },
    { id: 'anom-online', name: 'Belanja Online / GoFood', keywords: ['gofood', 'grabfood', 'shopeefood', 'tokopedia', 'shopee'] }
  ];

  indulgenceGroups.forEach((grp) => {
    if (dismissed[grp.id]) {
      const snoozeDate = new Date(dismissed[grp.id]);
      if (snoozeDate > now) return;
    }

    const matchingRecent = recentTxs.filter((t) => {
      const lower = t.rawText.toLowerCase();
      return grp.keywords.some((kw) => lower.includes(kw));
    });

    if (matchingRecent.length >= 4) {
      const totalAmount = matchingRecent.reduce((sum, t) => sum + t.amount, 0);
      reminders.push({
        id: grp.id,
        type: 'anomaly',
        title: `Lonjakan Frekuensi: ${grp.name}`,
        description: `Terdeteksi ${matchingRecent.length} kali pembelian dalam 7 hari terakhir dengan akumulasi Rp ${totalAmount.toLocaleString('id-ID')}.`,
        suggestedAmount: totalAmount,
        category: matchingRecent[0].category as CategoryName || 'Makanan & Minuman',
        frequencyLabel: 'Anomali 7 Hari Terakhir',
        lastOccurredDate: matchingRecent[0].date
      });
    }
  });

  return reminders;
}
