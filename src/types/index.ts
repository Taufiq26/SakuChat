export interface Transaction {
  id: string; // UUID v4
  userId?: string; // Null if anonymous/local
  rawText: string;
  amount: number;
  category: string;
  date: string; // ISO 8601 Timestamp
  isSynced: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  transactionId?: string; // Links to a created transaction
  needsAmountForText?: string; // For EC-1: text waiting for amount input
  suggestedCategory?: string;
}

export type CategoryName =
  | 'Makanan & Minuman'
  | 'Transportasi'
  | 'Kebutuhan Rumah Tangga'
  | 'Kebutuhan Pribadi'
  | 'Tagihan & Utilitas'
  | 'Sosial & Sedekah'
  | 'Hiburan & Liburan'
  | 'Kesehatan'
  | 'Edukasi & Investasi'
  | 'Lainnya';

export interface CategoryDistribution {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface AnomalyAlert {
  id: string;
  title: string;
  description: string;
  recommendation: string;
  severity: 'high' | 'medium' | 'info';
  category?: string;
}

export interface RoutineReminder {
  id: string;
  type: 'periodic' | 'anomaly';
  title: string;
  description: string;
  suggestedAmount: number;
  category: CategoryName;
  frequencyLabel: string;
  lastOccurredDate: string;
  nextDueDate?: string;
  isDismissedUntil?: string;
}
