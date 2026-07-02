'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Cloud, CheckCircle, Database, Shield, RefreshCw, LogIn, LogOut, Download, Upload, AlertCircle, MailCheck, KeyRound, ArrowLeft, Sun, Moon } from 'lucide-react';
import { getStoredTransactions, saveAllTransactions, clearAllLocalData } from '@/lib/storage';
import { Transaction } from '@/types';
import { getStoredSession, saveSession, logoutSession, autoMergeLocalTransactions, autoSyncIfOnline, UserSession, supabase } from '@/lib/supabase';
import { getStoredTheme, applyTheme, ThemeMode } from '@/lib/theme';
import { alignCategoryToStandard } from '@/lib/parser';
import AlertModal from './AlertModal';

interface SettingsViewProps {
  onDataReset: () => void;
}

export default function SettingsView({ onDataReset }: SettingsViewProps) {
  const [session, setSession] = useState<UserSession>({ email: '', isLoggedIn: false, syncedCount: 0 });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [localCount, setLocalCount] = useState(0);
  const [theme, setTheme] = useState<ThemeMode>('light');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'confirm';
    title: string;
    message: string;
    confirmText?: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
  });

  const showAlert = (
    type: 'success' | 'error' | 'warning' | 'confirm',
    title: string,
    message: string,
    confirmText?: string,
    onConfirm?: () => void
  ) => {
    setModalConfig({
      isOpen: true,
      type,
      title,
      message,
      confirmText,
      onConfirm,
    });
  };

  const closeModal = () => {
    setModalConfig((prev) => ({ ...prev, isOpen: false }));
  };

  useEffect(() => {
    async function checkSessionAndHash() {
      setSession(getStoredSession());
      setLocalCount(getStoredTransactions().length);

      if (typeof window !== 'undefined' && window.location.hash.includes('access_token=')) {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken) {
          try {
            if (supabase && refreshToken) {
              await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
            }
            const payloadPart = accessToken.split('.')[1];
            if (payloadPart) {
              const base64Url = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
              const decodedPayload = JSON.parse(atob(base64Url));
              if (decodedPayload.email) {
                const txs = getStoredTransactions();
                const { mergedTransactions } = await autoMergeLocalTransactions(txs, decodedPayload.email);
                localStorage.setItem('sakuchat_transactions_v1', JSON.stringify(mergedTransactions));
                const newSess: UserSession = {
                  email: decodedPayload.email,
                  isLoggedIn: true,
                  syncedCount: mergedTransactions.length
                };
                saveSession(newSess);
                setSession(newSess);
                window.history.replaceState({}, document.title, window.location.pathname);
                onDataReset();
                return;
              }
            }
          } catch (err) {
            console.error(err);
          }
        }
      }

      const storedSess = getStoredSession();
      if (supabase) {
        if (!storedSess.isLoggedIn) {
          supabase.auth.signOut().catch(() => {});
        } else {
          supabase.auth.getSession().then(({ data: { session: sbSession } }) => {
            if (sbSession && sbSession.user && sbSession.user.email) {
              autoMergeLocalTransactions(getStoredTransactions(), sbSession.user.email).then(({ mergedTransactions }) => {
                const newSess: UserSession = {
                  email: sbSession.user.email!,
                  isLoggedIn: true,
                  syncedCount: mergedTransactions.length
                };
                saveSession(newSess);
                setSession(newSess);
              });
            }
          });
        }
      }
    }

    checkSessionAndHash();
    setTheme(getStoredTheme());

    const handleThemeEvent = (e: Event) => {
      const customE = e as CustomEvent<ThemeMode>;
      if (customE.detail) setTheme(customE.detail);
    };
    window.addEventListener('sakuchat-theme-changed', handleThemeEvent);

    return () => {
      window.removeEventListener('sakuchat-theme-changed', handleThemeEvent);
    };
  }, []);

  const handleThemeChange = (newTheme: ThemeMode) => {
    applyTheme(newTheme);
    setTheme(newTheme);
  };

  const handleGoogleSignIn = async () => {
    setIsSyncing(true);
    setSyncStatusMsg('Menghubungkan ke layanan Google Sign-In...');

    if (supabase) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined
        }
      });
      if (error) {
        showAlert('error', 'Login Google Gagal', 'Gagal membuka login Google: ' + error.message);
        setIsSyncing(false);
        setSyncStatusMsg(null);
      }
    } else {
      const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      if (!isLocalhost) {
        showAlert(
          'error',
          'Konfigurasi Cloud Belum Aktif',
          'Sistem mendeteksi Environment Variables (NEXT_PUBLIC_SUPABASE_URL & NEXT_PUBLIC_SUPABASE_ANON_KEY) belum terbaca di Vercel. Pastikan Anda sudah menambahkannya di Vercel Settings > Environment Variables, LALU lakukan Re-deploy pada proyek Anda agar Next.js menyertakan konfigurasi tersebut.'
        );
        setIsSyncing(false);
        setSyncStatusMsg(null);
        return;
      }

      const simulatedEmail = prompt('Masukkan alamat email Google / Gmail Anda untuk login cloud (Mode Simulasi Lokal):', 'budi@gmail.com');
      if (simulatedEmail && simulatedEmail.includes('@')) {
        const txs = getStoredTransactions();
        const { mergedTransactions, addedCount } = await autoMergeLocalTransactions(txs, simulatedEmail.trim());
        if (typeof window !== 'undefined') {
          localStorage.setItem('sakuchat_transactions_v1', JSON.stringify(mergedTransactions));
        }
        const newSession: UserSession = {
          email: simulatedEmail.trim(),
          isLoggedIn: true,
          syncedCount: mergedTransactions.length
        };
        saveSession(newSession);
        setSession(newSession);
        setIsSyncing(false);
        setSyncStatusMsg(`✅ Login Google berhasil! ${addedCount} transaksi tersinkronisasi tanpa duplikasi.`);
        onDataReset();
      } else {
        setIsSyncing(false);
        setSyncStatusMsg(null);
      }
    }
  };

  const handleManualSync = async () => {
    if (!session.isLoggedIn) return;
    setIsSyncing(true);
    setSyncStatusMsg('Menyinkronkan data terbaru ke cloud...');
    const txs = getStoredTransactions();
    const { mergedTransactions } = await autoMergeLocalTransactions(txs, session.email);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sakuchat_transactions_v1', JSON.stringify(mergedTransactions));
    }
    const updatedSession = { ...session, syncedCount: mergedTransactions.length };
    saveSession(updatedSession);
    setSession(updatedSession);
    setIsSyncing(false);
    setSyncStatusMsg('✅ Sinkronisasi selesai! Semua data mutakhir.');
    onDataReset();
  };

  const handleLogout = () => {
    logoutSession();
    setSession({ email: '', isLoggedIn: false, syncedCount: 0 });
    setSyncStatusMsg('Akun telah keluar. Aplikasi kembali ke mode 100% lokal.');
  };

  const handleClearData = () => {
    showAlert(
      'confirm',
      'Hapus Data Permanen?',
      'Apakah kamu yakin ingin menghapus semua data pengeluaran dan riwayat obrolan secara permanen di perangkat ini?',
      'Ya, Hapus Semua',
      () => {
        clearAllLocalData();
        setLocalCount(0);
        onDataReset();
        closeModal();
      }
    );
  };

  const handleExportJSON = () => {
    const data = getStoredTransactions();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sakuchat_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        showAlert('error', 'Format File Tidak Valid', 'File backup harus berisi daftar (array) transaksi JSON SakuChat yang sah.');
        return;
      }

      const current = getStoredTransactions();
      const existingIds = new Set(current.map((t) => t.id));
      const existingSignatures = new Set(current.map((t) => `${t.date}_${t.amount}_${t.rawText}`));

      let addedCount = 0;
      const validImports: Transaction[] = [];

      for (const item of parsed) {
        if (item && typeof item === 'object' && typeof item.amount === 'number' && typeof item.rawText === 'string') {
          const id = item.id || `import-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          const signature = `${item.date}_${item.amount}_${item.rawText}`;
          if (!existingIds.has(id) && !existingSignatures.has(signature)) {
            validImports.push({
              id,
              userId: session.isLoggedIn ? session.email : undefined,
              rawText: item.rawText,
              amount: item.amount,
              category: alignCategoryToStandard(item.category, item.rawText),
              date: item.date || new Date().toISOString(),
              isSynced: false
            });
            existingIds.add(id);
            existingSignatures.add(signature);
            addedCount++;
          }
        }
      }

      if (validImports.length > 0) {
        const merged = [...validImports, ...current];
        saveAllTransactions(merged);
        setLocalCount(merged.length);
        if (navigator.onLine && session.isLoggedIn) {
          autoSyncIfOnline();
        }
        setSyncStatusMsg(`✅ Berhasil mengimpor ${addedCount} transaksi baru ke penyimpanan lokal!`);
        showAlert('success', 'Impor Berhasil!', `Berhasil mengimpor ${addedCount} transaksi baru ke penyimpanan lokal!`);
      } else {
        showAlert('warning', 'Data Sudah Tersedia', 'Semua transaksi di dalam file backup sudah ada di perangkat ini (tidak ada duplikasi yang ditambahkan).');
      }
    } catch (error) {
      showAlert('error', 'Gagal Membaca File', 'Gagal mengimpor file backup. Pastikan file berformat JSON yang sah dan tidak rusak.');
    } finally {
      if (event.target) event.target.value = '';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-5">
      {/* Cloud Sync & Auto-Merge Card */}
      <div className="glass-panel p-5 space-y-4 bg-gradient-to-br from-indigo-50/90 via-sky-50/60 to-white border-indigo-200/80 shadow-md dark:from-slate-900 dark:via-indigo-950/40 dark:to-slate-900 dark:border-indigo-900/60">
        <div className="flex items-center gap-2.5 font-black text-base text-slate-800 dark:text-slate-100">
          <Cloud className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
          <span>Sinkronisasi Cloud & Auto-Merge</span>
        </div>

        {session.isLoggedIn ? (
          <div className="space-y-3.5">
            <div className="p-4 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/80 flex items-center justify-between gap-3 shadow-xs">
              <div className="min-w-0">
                <div className="text-xs text-emerald-700 dark:text-emerald-400 font-extrabold flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Terhubung ke Cloud Sync
                </div>
                <div className="font-black text-sm text-slate-800 dark:text-emerald-100 mt-1 truncate">{session.email}</div>
                <div className="text-xs font-semibold text-slate-600 dark:text-emerald-300/80 mt-0.5">{session.syncedCount} transaksi tersinkronisasi</div>
              </div>
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-50 shrink-0 shadow-md cursor-pointer"
                title="Sinkronkan sekarang"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <button
              onClick={handleLogout}
              className="w-full py-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800/80 text-rose-600 dark:text-rose-300 text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> Keluar dari Akun Cloud
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">
              Masuk dengan 1-Klik menggunakan <span className="font-extrabold text-indigo-600 dark:text-indigo-400">Akun Google (Gmail)</span> resmi Anda untuk mencadangkan dan menyinkronkan data antar perangkat secara otomatis di latar belakang tanpa duplikasi!
            </p>
            <button
              onClick={handleGoogleSignIn}
              disabled={isSyncing}
              className="w-full py-3.5 px-5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100 font-extrabold text-xs transition-all flex items-center justify-center gap-3 shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer group"
            >
              <svg className="w-4 h-4 transition-transform group-hover:scale-110 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Masuk dengan Akun Google</span>
            </button>
          </div>
        )}

        {syncStatusMsg && (
          <div className="p-3.5 rounded-xl bg-white/90 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs">
            {syncStatusMsg}
          </div>
        )}
      </div>

      {/* Local Storage & Privacy Status */}
      <div className="glass-panel p-5 space-y-4">
        <div className="flex items-center gap-2 font-extrabold text-sm text-slate-800 dark:text-slate-100">
          <Shield className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          <span>Privasi & Penyimpanan Lokal</span>
        </div>
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">
          Secara standar, seluruh transaksi dan percakapanmu disimpan 100% secara privat di peramban pengguna melalui penyimpanan lokal (<span className="font-mono text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 px-1.5 py-0.5 rounded text-[11px] font-bold">localStorage</span>). Aplikasi berfungsi penuh tanpa koneksi internet.
        </p>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json"
          className="hidden"
        />

        <div className="space-y-3 pt-1">
          {/* Transaksi Lokal Banner */}
          <div className="p-4 rounded-2xl bg-slate-50/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between gap-2">
            <div className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" /> 
              <span>Transaksi Tersimpan Lokal</span>
            </div>
            <div className="px-3.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-black text-xs sm:text-sm text-center shrink-0 whitespace-nowrap flex items-center justify-center">
              {localCount} Item
            </div>
          </div>

          {/* Ekspor & Impor Side by Side */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleExportJSON}
              className="p-3.5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/90 hover:bg-emerald-50/90 dark:hover:bg-emerald-950/50 border border-slate-200/80 dark:border-slate-700/80 hover:border-emerald-300 dark:hover:border-emerald-700 text-center transition-all flex flex-col items-center justify-center shadow-xs group cursor-pointer"
            >
              <div className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 group-hover:-translate-y-0.5 transition-transform shrink-0" /> Ekspor Data
              </div>
              <div className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">Unduh Backup JSON</div>
            </button>
            <button
              onClick={handleImportClick}
              className="p-3.5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/90 hover:bg-sky-50/90 dark:hover:bg-sky-950/50 border border-slate-200/80 dark:border-slate-700/80 hover:border-sky-300 dark:hover:border-sky-700 text-center transition-all flex flex-col items-center justify-center shadow-xs group cursor-pointer"
            >
              <div className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 group-hover:-translate-y-0.5 transition-transform shrink-0" /> Impor Data
              </div>
              <div className="text-[11px] font-extrabold text-sky-600 dark:text-sky-400 mt-1">Pulihkan Backup JSON</div>
            </button>
          </div>
        </div>
      </div>

      {/* Theme Settings Card */}
      <div className="glass-panel p-5 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-extrabold text-sm text-slate-800 dark:text-slate-100">
            {theme === 'light' ? (
              <Sun className="w-4 h-4 text-amber-500" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-400" />
            )}
            <span>Tema Tampilan Aplikasi</span>
          </div>
        </div>
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 leading-relaxed">
          Pilih tema visual yang nyaman di mata untuk penggunaan siang atau malam hari.
        </p>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={() => handleThemeChange('light')}
            className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
              theme === 'light'
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-500 text-amber-800 dark:text-amber-300 shadow-sm font-black'
                : 'bg-slate-50/80 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-amber-200 font-bold'
            }`}
          >
            <Sun className={`w-5 h-5 ${theme === 'light' ? 'text-amber-500' : 'text-slate-400'}`} />
            <span className="text-xs">Tema Terang</span>
          </button>

          <button
            type="button"
            onClick={() => handleThemeChange('dark')}
            className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
              theme === 'dark'
                ? 'bg-indigo-900/40 border-indigo-500 text-indigo-300 shadow-sm font-black ring-1 ring-indigo-500/50'
                : 'bg-slate-50/80 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-300 font-bold'
            }`}
          >
            <Moon className={`w-5 h-5 ${theme === 'dark' ? 'text-indigo-400' : 'text-slate-400'}`} />
            <span className="text-xs">Tema Gelap</span>
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="glass-panel p-5 space-y-3.5 border-rose-300/80 dark:border-rose-900/80 bg-rose-50/80 dark:bg-rose-950/40 shadow-sm">
        <div className="flex items-center gap-2 font-extrabold text-sm text-rose-700 dark:text-rose-400">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-500" />
          <span>Zona Bahaya</span>
        </div>
        <p className="text-xs font-semibold text-rose-800 dark:text-rose-300 leading-relaxed">
          Menghapus data akan mengosongkan seluruh riwayat obrolan dan pencatatan transaksi di perangkat ini secara permanen.
        </p>
        <button
          onClick={handleClearData}
          className="w-full py-3 rounded-xl bg-white dark:bg-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-300 dark:border-rose-700 text-rose-600 dark:text-rose-400 font-extrabold text-xs transition-all shadow-xs cursor-pointer"
        >
          Hapus Semua Data Lokal (Reset)
        </button>
      </div>

      <AlertModal
        isOpen={modalConfig.isOpen}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        onConfirm={modalConfig.onConfirm}
        onClose={closeModal}
      />
    </div>
  );
}
