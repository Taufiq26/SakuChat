'use client';

import React from 'react';
import { MessageSquarePlus, PieChart, Settings } from 'lucide-react';

export type TabType = 'chat' | 'reports' | 'settings';

interface BottomNavProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  unreadAlertsCount?: number;
}

export default function BottomNav({ activeTab, onSelectTab, unreadAlertsCount = 0 }: BottomNavProps) {
  const navItems = [
    {
      id: 'chat' as TabType,
      label: 'Catat',
      icon: MessageSquarePlus
    },
    {
      id: 'reports' as TabType,
      label: 'Laporan & Insight',
      icon: PieChart,
      badge: unreadAlertsCount > 0 ? unreadAlertsCount : undefined
    },
    {
      id: 'settings' as TabType,
      label: 'Akun & Sync',
      icon: Settings
    }
  ];

  return (
    <nav className="px-4 py-2.5 bg-white/95 backdrop-blur-md border-t border-slate-200/80 flex items-center justify-around z-20 shrink-0">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelectTab(item.id)}
            className={`flex flex-col items-center justify-center py-2 px-5 rounded-2xl transition-all relative ${
              isActive
                ? 'text-indigo-600 font-bold bg-indigo-50/90 border border-indigo-200/80 shadow-sm scale-105'
                : 'text-slate-400 hover:text-slate-700 font-semibold'
            }`}
          >
            <div className="relative">
              <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : ''}`} />
              {item.badge !== undefined && (
                <span className="absolute -top-1.5 -right-2.5 bg-rose-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full shadow-sm animate-pulse">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[11px] mt-1 tracking-tight">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
