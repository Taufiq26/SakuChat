import { createClient } from '@supabase/supabase-js';
import { Transaction } from '@/types';
import { getStoredTransactions } from '@/lib/storage';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const customLock = (name: string, acquireTimeout: number, fn: () => Promise<any>) => {
  if (typeof window !== 'undefined' && window.isSecureContext && window.navigator && window.navigator.locks) {
    return window.navigator.locks.request(name, { mode: 'exclusive' }, async () => {
      return await fn();
    });
  }
  return fn();
};

export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        lock: customLock
      }
    }) 
  : null;

export interface UserSession {
  email: string;
  isLoggedIn: boolean;
  syncedCount: number;
}

const SESSION_KEY = 'sakuchat_user_session_v1';
const CLOUD_CACHE_KEY = 'sakuchat_cloud_transactions_cache_v1';

export function getStoredSession(): UserSession {
  if (typeof window === 'undefined') return { email: '', isLoggedIn: false, syncedCount: 0 };
  const stored = localStorage.getItem(SESSION_KEY);
  if (!stored) return { email: '', isLoggedIn: false, syncedCount: 0 };
  try {
    return JSON.parse(stored);
  } catch {
    return { email: '', isLoggedIn: false, syncedCount: 0 };
  }
}

export function saveSession(session: UserSession): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
}

export async function logoutSession(): Promise<void> {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_KEY);
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  }
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Supabase signout error:', err);
    }
  }
}

function getActiveAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  // 1. Check URL hash
  if (window.location.hash.includes('access_token=')) {
    const params = new URLSearchParams(window.location.hash.substring(1));
    const token = params.get('access_token');
    if (token) return token;
  }
  
  // 2. Check localStorage for Supabase auth token
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
      try {
        const item = JSON.parse(localStorage.getItem(key) || '{}');
        if (item && item.access_token) {
          return item.access_token;
        }
      } catch {}
    }
  }
  return null;
}

function getAuthClient(token?: string | null) {
  if (!supabaseUrl || !supabaseKey) return null;
  if (token) {
    return createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });
  }
  return supabase;
}

// Auto-merge local transactions to cloud with strict deduplication (FR-6 & EC-2)
export async function autoMergeLocalTransactions(
  localTransactions: Transaction[],
  userEmail: string
): Promise<{ mergedTransactions: Transaction[]; addedCount: number }> {
  let cloudTransactions: Transaction[] = [];

  let dbClient = supabase;
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || getActiveAccessToken();
    if (token) {
      dbClient = getAuthClient(token) || supabase;
    }
  }

  // 1. Fetch from real Supabase DB if client is configured (support both 'transactions' and 'expenses' tables)
  if (dbClient) {
    try {
      let { data, error } = await dbClient
        .from('transactions')
        .select('*')
        .eq('user_id', userEmail);
      
      if (error || !data) {
        const fallbackRes = await dbClient
          .from('expenses')
          .select('*')
          .eq('user_id', userEmail);
        if (fallbackRes.data && !fallbackRes.error) {
          data = fallbackRes.data;
          error = fallbackRes.error;
        }
      }
      
      if (data && !error) {
        cloudTransactions = data.map((row: any) => ({
          id: row.id,
          rawText: row.raw_text,
          amount: Number(row.amount),
          category: row.category,
          date: row.date,
          userId: row.user_id,
          isSynced: true
        }));
      }
    } catch {
      // Fallback if table not ready yet
    }
  }

  // Also read from local cloud cache simulation as fallback
  if (cloudTransactions.length === 0 && typeof window !== 'undefined') {
    const storedCloud = localStorage.getItem(CLOUD_CACHE_KEY);
    if (storedCloud) {
      try { cloudTransactions = JSON.parse(storedCloud); } catch {}
    }
  }

  // Combine local transactions and cloud transactions
  const combined = [...localTransactions, ...cloudTransactions];

  // Fingerprint check & ID deduplication to prevent duplicates (EC-2)
  const seenIds = new Set<string>();
  const seenFingerprints = new Set<string>();
  let addedCount = 0;
  const deduplicated: Transaction[] = [];
  const rowsToUpsert: any[] = [];

  for (const tx of combined) {
    const fingerprint = `${tx.date.slice(0, 10)}_${tx.amount}_${tx.rawText.toLowerCase().trim()}`;
    
    if (!seenIds.has(tx.id) && !seenFingerprints.has(fingerprint)) {
      seenIds.add(tx.id);
      seenFingerprints.add(fingerprint);
      
      const wasSynced = tx.isSynced;
      if (!wasSynced) {
        addedCount++;
      }
      
      const syncedTx: Transaction = {
        ...tx,
        userId: userEmail,
        isSynced: true
      };

      deduplicated.push(syncedTx);

      if (dbClient) {
        rowsToUpsert.push({
          id: syncedTx.id,
          user_id: userEmail,
          raw_text: syncedTx.rawText,
          amount: syncedTx.amount,
          category: syncedTx.category,
          date: syncedTx.date
        });
      }
    }
  }

  // 2. Upsert all deduplicated items to real Supabase DB
  if (dbClient && rowsToUpsert.length > 0) {
    try {
      const { error } = await dbClient.from('transactions').upsert(rowsToUpsert, { onConflict: 'id' });
      if (error) {
        console.warn('Upsert to transactions table failed, trying expenses table:', error.message);
        const { error: expError } = await dbClient.from('expenses').upsert(rowsToUpsert, { onConflict: 'id' });
        if (expError) {
          console.error('Supabase DB Upsert error:', expError.message);
        }
      }
    } catch (err) {
      console.error('Network error during upsert:', err);
    }
  }

  // Save the deduplicated synced list both to local storage and simulated cloud storage
  if (typeof window !== 'undefined') {
    localStorage.setItem('sakuchat_transactions_v1', JSON.stringify(deduplicated));
    localStorage.setItem(CLOUD_CACHE_KEY, JSON.stringify(deduplicated));
  }

  return { mergedTransactions: deduplicated, addedCount };
}

export async function autoSyncIfOnline(): Promise<{ synced: boolean; count: number }> {
  if (typeof window === 'undefined' || !navigator.onLine) {
    return { synced: false, count: 0 };
  }
  const session = getStoredSession();
  if (!session.isLoggedIn) {
    return { synced: false, count: 0 };
  }

  const txs = getStoredTransactions();
  const { mergedTransactions, addedCount } = await autoMergeLocalTransactions(txs, session.email);
  const updatedSession = { ...session, syncedCount: mergedTransactions.length };
  saveSession(updatedSession);
  return { synced: true, count: addedCount };
}

export async function deleteCloudTransaction(id: string): Promise<void> {
  const session = getStoredSession();
  if (!supabase) return;

  try {
    const { data: { session: authSession } } = await supabase.auth.getSession();
    const token = authSession?.access_token || getActiveAccessToken();
    const dbClient = token ? (getAuthClient(token) || supabase) : supabase;

    if (dbClient) {
      const uids = Array.from(new Set([
        session.email,
        authSession?.user?.id,
        authSession?.user?.email
      ].filter(Boolean))) as string[];

      for (const uid of uids) {
        await dbClient.from('transactions').delete().eq('id', id).eq('user_id', uid);
        await dbClient.from('expenses').delete().eq('id', id).eq('user_id', uid);
      }
      await dbClient.from('transactions').delete().eq('id', id);
      await dbClient.from('expenses').delete().eq('id', id);
    }
  } catch (err) {
    console.error('Failed to delete cloud transaction:', err);
  }
}

export async function updateCloudTransactionCategory(id: string, newCategory: string): Promise<void> {
  const session = getStoredSession();
  if (!session.isLoggedIn || !supabase) return;

  try {
    const { data: { session: authSession } } = await supabase.auth.getSession();
    const token = authSession?.access_token || getActiveAccessToken();
    const dbClient = token ? (getAuthClient(token) || supabase) : supabase;

    if (dbClient) {
      await dbClient.from('transactions').update({ category: newCategory }).eq('id', id).eq('user_id', session.email);
      await dbClient.from('expenses').update({ category: newCategory }).eq('id', id).eq('user_id', session.email);
    }
  } catch (err) {
    console.error('Failed to update cloud transaction category:', err);
  }
}

export async function updateCloudTransactionDate(id: string, newDateISO: string): Promise<void> {
  const session = getStoredSession();
  if (!session.isLoggedIn || !supabase) return;

  try {
    const { data: { session: authSession } } = await supabase.auth.getSession();
    const token = authSession?.access_token || getActiveAccessToken();
    const dbClient = token ? (getAuthClient(token) || supabase) : supabase;

    if (dbClient) {
      await dbClient.from('transactions').update({ date: newDateISO }).eq('id', id).eq('user_id', session.email);
      await dbClient.from('expenses').update({ date: newDateISO }).eq('id', id).eq('user_id', session.email);
    }
  } catch (err) {
    console.error('Failed to update cloud transaction date:', err);
  }
}

export async function deleteAllCloudTransactions(): Promise<void> {
  const session = getStoredSession();
  if (!supabase) return;

  try {
    const { data: { session: authSession } } = await supabase.auth.getSession();
    const token = authSession?.access_token || getActiveAccessToken();
    const dbClient = token ? (getAuthClient(token) || supabase) : supabase;

    if (dbClient) {
      const uids = Array.from(new Set([
        session.email,
        authSession?.user?.id,
        authSession?.user?.email
      ].filter(Boolean))) as string[];

      for (const uid of uids) {
        const res1 = await dbClient.from('transactions').delete().eq('user_id', uid);
        if (res1.error) console.error(`Error deleting transactions for ${uid}:`, res1.error);
        const res2 = await dbClient.from('expenses').delete().eq('user_id', uid);
        if (res2.error) console.error(`Error deleting expenses for ${uid}:`, res2.error);
      }
    }
    saveSession({ ...session, syncedCount: 0 });
  } catch (err) {
    console.error('Failed to delete all cloud transactions:', err);
  }
}
