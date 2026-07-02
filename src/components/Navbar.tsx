'use client';

import React, { useState, useEffect } from 'react';
import { CloudCheck, User, Sparkles } from 'lucide-react';
import { getStoredSession, autoSyncIfOnline, UserSession } from '@/lib/supabase';
import { aiClassifier, AIStatus } from '@/lib/aiClassifier';

interface NavbarProps {
  onOpenSettings: () => void;
}

export default function Navbar({ onOpenSettings }: NavbarProps) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [session, setSession] = useState<UserSession>({ email: '', isLoggedIn: false, syncedCount: 0 });
  const [aiStatus, setAiStatus] = useState<AIStatus>('uninitialized');
  const [aiProgress, setAiProgress] = useState<number>(0);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = async () => {
      setIsOnline(true);
      await autoSyncIfOnline();
      setSession(getStoredSession());
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    setSession(getStoredSession());
    if (navigator.onLine) {
      autoSyncIfOnline().then(() => setSession(getStoredSession()));
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    const interval = setInterval(() => {
      setSession(getStoredSession());
    }, 2000);

    // Initialize & subscribe to On-Device WebAI
    const unsubscribe = aiClassifier.subscribe((status, prog) => {
      setAiStatus(status);
      setAiProgress(prog);
    });
    aiClassifier.init();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  return (
    <header className="px-5 py-3.5 bg-white/90 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between z-20 shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl overflow-hidden shadow-md shadow-indigo-500/15 shrink-0 border border-slate-200/80 ring-2 ring-indigo-50 transition-transform hover:scale-105 duration-200">
          <img src="/icon-512.png" alt="SakuChat Logo" className="w-full h-full object-cover" />
        </div>
        <div>
          <h1 className="font-extrabold text-lg leading-tight tracking-tight text-slate-800">
            SakuChat
          </h1>
          <p className="text-xs text-slate-500 font-semibold">Asisten Keuangan Pintar</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* On-Device WebAI Status Badge */}
        {aiStatus === 'loading' && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-indigo-50 text-indigo-600 border border-indigo-200 shadow-xs"
            title="Mengunduh/Memuat Model AI Mini (~23 MB) ke Cache Browser"
          >
            <Sparkles className="w-3 h-3 animate-spin text-indigo-600" />
            <span>AI ({aiProgress}%)</span>
          </div>
        )}
        {aiStatus === 'ready' && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-violet-50 text-violet-600 border border-violet-200 shadow-xs"
            title="On-Device WebAI Siap (100% Offline & Privat)"
          >
            <Sparkles className="w-3 h-3 text-violet-500" />
            <span>AI Ready</span>
          </div>
        )}

        {/* Connection status badge */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all shadow-sm ${
            isOnline
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/80'
              : 'bg-rose-50 text-rose-600 border border-rose-200/80'
          }`}
          title={isOnline ? 'Online - Siap sinkronisasi cloud' : 'Offline - Data aman tersimpan lokal'}
        >
          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
          <span>{isOnline ? 'Online' : 'Offline'}</span>
        </div>

        {/* User / Sync Profile Button */}
        <button
          onClick={onOpenSettings}
          className="p-2.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/60 transition-all text-indigo-600 shadow-sm flex items-center gap-1.5"
          title={session.isLoggedIn ? `Logged in as ${session.email}` : 'Login untuk Sinkronisasi Cloud'}
        >
          {session.isLoggedIn ? (
            <CloudCheck className="w-4 h-4 text-indigo-600" />
          ) : (
            <User className="w-4 h-4 text-indigo-600" />
          )}
        </button>
      </div>
    </header>
  );
}
