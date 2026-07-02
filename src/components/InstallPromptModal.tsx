'use client';

import React, { useState, useEffect } from 'react';
import { Download, Share2, PlusSquare, X, CheckCircle2, Zap, WifiOff, Shield } from 'lucide-react';

export default function InstallPromptModal() {
  const [showModal, setShowModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    if (isStandalone) return;

    // Check if user previously dismissed
    const dismissed = localStorage.getItem('sakuchat_install_prompt_dismissed_v1');
    if (dismissed === 'true') return;

    // Detect iOS
    const iosDetected = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iosDetected);

    // Capture browser beforeinstallprompt event (Android / Chrome Desktop)
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show prompt after 1.5 seconds so user has time to load the page
      setTimeout(() => {
        setShowModal(true);
      }, 1500);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If iOS Safari, trigger prompt after 2.5 seconds
    if (iosDetected) {
      const timer = setTimeout(() => {
        setShowModal(true);
      }, 2500);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowModal(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowModal(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sakuchat_install_prompt_dismissed_v1', 'true');
    }
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0f172a] border border-[#334155] rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-slide-up text-white overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          title="Tutup"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0">
            <Download className="w-6 h-6 text-white animate-bounce" />
          </div>
          <div>
            <h3 className="font-bold text-lg leading-tight text-white">Pasang Aplikasi SakuChat</h3>
            <p className="text-xs text-slate-400 mt-0.5">Akses langsung & cepat dari layar utama HP</p>
          </div>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed mb-4">
          Nikmati kemudahan mencatat keuangan pribadi dengan performa instan layaknya aplikasi native tanpa perlu membuka browser berulang kali!
        </p>

        <div className="space-y-2.5 mb-6 bg-[#1e293b]/60 border border-slate-700/50 rounded-xl p-3.5">
          <div className="flex items-center gap-2.5 text-xs text-slate-200">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <span>1-Klik buka langsung dari Home Screen</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-slate-200">
            <WifiOff className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Berfungsi 100% tanpa internet (Offline-First)</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-slate-200">
            <Shield className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>Hemat kuota, baterai & ruang penyimpanan</span>
          </div>
        </div>

        {isIOS || !deferredPrompt ? (
          <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-3.5 mb-5 text-xs text-indigo-200 space-y-2">
            <div className="font-semibold text-indigo-300 flex items-center gap-1.5">
              <span>📱 Cara Pasang di iPhone / iPad:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
              <li className="leading-relaxed">
                Tekan ikon <Share2 className="w-3.5 h-3.5 inline text-blue-400 mx-0.5" /> <strong className="text-white">Share (Bagikan)</strong> di menu bawah Safari Anda.
              </li>
              <li className="leading-relaxed">
                Gulir ke bawah & pilih <PlusSquare className="w-3.5 h-3.5 inline text-white mx-0.5" /> <strong className="text-white">Add to Home Screen (Tambahkan ke Layar Utama)</strong>.
              </li>
            </ol>
          </div>
        ) : null}

        <div className="flex items-center gap-3">
          <button
            onClick={handleDismiss}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition-colors"
          >
            Nanti Saja
          </button>
          {deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              Pasang Sekarang
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
