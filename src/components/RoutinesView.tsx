'use client';

import React, { useState, useEffect } from 'react';
import { BellRing, CalendarClock, AlertTriangle, CheckCircle2, Clock, Sparkles, PlusCircle, ShieldAlert, Zap } from 'lucide-react';
import { RoutineReminder, Transaction } from '@/types';
import { getStoredTransactions, saveTransaction } from '@/lib/storage';
import { detectSmartRoutines, dismissRoutine } from '@/lib/routineEngine';

interface RoutinesViewProps {
  onTransactionUpdated: () => void;
}

export default function RoutinesView({ onTransactionUpdated }: RoutinesViewProps) {
  const [reminders, setReminders] = useState<RoutineReminder[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const loadReminders = () => {
    const txs = getStoredTransactions();
    const detected = detectSmartRoutines(txs);
    setReminders(detected);
  };

  useEffect(() => {
    loadReminders();
  }, []);

  const handleRecord1Click = (reminder: RoutineReminder) => {
    const newTx: Transaction = {
      id: `tx-routine-${Date.now()}`,
      rawText: reminder.title,
      amount: reminder.suggestedAmount,
      category: reminder.category,
      date: new Date().toISOString(),
      isSynced: false
    };

    saveTransaction(newTx);
    onTransactionUpdated();
    loadReminders();

    setToastMsg(`✅ Rutinitas "${reminder.title}" (Rp ${reminder.suggestedAmount.toLocaleString('id-ID')}) berhasil dicatat hari ini!`);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleDismiss = (reminder: RoutineReminder) => {
    dismissRoutine(reminder.id, 7);
    onTransactionUpdated();
    loadReminders();

    setToastMsg(`🔕 Peringatan "${reminder.title}" telah disenyapkan selama 7 hari ke depan.`);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const periodicReminders = reminders.filter((r) => r.type === 'periodic');
  const anomalyReminders = reminders.filter((r) => r.type === 'anomaly');

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/70 p-4 sm:p-6 pb-28">
      {/* Toast Banner */}
      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-700 backdrop-blur-md flex items-center gap-2.5 text-xs sm:text-sm font-semibold animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-violet-900 text-white rounded-3xl p-5 sm:p-6 mb-6 shadow-lg relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col">
          <div className="flex items-center justify-between gap-3 mb-3.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-indigo-200 text-[11px] font-extrabold backdrop-blur-sm border border-white/15">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin shrink-0" />
              <span>Asisten Finansial AI</span>
            </div>
            <div className="bg-white/15 p-2.5 rounded-2xl backdrop-blur-sm border border-white/15 shrink-0 flex items-center justify-center">
              <BellRing className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-snug">
            Rutinitas & Pengingat Pintar
          </h1>
          <p className="text-xs sm:text-sm text-indigo-200/95 mt-1.5 leading-relaxed">
            AI memantau kebiasaan hidupmu agar kamu tidak lupa tugas berkala (servis, tagihan, sedekah) serta memberi peringatan dini terhadap pengeluaran berlebihan.
          </p>
        </div>
      </div>

      {/* Anomaly Alerts Section */}
      {anomalyReminders.length > 0 && (
        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 px-1">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
              <h2 className="text-sm sm:text-base font-extrabold text-slate-800 tracking-tight truncate">
                Lonjakan & Anomali
              </h2>
            </div>
            <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shrink-0 whitespace-nowrap shadow-2xs">
              {anomalyReminders.length} Terdeteksi
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3.5">
            {anomalyReminders.map((alert) => (
              <div
                key={alert.id}
                className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 sm:p-5 shadow-xs transition-all hover:shadow-md relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-2 h-full bg-amber-500" />
                <div className="flex flex-col gap-3">
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl shrink-0 mt-0.5">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-black text-slate-900 tracking-tight">
                          {alert.title}
                        </h3>
                        <span className="bg-amber-200/60 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-md">
                          {alert.frequencyLabel}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed font-medium">
                        {alert.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-2.5 border-t border-amber-200/50">
                    <button
                      onClick={() => handleDismiss(alert)}
                      className="px-4 py-2 rounded-xl bg-white hover:bg-amber-100/60 text-slate-700 text-xs font-bold border border-amber-300 shadow-2xs transition-all active:scale-95"
                    >
                      Mengerti / Abaikan
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Periodic Routines Section */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 px-1">
          <div className="flex items-center gap-2 min-w-0">
            <CalendarClock className="w-5 h-5 text-indigo-600 shrink-0" />
            <h2 className="text-sm sm:text-base font-extrabold text-slate-800 tracking-tight truncate">
              Rutinitas Berkala
            </h2>
          </div>
          {periodicReminders.length > 0 && (
            <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-2xs shrink-0 whitespace-nowrap">
              {periodicReminders.length} Jatuh Tempo
            </span>
          )}
        </div>

        {periodicReminders.length === 0 && anomalyReminders.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-200 shadow-xs mt-2">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
              Semua Rutinitas Terkendali!
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
              Belum ada rutinitas yang jatuh tempo hari ini ataupun anomali lonjakan pengeluaran boros yang terdeteksi AI.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span>AI terus memindai riwayat pengeluaranmu secara otomatis</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
            {periodicReminders.map((routine) => (
              <div
                key={routine.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs transition-all hover:shadow-md hover:border-indigo-200 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-600" />
                <div className="flex flex-col gap-3.5">
                  <div className="flex items-start gap-3.5">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                          {routine.title}
                        </h3>
                        <span className="bg-indigo-50 text-indigo-700 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-indigo-100">
                          {routine.frequencyLabel}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">
                        {routine.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Estimasi Nominal</div>
                      <div className="text-sm sm:text-base font-black text-slate-900">
                        Rp {routine.suggestedAmount.toLocaleString('id-ID')}
                      </div>
                    </div>

                    <button
                      onClick={() => handleRecord1Click(routine)}
                      className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-extrabold shadow-sm transition-all flex items-center gap-1.5 active:scale-95 shrink-0"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Catat Sekarang</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
