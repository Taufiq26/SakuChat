'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import BottomNav, { TabType } from '@/components/BottomNav';
import ChatView from '@/components/ChatView';
import ReportsView from '@/components/ReportsView';
import SettingsView from '@/components/SettingsView';
import { getStoredTransactions, getAnomalyAlerts } from '@/lib/storage';
import { supabase, getStoredSession, saveSession, autoMergeLocalTransactions, autoSyncIfOnline } from '@/lib/supabase';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [alertsCount, setAlertsCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function checkUrlSession() {
      if (typeof window !== 'undefined' && window.location.hash.includes('access_token=')) {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken) {
          try {
            if (supabase && refreshToken) {
              await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
              });
            }

            const payloadPart = accessToken.split('.')[1];
            if (payloadPart) {
              const base64Url = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
              const decodedPayload = JSON.parse(atob(base64Url));
              const email = decodedPayload.email;

              if (email) {
                const txs = getStoredTransactions();
                const { mergedTransactions } = await autoMergeLocalTransactions(txs, email);
                localStorage.setItem('sakuchat_transactions_v1', JSON.stringify(mergedTransactions));
                saveSession({
                  email: email,
                  isLoggedIn: true,
                  syncedCount: mergedTransactions.length
                });
                setRefreshKey((prev) => prev + 1);
                window.history.replaceState({}, document.title, window.location.pathname);
                setActiveTab('settings');
                return;
              }
            }
          } catch (err) {
            console.error('Error extracting OAuth token:', err);
          }
        }
      }

      if (supabase) {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, sbSession) => {
          const currentSess = getStoredSession();
          if (event === 'INITIAL_SESSION' && !currentSess.isLoggedIn) {
            if (sbSession) {
              await supabase?.auth.signOut().catch(() => {});
            }
            return;
          }

          if (sbSession && sbSession.user && sbSession.user.email) {
            const email = sbSession.user.email;
            if ((event === 'SIGNED_IN' || currentSess.isLoggedIn) && (!currentSess.isLoggedIn || currentSess.email !== email)) {
              const txs = getStoredTransactions();
              const { mergedTransactions } = await autoMergeLocalTransactions(txs, email);
              if (typeof window !== 'undefined') {
                localStorage.setItem('sakuchat_transactions_v1', JSON.stringify(mergedTransactions));
              }
              saveSession({
                email: email,
                isLoggedIn: true,
                syncedCount: mergedTransactions.length
              });
              setRefreshKey((prev) => prev + 1);
            }
          }
        });
        return () => subscription.unsubscribe();
      }
    }

    checkUrlSession();
  }, []);

  useEffect(() => {
    const txs = getStoredTransactions();
    const alerts = getAnomalyAlerts(txs);
    const highMed = alerts.filter((a) => a.severity === 'high' || a.severity === 'medium');
    setAlertsCount(highMed.length);
  }, [refreshKey, activeTab]);

  const handleUpdate = () => {
    setRefreshKey((prev) => prev + 1);
    autoSyncIfOnline();
  };

  return (
    <div className="app-container">
      <Navbar onOpenSettings={() => setActiveTab('settings')} />

      <main className="flex-1 flex flex-col overflow-hidden relative">
        {activeTab === 'chat' && <ChatView onTransactionUpdated={handleUpdate} />}
        {activeTab === 'reports' && <ReportsView key={refreshKey} />}
        {activeTab === 'settings' && <SettingsView key={refreshKey} onDataReset={handleUpdate} />}
      </main>

      <BottomNav activeTab={activeTab} onSelectTab={setActiveTab} unreadAlertsCount={alertsCount} />
    </div>
  );
}
