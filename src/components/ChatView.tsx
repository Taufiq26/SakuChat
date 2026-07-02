'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Trash2, Sparkles, Tag, ArrowRight, MessageSquarePlus, Calendar } from 'lucide-react';
import { Transaction, ChatMessage, CategoryName } from '@/types';
import { parseExpenseInput, parseExpenseInputAsync, CATEGORY_COLORS } from '@/lib/parser';
import { getStoredMessages, saveMessage, getStoredTransactions, saveTransaction, deleteTransaction, updateTransactionCategory } from '@/lib/storage';
import { deleteCloudTransaction, updateCloudTransactionCategory } from '@/lib/supabase';

const ALL_CATEGORIES: CategoryName[] = [
  'Makanan & Minuman',
  'Transportasi',
  'Kebutuhan Rumah Tangga',
  'Kebutuhan Pribadi',
  'Tagihan & Utilitas',
  'Sosial & Sedekah',
  'Hiburan & Liburan',
  'Kesehatan',
  'Edukasi & Investasi',
  'Lainnya'
];

interface ChatViewProps {
  onTransactionUpdated: () => void;
}

function formatCleanText(text: string) {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1');
}

export default function ChatView({ onTransactionUpdated }: ChatViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [pendingTextForAmount, setPendingTextForAmount] = useState<{ text: string; category: CategoryName; dateISO?: string; dateLabel?: string } | null>(null);
  const [activeModalTxId, setActiveModalTxId] = useState<string | null>(null);
  const [activeDateModalTxId, setActiveDateModalTxId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    setMessages(getStoredMessages());
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    if (!hasLoadedRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
      hasLoadedRef.current = true;
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, isTyping]);

  const handleSend = async (customText?: string) => {
    const raw = customText || inputText;
    if (!raw.trim()) return;

    if (!customText) setInputText('');

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-u`,
      sender: 'user',
      text: raw,
      timestamp: new Date().toISOString()
    };
    saveMessage(userMsg);
    setMessages((prev) => [...prev, userMsg]);

    setIsTyping(true);
    await new Promise((resolve) => setTimeout(resolve, 300));

    if (pendingTextForAmount) {
      const numMatch = raw.match(/\d+[\.,]?\d*/);
      if (numMatch) {
        let cleanNumStr = numMatch[0].replace(/\./g, '').replace(/,/g, '');
        if (/rb|ribu|k/i.test(raw)) cleanNumStr += '000';
        const parsedAmount = parseInt(cleanNumStr, 10);

        if (!isNaN(parsedAmount) && parsedAmount > 0) {
          const txDate = pendingTextForAmount.dateISO || new Date().toISOString();
          const newTx: Transaction = {
            id: `tx-${Date.now()}`,
            rawText: pendingTextForAmount.text,
            amount: parsedAmount,
            category: pendingTextForAmount.category,
            date: txDate,
            isSynced: false
          };
          saveTransaction(newTx);
          onTransactionUpdated();

          const assistantReply: ChatMessage = {
            id: `msg-${Date.now()}-a`,
            sender: 'assistant',
            text: pendingTextForAmount.dateLabel ? `🗓️ Dicatat untuk tanggal ${pendingTextForAmount.dateLabel}` : ``,
            timestamp: new Date().toISOString(),
            transactionId: newTx.id
          };
          saveMessage(assistantReply);
          setMessages((prev) => [...prev, assistantReply]);
          setPendingTextForAmount(null);
          setIsTyping(false);
          return;
        }
      }

      const errorReply: ChatMessage = {
        id: `msg-${Date.now()}-a`,
        sender: 'assistant',
        text: `Maaf, nominal angka belum terdeteksi. Berapa nominal pengeluaran untuk "${pendingTextForAmount.text}"? (Contoh: 50000 atau 50rb)`,
        timestamp: new Date().toISOString()
      };
      saveMessage(errorReply);
      setMessages((prev) => [...prev, errorReply]);
      setIsTyping(false);
      return;
    }

    const parsed = await parseExpenseInputAsync(raw);

    if (parsed.amount && parsed.amount > 0) {
      const txDate = parsed.dateISO || new Date().toISOString();
      const newTx: Transaction = {
        id: `tx-${Date.now()}`,
        rawText: raw,
        amount: parsed.amount,
        category: parsed.category,
        date: txDate,
        isSynced: false
      };
      saveTransaction(newTx);
      onTransactionUpdated();

      const assistantReply: ChatMessage = {
        id: `msg-${Date.now()}-a`,
        sender: 'assistant',
        text: parsed.dateLabel ? `🗓️ Dicatat untuk tanggal ${parsed.dateLabel}` : ``,
        timestamp: new Date().toISOString(),
        transactionId: newTx.id
      };
      saveMessage(assistantReply);
      setMessages((prev) => [...prev, assistantReply]);
    } else {
      setPendingTextForAmount({ text: raw, category: parsed.category, dateISO: parsed.dateISO, dateLabel: parsed.dateLabel });
      const ec1Reply: ChatMessage = {
        id: `msg-${Date.now()}-a`,
        sender: 'assistant',
        text: `Catatan diterima! Kategori terdeteksi: ${parsed.category}${parsed.dateLabel ? ` (${parsed.dateLabel})` : ''}.\n\nBerapa nominal pengeluaran untuk transaksi ini? (Ketik angkanya saja, contoh: 35rb atau 35000)`,
        timestamp: new Date().toISOString()
      };
      saveMessage(ec1Reply);
      setMessages((prev) => [...prev, ec1Reply]);
    }

    setIsTyping(false);
  };

  const handleDeleteTx = async (txId: string) => {
    deleteTransaction(txId);
    setMessages((prev) =>
      prev.map((m) =>
        m.transactionId === txId
          ? { ...m, text: 'Transaksi ini telah dihapus.', transactionId: undefined }
          : m
      )
    );
    await deleteCloudTransaction(txId);
    onTransactionUpdated();
  };

  const handleCategoryChange = async (txId: string, newCat: CategoryName) => {
    updateTransactionCategory(txId, newCat);
    setMessages((prev) => [...prev]);
    await updateCloudTransactionCategory(txId, newCat);
    onTransactionUpdated();
  };

  const handleDateUpdate = (txId: string, newDateISO: string) => {
    const stored = getStoredTransactions();
    const target = stored.find((t) => t.id === txId);
    if (target) {
      target.date = newDateISO;
      target.isSynced = false;
      saveTransaction(target);
      onTransactionUpdated();
      setMessages((prev) => [...prev]);
    }
  };

  const suggestionChipsList = [
    'Makan siang di warteg 25rb',
    'Belanja bulanan dapur 350rb',
    'Sedekah masjid jumat 50rb',
    'Beli skincare dan sabun 150rb'
  ];

  return (
    <div className="flex-1 flex flex-col justify-between overflow-hidden relative">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Empty State Welcome & Suggestion Chips (FR-3) */}
        {messages.length === 0 && (
          <div className="my-auto py-8 flex flex-col items-center justify-center text-center space-y-5 animate-pop-in">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-sky-400 to-indigo-500 flex items-center justify-center shadow-xl shadow-indigo-500/20">
              <MessageSquarePlus className="w-8 h-8 text-white" />
            </div>
            <div className="space-y-1.5 max-w-xs">
              <h3 className="font-extrabold text-base text-slate-800">Mulai Catat Pengeluaran</h3>
              <p className="text-xs font-medium text-slate-500 leading-relaxed">
                Ketik pengeluaranmu menggunakan bahasa alami layaknya chat biasa. Coba klik salah satu saran di bawah ini:
              </p>
            </div>

            {/* Suggestion Chips ONLY rendered when messages.length === 0 (FR-3) */}
            <div className="flex flex-col gap-2 w-full max-w-xs pt-2">
              {suggestionChipsList.map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleSend(chip)}
                  className="w-full text-left px-4 py-3 rounded-2xl text-xs font-bold bg-white hover:bg-indigo-50/80 border border-slate-200/80 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 transition-all shadow-sm flex items-center justify-between group"
                >
                  <span>{chip}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-indigo-500 group-hover:translate-x-1 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isLast = idx === messages.length - 1;
          const isUser = msg.sender === 'user';
          const storedTxs = getStoredTransactions();
          const tx = msg.transactionId ? storedTxs.find((t) => t.id === msg.transactionId) : null;
          const cleanTextStr = formatCleanText(msg.text);

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} ${isLast ? 'scroll-target' : ''}`}
            >
              <div className={isUser ? 'bubble-user' : 'bubble-assistant'}>
                {cleanTextStr && (
                  <div className="text-sm whitespace-pre-wrap leading-relaxed break-words font-medium">
                    {cleanTextStr}
                  </div>
                )}

                {/* Rich Embedded Transaction Card Only (FR-2) */}
                {tx && (
                  <div className={`${cleanTextStr ? 'mt-3' : ''} p-4 rounded-2xl bg-slate-50/95 border border-slate-200/80 shadow-xs animate-pop-in w-full space-y-3`}>
                    {/* Top Row: Tag Icon + Amount + Delete Button */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-9 h-9 rounded-xl flex shrink-0 items-center justify-center font-bold text-xs text-white shadow-xs"
                          style={{ backgroundColor: CATEGORY_COLORS[tx.category] || '#818CF8' }}
                        >
                          <Tag className="w-4.5 h-4.5" />
                        </div>
                        <div className="font-black text-lg text-emerald-600 tracking-tight">
                          Rp {tx.amount.toLocaleString('id-ID')}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteTx(tx.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all shrink-0 cursor-pointer"
                        title="Hapus transaksi ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Bottom Row: Full Category Badge + Date Badge */}
                    <div className="flex items-center gap-2 flex-wrap pt-0.5">
                      <button
                        onClick={() => setActiveModalTxId(tx.id)}
                        className="flex items-center gap-1.5 bg-white hover:bg-indigo-50/90 text-slate-700 hover:text-indigo-700 font-extrabold text-xs py-1.5 px-3 rounded-xl border border-slate-200/90 hover:border-indigo-300 shadow-2xs transition-all cursor-pointer group text-left"
                        title="Klik untuk mengganti kategori"
                      >
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs group-hover:scale-110 transition-transform"
                          style={{ backgroundColor: CATEGORY_COLORS[tx.category] || '#818CF8' }}
                        />
                        <span>{tx.category}</span>
                      </button>

                      <button
                        onClick={() => setActiveDateModalTxId(tx.id)}
                        className="flex items-center gap-1.5 bg-white hover:bg-indigo-50/90 text-slate-600 hover:text-indigo-700 font-extrabold text-xs py-1.5 px-3 rounded-xl border border-slate-200/90 hover:border-indigo-300 shadow-2xs transition-all cursor-pointer shrink-0"
                        title="Klik untuk mengubah tanggal transaksi"
                      >
                        <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span>
                          {new Date(tx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <span className="text-[10px] font-semibold text-slate-400 mt-1 px-1">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex items-center gap-2 text-slate-600 font-semibold text-xs p-3 rounded-2xl bg-white border border-slate-200/80 shadow-sm w-fit animate-pulse">
            <Sparkles className="w-4 h-4 text-indigo-500 animate-spin" />
            <span>SakuChat sedang mencatat...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Input Area */}
      <div className="px-4 pb-3 pt-1 bg-transparent z-10">
        <div className="floating-input-bar flex items-center gap-2 px-1.5 py-1.5">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={pendingTextForAmount ? 'Ketik nominal angka (misal: 50000)...' : 'Ketik pengeluaran (misal: Makan 20rb)...'}
            className="flex-1 bg-transparent border-none px-3.5 py-2 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none"
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputText.trim()}
            className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-500 hover:from-sky-500 hover:to-indigo-600 disabled:opacity-40 disabled:hover:from-sky-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 transition-all shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Custom Sleek Category Selector Overlay */}
      {activeModalTxId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-slate-100 animate-pop-in space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between shrink-0">
              <h3 className="font-black text-base text-slate-800">Pilih Kategori Baru</h3>
              <button
                onClick={() => setActiveModalTxId(null)}
                className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-xs text-slate-600 transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
            <p className="text-xs text-slate-500 font-medium shrink-0">
              Pilih kategori yang paling tepat untuk transaksi ini:
            </p>
            <div className="flex flex-col gap-2 overflow-y-auto pr-1 py-1">
              {ALL_CATEGORIES.map((cat) => {
                const storedTxs = getStoredTransactions();
                const currentTx = storedTxs.find((t) => t.id === activeModalTxId);
                const isSelected = currentTx?.category === cat;

                return (
                  <button
                    key={cat}
                    onClick={() => {
                      handleCategoryChange(activeModalTxId, cat);
                      setActiveModalTxId(null);
                    }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer text-left font-extrabold text-sm ${
                      isSelected
                        ? 'bg-indigo-50/90 border-indigo-300 text-indigo-700 shadow-sm'
                        : 'bg-white hover:bg-slate-50 border-slate-200/80 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: CATEGORY_COLORS[cat] || '#818CF8' }}
                      />
                      <span>{cat}</span>
                    </div>
                    {isSelected && (
                      <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-indigo-500 text-white">
                        Aktif
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Date Picker Modal */}
      {activeDateModalTxId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-slate-100 animate-pop-in space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-slate-800">Tanggal Transaksi</h3>
              <button
                onClick={() => setActiveDateModalTxId(null)}
                className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-xs text-slate-600 transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Pilih shortcut cepat atau tentukan tanggal spesifik:
            </p>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Hari Ini', days: 0 },
                { label: 'Kemarin', days: 1 },
                { label: '2 Hari Lalu', days: 2 }
              ].map((shortcut) => (
                <button
                  key={shortcut.label}
                  onClick={() => {
                    const d = new Date(Date.now() - shortcut.days * 86400000);
                    handleDateUpdate(activeDateModalTxId, d.toISOString());
                    setActiveDateModalTxId(null);
                  }}
                  className="py-2.5 px-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black text-xs transition-all cursor-pointer text-center border border-indigo-200/60"
                >
                  {shortcut.label}
                </button>
              ))}
            </div>

            <div className="border-t border-slate-100 pt-3">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Pilih tanggal dari kalender:</label>
              <input
                type="date"
                defaultValue={(() => {
                  const storedTxs = getStoredTransactions();
                  const target = storedTxs.find((t) => t.id === activeDateModalTxId);
                  return target ? new Date(target.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
                })()}
                onChange={(e) => {
                  if (e.target.value) {
                    const d = new Date(e.target.value + 'T12:00:00');
                    handleDateUpdate(activeDateModalTxId, d.toISOString());
                    setActiveDateModalTxId(null);
                  }
                }}
                className="w-full p-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 bg-slate-50 focus:outline-none focus:border-indigo-500 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
