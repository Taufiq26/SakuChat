'use client';

import React, { useState, useEffect } from 'react';
import { Cloud, CheckCircle, Database, Shield, RefreshCw, LogIn, LogOut, Download, AlertCircle, MailCheck, KeyRound, ArrowLeft } from 'lucide-react';
import { getStoredTransactions, clearAllLocalData } from '@/lib/storage';
import { getStoredSession, saveSession, logoutSession, autoMergeLocalTransactions, UserSession, supabase } from '@/lib/supabase';

interface SettingsViewProps {
  onDataReset: () => void;
}

export default function SettingsView({ onDataReset }: SettingsViewProps) {
  const [session, setSession] = useState<UserSession>({ email: '', isLoggedIn: false, syncedCount: 0 });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [localCount, setLocalCount] = useState(0);

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

      if (supabase) {
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

    checkSessionAndHash();
  }, []);

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
        alert('Gagal membuka login Google: ' + error.message);
        setIsSyncing(false);
        setSyncStatusMsg(null);
      }
    } else {
      const simulatedEmail = prompt('Masukkan alamat email Google / Gmail Anda untuk login cloud:', 'budi@gmail.com');
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
    if (confirm('Apakah kamu yakin ingin menghapus semua data pengeluaran dan riwayat chat secara permanen di perangkat ini?')) {
      clearAllLocalData();
      setLocalCount(0);
      onDataReset();
    }
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

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-5">
      {/* Cloud Sync & Auto-Merge Card */}
      <div className="glass-panel p-5 space-y-4 bg-gradient-to-br from-indigo-50/90 via-sky-50/60 to-white border-indigo-200/80 shadow-md">
        <div className="flex items-center gap-2.5 font-black text-base text-slate-800">
          <Cloud className="w-5 h-5 text-indigo-500" />
          <span>Sinkronisasi Cloud & Auto-Merge</span>
        </div>

        {session.isLoggedIn ? (
          <div className="space-y-3.5">
            <div className="p-4 rounded-2xl bg-emerald-50/90 border border-emerald-200/80 flex items-center justify-between gap-3 shadow-xs">
              <div className="min-w-0">
                <div className="text-xs text-emerald-700 font-extrabold flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" /> Terhubung ke Cloud Sync
                </div>
                <div className="font-black text-sm text-slate-800 mt-1 truncate">{session.email}</div>
                <div className="text-xs font-semibold text-slate-600 mt-0.5">{session.syncedCount} transaksi tersinkronisasi</div>
              </div>
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-50 shrink-0 shadow-md"
                title="Sinkronkan sekarang"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <button
              onClick={handleLogout}
              className="w-full py-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> Keluar dari Akun Cloud
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs font-semibold text-slate-600 leading-relaxed">
              Masuk dengan 1-Klik menggunakan <span className="font-extrabold text-indigo-600">Akun Google (Gmail)</span> resmi Anda untuk mencadangkan dan menyinkronkan data antar perangkat secara otomatis di latar belakang tanpa duplikasi!
            </p>
            <button
              onClick={handleGoogleSignIn}
              disabled={isSyncing}
              className="w-full py-3.5 px-5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-extrabold text-xs transition-all flex items-center justify-center gap-3 shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer group"
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
          <div className="p-3.5 rounded-xl bg-white/90 border border-slate-200/80 text-xs font-bold text-slate-700 shadow-xs">
            {syncStatusMsg}
          </div>
        )}
      </div>

      {/* Local Storage & Privacy Status */}
      <div className="glass-panel p-5 space-y-4">
        <div className="flex items-center gap-2 font-extrabold text-sm text-slate-800">
          <Shield className="w-4 h-4 text-emerald-500" />
          <span>Privasi & Penyimpanan Lokal</span>
        </div>
        <p className="text-xs font-semibold text-slate-600 leading-relaxed">
          Secara standar, seluruh transaksi dan percakapanmu disimpan 100% secara privat di peramban pengguna melalui penyimpanan lokal (<span className="font-mono text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded text-[11px] font-bold">localStorage</span>). Aplikasi berfungsi penuh tanpa koneksi internet.
        </p>

        <div className="grid grid-cols-2 gap-3.5 pt-1">
          <div className="p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/80 shadow-xs">
            <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-indigo-500" /> Transaksi Lokal
            </div>
            <div className="text-xl font-black text-slate-800 mt-1.5 tracking-tight">{localCount} Item</div>
          </div>
          <button
            onClick={handleExportJSON}
            className="p-3.5 rounded-2xl bg-slate-50/90 hover:bg-indigo-50/80 border border-slate-200/80 hover:border-indigo-300 text-left transition-all flex flex-col justify-between shadow-xs group"
          >
            <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5 text-emerald-500 group-hover:-translate-y-0.5 transition-transform" /> Ekspor Data
            </div>
            <div className="text-xs font-extrabold text-emerald-600 mt-1.5">Unduh Backup JSON</div>
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="glass-panel p-5 space-y-3.5 border-rose-300/80 bg-rose-50/80 shadow-sm">
        <div className="flex items-center gap-2 font-extrabold text-sm text-rose-700">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>Zona Bahaya</span>
        </div>
        <p className="text-xs font-semibold text-rose-800 leading-relaxed">
          Menghapus data akan mengosongkan seluruh riwayat obrolan dan pencatatan transaksi di perangkat ini secara permanen.
        </p>
        <button
          onClick={handleClearData}
          className="w-full py-3 rounded-xl bg-white hover:bg-rose-100 border border-rose-300 text-rose-600 font-extrabold text-xs transition-all shadow-xs"
        >
          Hapus Semua Data Lokal (Reset)
        </button>
      </div>
    </div>
  );
}
