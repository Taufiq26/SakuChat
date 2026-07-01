'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { PieChart as PieIcon, AlertTriangle, Sparkles, Trophy, Calendar, BarChart2, TrendingUp, TrendingDown, Lightbulb, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Transaction } from '@/types';
import { getStoredTransactions, getCategoryDistribution, getTopSpending, getAnomalyAlerts } from '@/lib/storage';
import { CATEGORY_COLORS } from '@/lib/parser';

export default function ReportsView() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<'summary' | 'annual'>('summary');
  const [filter, setFilter] = useState<'all' | '7days' | 'month'>('7days');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedCategory, setSelectedCategory] = useState<string>('SEMUA');

  useEffect(() => {
    const txs = getStoredTransactions();
    setTransactions(txs);
    if (txs.length > 0) {
      const latestYear = new Date(txs[0].date).getFullYear();
      if (!isNaN(latestYear)) {
        setSelectedYear(latestYear);
      }
    }
  }, []);

  // Filtered transactions for Summary Tab
  const filteredTransactions = transactions.filter((t) => {
    const txDate = new Date(t.date);
    const now = new Date();
    if (filter === '7days') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
      return txDate >= sevenDaysAgo;
    }
    if (filter === 'month') {
      return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
    }
    return true;
  });

  const totalSpent = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
  const dist = getCategoryDistribution(filteredTransactions);
  const top3 = getTopSpending(filteredTransactions);
  const alerts = getAnomalyAlerts(filteredTransactions);

  const radius = 64;
  const strokeWidth = 15;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

  // Annual Analysis Calculations
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    transactions.forEach((t) => {
      const y = new Date(t.date).getFullYear();
      if (!isNaN(y)) yearsSet.add(y);
    });
    yearsSet.add(new Date().getFullYear());
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [transactions]);

  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    transactions.forEach((t) => {
      if (t.category) cats.add(t.category);
    });
    return ['SEMUA', ...Array.from(cats)];
  }, [transactions]);

  const annualMonthlyData = useMemo(() => {
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const shortNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    const monthly = monthNames.map((name, idx) => ({
      name,
      shortName: shortNames[idx],
      monthIndex: idx,
      amount: 0,
      count: 0
    }));

    transactions.forEach((t) => {
      const d = new Date(t.date);
      if (d.getFullYear() === selectedYear) {
        if (selectedCategory === 'SEMUA' || t.category === selectedCategory) {
          const m = d.getMonth();
          if (m >= 0 && m < 12) {
            monthly[m].amount += t.amount;
            monthly[m].count += 1;
          }
        }
      }
    });

    return monthly;
  }, [transactions, selectedYear, selectedCategory]);

  const annualInsights = useMemo(() => {
    const yearlyTotal = annualMonthlyData.reduce((sum, m) => sum + m.amount, 0);
    const yearlyCount = annualMonthlyData.reduce((sum, m) => sum + m.count, 0);
    const activeMonths = annualMonthlyData.filter((m) => m.amount > 0);
    const activeCount = activeMonths.length;
    const avgMonthly = activeCount > 0 ? yearlyTotal / 12 : 0;

    let highestMonth = annualMonthlyData[0];
    let lowestActiveMonth = activeMonths[0] || annualMonthlyData[0];

    annualMonthlyData.forEach((m) => {
      if (m.amount > highestMonth.amount) highestMonth = m;
    });
    activeMonths.forEach((m) => {
      if (m.amount < lowestActiveMonth.amount) lowestActiveMonth = m;
    });

    let maxSpikePercent = 0;
    let maxSpikeMonth = null;

    for (let i = 1; i < 12; i++) {
      const prev = annualMonthlyData[i - 1].amount;
      const curr = annualMonthlyData[i].amount;
      if (prev > 0 && curr > prev) {
        const diffPercent = Math.round(((curr - prev) / prev) * 100);
        if (diffPercent > maxSpikePercent) {
          maxSpikePercent = diffPercent;
          maxSpikeMonth = annualMonthlyData[i];
        }
      }
    }

    const maxMonthlyAmount = Math.max(...annualMonthlyData.map((m) => m.amount), 1);

    return {
      yearlyTotal,
      yearlyCount,
      avgMonthly,
      highestMonth,
      lowestActiveMonth,
      maxSpikePercent,
      maxSpikeMonth,
      maxMonthlyAmount,
      activeMonthsCount: activeCount
    };
  }, [annualMonthlyData]);

  const formatAbbrev = (val: number) => {
    if (val === 0) return '-';
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}Jt`;
    if (val >= 1000) return `${(val / 1000).toFixed(0)}Rb`;
    return val.toString();
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-5">
      {/* Mode Switcher Tabs */}
      <div className="flex p-1.5 rounded-2xl bg-slate-200/80 border border-slate-300/60 gap-1.5 shadow-inner">
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${activeTab === 'summary'
              ? 'bg-white text-indigo-600 shadow-md border border-slate-200'
              : 'text-slate-600 hover:text-slate-900 font-bold'
            }`}
        >
          <PieIcon className="w-4 h-4" /> Ringkasan & Anomali
        </button>
        <button
          onClick={() => setActiveTab('annual')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${activeTab === 'annual'
              ? 'bg-white text-indigo-600 shadow-md border border-slate-200'
              : 'text-slate-600 hover:text-slate-900 font-bold'
            }`}
        >
          <BarChart2 className="w-4 h-4" /> Analisa & Tren Bulanan (Setahun)
        </button>
      </div>

      {activeTab === 'summary' ? (
        <>
          {/* Time Filter Tabs */}
          <div className="flex p-1 rounded-full bg-slate-100/90 border border-slate-200/80 gap-1 shadow-inner">
            {[
              { id: '7days', label: '7 Hari Terakhir' },
              { id: 'month', label: 'Bulan Ini' },
              { id: 'all', label: 'Semua Waktu' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setFilter(item.id as 'all' | '7days' | 'month')}
                className={`flex-1 py-2 rounded-full text-xs font-extrabold transition-all ${filter === item.id
                    ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                    : 'text-slate-500 hover:text-slate-800 font-bold'
                  }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Total Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-700 border border-indigo-500/30 relative overflow-hidden shadow-lg">
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
            <span className="text-xs font-extrabold text-indigo-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-200" /> Total Pengeluaran ({filteredTransactions.length} Transaksi)
            </span>
            <div className="text-3xl font-black mt-2 text-white tracking-tight">
              Rp {totalSpent.toLocaleString('id-ID')}
            </div>
          </div>

          {/* Sleek Ring Dashboard */}
          <div className="glass-panel p-5 space-y-5">
            <div className="flex items-center gap-2 font-extrabold text-sm text-slate-800">
              <PieIcon className="w-4 h-4 text-indigo-500" />
              <span>Distribusi Pengeluaran (Sleek Ring Chart)</span>
            </div>

            {dist.length === 0 ? (
              <p className="text-xs font-semibold text-slate-400 italic py-6 text-center">Belum ada transaksi untuk rentang waktu ini.</p>
            ) : (
              <div className="flex flex-col items-center gap-6 py-3">
                <div className="relative w-48 h-48 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 160 160">
                    <circle
                      cx="80"
                      cy="80"
                      r={radius}
                      fill="transparent"
                      stroke="rgba(226,232,240,0.8)"
                      strokeWidth={strokeWidth}
                    />
                    {dist.map((cat) => {
                      const strokeLength = (cat.percentage / 100) * circumference;
                      const dashArray = `${strokeLength} ${circumference - strokeLength}`;
                      const dashOffset = circumference - accumulatedOffset;
                      accumulatedOffset += strokeLength;
                      const catColor = CATEGORY_COLORS[cat.category] || cat.color || '#818CF8';

                      return (
                        <circle
                          key={cat.category}
                          cx="80"
                          cy="80"
                          r={radius}
                          fill="transparent"
                          stroke={catColor}
                          strokeWidth={strokeWidth}
                          strokeDasharray={dashArray}
                          strokeDashoffset={dashOffset}
                          strokeLinecap="round"
                          className="transition-all duration-700 ease-out hover:opacity-85"
                        />
                      );
                    })}
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center px-2 max-w-[140px]">
                    <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 truncate">Total</span>
                    <span className="text-xs sm:text-sm font-black text-slate-800 truncate w-full">
                      Rp {totalSpent > 999999 ? `${(totalSpent / 1000000).toFixed(1)}Jt` : totalSpent > 999 ? `${(totalSpent / 1000).toFixed(0)}Rb` : totalSpent}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 mt-0.5 truncate w-full">
                      Rp {totalSpent.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                <div className="w-full space-y-3.5 pt-1">
                  {dist.map((cat) => {
                    const catColor = CATEGORY_COLORS[cat.category] || cat.color || '#818CF8';
                    return (
                      <div key={cat.category} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-3 text-xs font-extrabold">
                          <span className="flex items-center gap-2 text-slate-700 min-w-0">
                            <span className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: catColor }} />
                            <span className="break-words">{cat.category}</span>
                          </span>
                          <span className="text-slate-800 font-black shrink-0 whitespace-nowrap">
                            Rp {cat.amount.toLocaleString('id-ID')} ({cat.percentage}%)
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/80">
                          <div
                            className="h-full rounded-full transition-all duration-500 shadow-sm"
                            style={{
                              width: `${cat.percentage}%`,
                              backgroundColor: catColor
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}

                  {/* Total Keseluruhan Detail */}
                  <div className="pt-3 mt-3 border-t-2 border-slate-200/80 flex items-center justify-between text-xs font-black text-slate-800 bg-slate-50/80 p-3 rounded-xl shadow-xs">
                    <span className="flex items-center gap-2 text-indigo-700 min-w-0">
                      <span className="w-3 h-3 rounded-full bg-indigo-600 shrink-0 shadow-sm" />
                      <span className="uppercase tracking-wider font-extrabold truncate">Total Keseluruhan Detail</span>
                    </span>
                    <span className="text-xs sm:text-sm font-black text-indigo-600 shrink-0 whitespace-nowrap">
                      Rp {totalSpent.toLocaleString('id-ID')} (100%)
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actionable Insights & Anomali */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 font-extrabold text-sm text-slate-800">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Actionable Insights & Anomali</span>
            </div>

            {alerts.length === 0 ? (
              <div className="glass-panel p-5 text-center text-xs font-bold text-slate-600 bg-emerald-50/60 border-emerald-200/80">
                ✅ Semua pengeluaran dalam batas wajar. Tidak ditemukan lonjakan pengeluaran.
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`glass-panel p-5 sm:p-6 border-l-4 transition-all shadow-md ${alert.severity === 'high'
                      ? 'border-l-rose-500 border-rose-200/80 bg-rose-50/80'
                      : alert.severity === 'medium'
                        ? 'border-l-amber-500 border-amber-200/80 bg-amber-50/80'
                        : 'border-l-emerald-500 border-emerald-200/80 bg-emerald-50/80'
                    }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className={`p-3 rounded-2xl shrink-0 shadow-xs ${alert.severity === 'high'
                        ? 'bg-rose-100 text-rose-600'
                        : alert.severity === 'medium'
                          ? 'bg-amber-100 text-amber-600'
                          : 'bg-emerald-100 text-emerald-600'
                      }`}>
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-base text-slate-800 leading-snug">{alert.title}</h4>
                      <p className="text-xs font-semibold text-slate-600 mt-1.5 leading-relaxed">{alert.description}</p>
                      <div className="mt-3.5 p-3.5 rounded-2xl bg-white/90 border border-slate-200/80 text-xs font-bold text-slate-700 leading-normal flex items-start gap-2 shadow-inner">
                        <span className="text-base leading-none">💡</span>
                        <span>{alert.recommendation}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Top 3 Spending Categories */}
          <div className="glass-panel p-5 space-y-4">
            <div className="flex items-center gap-2 font-extrabold text-sm text-slate-800">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>3 Kategori Pengeluaran Terbesar (Top Spending)</span>
            </div>

            {top3.length === 0 ? (
              <p className="text-xs font-semibold text-slate-400 italic py-2">Belum ada data transaksi.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {top3.map((cat, idx) => {
                  const catColor = CATEGORY_COLORS[cat.category] || '#818CF8';
                  return (
                    <div
                      key={cat.category}
                      className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 flex items-center justify-between transition-all hover:border-indigo-300 shadow-xs"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <span
                          className="w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center text-white shadow-sm shrink-0"
                          style={{ backgroundColor: catColor }}
                        >
                          #{idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="font-black text-sm text-slate-800 break-words">{cat.category}</div>
                          <div className="text-xs font-bold text-slate-500 mt-0.5">{cat.percentage}% dari total pengeluaran</div>
                        </div>
                      </div>
                      <div className="font-black text-sm text-emerald-600 shrink-0">
                        Rp {cat.amount.toLocaleString('id-ID')}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Annual Analysis & Monthly Comparison Tab */
        <div className="space-y-5">
          {/* Year & Category Selector Controls */}
          <div className="glass-panel p-4 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-extrabold text-sm text-slate-800">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>Pilih Tahun Analisa</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {availableYears.map((yr) => (
                  <button
                    key={yr}
                    onClick={() => setSelectedYear(yr)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${selectedYear === yr
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-200/80 pt-3">
              <div className="text-xs font-extrabold text-slate-700 mb-2">Pilih Kategori Pengeluaran:</div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {availableCategories.map((cat) => {
                  const catColor = cat === 'SEMUA' ? '#6366F1' : (CATEGORY_COLORS[cat] || '#818CF8');
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${selectedCategory === cat
                          ? 'bg-slate-800 text-white shadow-md'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: catColor }} />
                      <span>{cat === 'SEMUA' ? 'Semua Kategori' : cat}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Annual Summary Stats Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-700 border border-indigo-500/30 relative overflow-hidden shadow-lg text-white">
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
              <div>
                <span className="text-xs font-extrabold text-indigo-100 uppercase tracking-wider">
                  Total {selectedCategory === 'SEMUA' ? 'Semua Kategori' : selectedCategory} ({selectedYear})
                </span>
                <div className="text-3xl font-black mt-1 tracking-tight">
                  Rp {annualInsights.yearlyTotal.toLocaleString('id-ID')}
                </div>
              </div>
              <div className="flex items-center gap-4 bg-white/10 px-4 py-3 rounded-2xl backdrop-blur-md border border-white/15">
                <div>
                  <div className="text-[10px] uppercase font-bold text-indigo-200">Rata-Rata / Bulan</div>
                  <div className="text-sm font-black mt-0.5">Rp {Math.round(annualInsights.avgMonthly).toLocaleString('id-ID')}</div>
                </div>
                <div className="h-8 w-px bg-white/20" />
                <div>
                  <div className="text-[10px] uppercase font-bold text-indigo-200">Frekuensi Transaksi</div>
                  <div className="text-sm font-black mt-0.5">{annualInsights.yearlyCount} Transaksi</div>
                </div>
              </div>
            </div>
          </div>

          {/* 12-Month Bar Chart */}
          <div className="glass-panel p-5 space-y-4">
            <div className="flex items-center justify-between gap-2 font-extrabold text-sm text-slate-800">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-indigo-600" />
                <span>Tren 12 Bulan ({selectedYear})</span>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 shrink-0">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Tertinggi</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Terendah</span>
              </div>
            </div>

            <div className="w-full overflow-x-auto pb-3 pt-4">
              <div className="grid grid-cols-12 gap-2.5 min-w-[500px] items-end h-52 border-b border-slate-200 pb-2 px-1">
                {annualMonthlyData.map((m) => {
                  const isHighest = m.amount > 0 && m.amount === annualInsights.highestMonth.amount;
                  const isLowest = m.amount > 0 && m.amount === annualInsights.lowestActiveMonth.amount && annualInsights.activeMonthsCount > 1;
                  const barHeightPercent = annualInsights.maxMonthlyAmount > 0
                    ? Math.max(Math.round((m.amount / annualInsights.maxMonthlyAmount) * 100), m.amount > 0 ? 8 : 4)
                    : 4;

                  let barBg = 'bg-slate-200/80';
                  if (m.amount > 0) {
                    if (isHighest) barBg = 'bg-gradient-to-t from-rose-600 to-amber-500 shadow-sm';
                    else if (isLowest) barBg = 'bg-gradient-to-t from-emerald-600 to-teal-400 shadow-sm';
                    else barBg = 'bg-gradient-to-t from-indigo-600 to-blue-500 shadow-xs';
                  }

                  return (
                    <div key={m.monthIndex} className="flex flex-col items-center gap-1.5 h-full justify-end group">
                      <span className="text-[9px] font-extrabold text-slate-600 opacity-80 group-hover:opacity-100 transition-all truncate max-w-full">
                        {formatAbbrev(m.amount)}
                      </span>
                      <div className="w-full bg-slate-100 rounded-t-lg h-36 flex items-end justify-center p-0.5 overflow-hidden">
                        <div
                          className={`w-full rounded-t-md transition-all duration-500 ${barBg}`}
                          style={{ height: `${barHeightPercent}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-black text-slate-700 uppercase shrink-0">{m.shortName}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Automated AI Insights & Conclusion Card */}
          <div className="glass-panel p-5 sm:p-6 bg-gradient-to-br from-amber-50/90 via-orange-50/60 to-white border-amber-200/80 space-y-4 shadow-md">
            <div className="flex items-center gap-2.5 font-black text-base text-slate-800">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-600 shrink-0">
                <Lightbulb className="w-5 h-5" />
              </div>
              <span>Insight & Kesimpulan Otomatis ({selectedYear})</span>
            </div>

            {annualInsights.yearlyTotal === 0 ? (
              <p className="text-xs font-semibold text-slate-500 italic leading-relaxed py-2">
                Belum ada pengeluaran tercatat pada kategori ini untuk tahun {selectedYear}.
              </p>
            ) : (
              <div className="space-y-3 pt-1">
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/80 border border-amber-100 text-xs font-semibold text-slate-700 shadow-xs">
                  <span className="text-rose-500 font-black text-base shrink-0 mt-0.5">📌</span>
                  <div className="leading-relaxed">
                    <strong className="font-extrabold text-slate-900">Puncak Pengeluaran:</strong> Bulan <strong>{annualInsights.highestMonth.name}</strong> menjadi bulan pengeluaran terbesar dengan total <strong>Rp {annualInsights.highestMonth.amount.toLocaleString('id-ID')}</strong> ({((annualInsights.highestMonth.amount / annualInsights.yearlyTotal) * 100).toFixed(1)}% dari total pengeluaran setahun).
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/80 border border-amber-100 text-xs font-semibold text-slate-700 shadow-xs">
                  <span className="text-emerald-500 font-black text-base shrink-0 mt-0.5">📉</span>
                  <div className="leading-relaxed">
                    <strong className="font-extrabold text-slate-900">Bulan Paling Hemat:</strong> Pengeluaran terendah terjadi pada <strong>{annualInsights.lowestActiveMonth.name}</strong> sebesar <strong>Rp {annualInsights.lowestActiveMonth.amount.toLocaleString('id-ID')}</strong>. Terdapat selisih <strong>Rp {(annualInsights.highestMonth.amount - annualInsights.lowestActiveMonth.amount).toLocaleString('id-ID')}</strong> antara puncak tertinggi dan terendah.
                  </div>
                </div>

                {annualInsights.maxSpikeMonth && (
                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/80 border border-amber-100 text-xs font-semibold text-slate-700 shadow-xs">
                    <span className="text-amber-500 font-black text-base shrink-0 mt-0.5">⚡</span>
                    <div className="leading-relaxed">
                      <strong className="font-extrabold text-slate-900">Lonjakan Tercepat:</strong> Terjadi lonjakan paling tajam pada bulan <strong>{annualInsights.maxSpikeMonth.name}</strong> dengan kenaikan drastis <strong>+{annualInsights.maxSpikePercent}%</strong> dibanding bulan sebelumnya.
                    </div>
                  </div>
                )}

                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-blue-600 text-white text-xs font-bold leading-relaxed shadow-sm">
                  💡 <strong>Kesimpulan & Rekomendasi:</strong> Untuk kestabilan arus kas tahun depan, disarankan mengantisipasi lonjakan kebutuhan di sekitar bulan <strong>{annualInsights.highestMonth.name}</strong>. Targetkan batas pengeluaran bulanan agar tidak jauh melampaui batas rata-rata <strong>Rp {Math.round(annualInsights.avgMonthly).toLocaleString('id-ID')} / bulan</strong>.
                </div>
              </div>
            )}
          </div>

          {/* Month-by-Month Detailed Breakdown List */}
          <div className="glass-panel p-5 space-y-3.5">
            <div className="font-extrabold text-sm text-slate-800">
              Rincian Perbandingan 12 Bulan ({selectedCategory === 'SEMUA' ? 'Semua Kategori' : selectedCategory})
            </div>

            <div className="space-y-2 pt-1">
              {annualMonthlyData.map((m, idx) => {
                const prevAmount = idx > 0 ? annualMonthlyData[idx - 1].amount : 0;
                let changeEl = <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500">Awal Tahun</span>;

                if (idx > 0) {
                  if (prevAmount === 0 && m.amount > 0) {
                    changeEl = <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-amber-100 text-amber-700 flex items-center gap-0.5"><TrendingUp className="w-3 h-3" /> Baru</span>;
                  } else if (m.amount > prevAmount && prevAmount > 0) {
                    const diff = Math.round(((m.amount - prevAmount) / prevAmount) * 100);
                    changeEl = <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-rose-100 text-rose-600 flex items-center gap-0.5"><ArrowUpRight className="w-3.5 h-3.5" /> +{diff}%</span>;
                  } else if (m.amount < prevAmount && prevAmount > 0) {
                    const diff = Math.round(((prevAmount - m.amount) / prevAmount) * 100);
                    changeEl = <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-600 flex items-center gap-0.5"><ArrowDownRight className="w-3.5 h-3.5" /> -{diff}%</span>;
                  } else if (m.amount === prevAmount && m.amount > 0) {
                    changeEl = <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600">Stabil</span>;
                  } else {
                    changeEl = <span className="text-[10px] font-bold text-slate-400">-</span>;
                  }
                }

                return (
                  <div
                    key={m.monthIndex}
                    className="p-3.5 rounded-2xl bg-white/90 border border-slate-200/80 flex items-center justify-between gap-3 shadow-xs hover:border-indigo-200 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 font-black text-xs text-slate-700 flex items-center justify-center shrink-0">
                        {m.shortName}
                      </div>
                      <div className="min-w-0">
                        <div className="font-extrabold text-xs text-slate-800 truncate">{m.name}</div>
                        <div className="text-[11px] font-semibold text-slate-500 mt-0.5">{m.count} transaksi</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {changeEl}
                      <span className="font-black text-xs sm:text-sm text-slate-800 w-24 text-right">
                        Rp {m.amount.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
