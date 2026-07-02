'use client';

import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, AlertCircle } from 'lucide-react';

export interface AlertModalProps {
  isOpen: boolean;
  type: 'success' | 'error' | 'warning' | 'confirm';
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onClose?: () => void;
}

export default function AlertModal({
  isOpen,
  type,
  title,
  message,
  confirmText = 'Mengerti',
  cancelText = 'Batal',
  onConfirm,
  onClose,
}: AlertModalProps) {
  if (!isOpen) return null;

  const renderIcon = () => {
    switch (type) {
      case 'success':
        return (
          <div className="w-16 h-16 rounded-full bg-emerald-100 border-4 border-emerald-50 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
        );
      case 'error':
        return (
          <div className="w-16 h-16 rounded-full bg-rose-100 border-4 border-rose-50 flex items-center justify-center mx-auto shadow-inner">
            <XCircle className="w-8 h-8 text-rose-600" />
          </div>
        );
      case 'confirm':
        return (
          <div className="w-16 h-16 rounded-full bg-rose-100 border-4 border-rose-50 flex items-center justify-center mx-auto shadow-inner animate-pulse">
            <AlertCircle className="w-8 h-8 text-rose-600" />
          </div>
        );
      case 'warning':
      default:
        return (
          <div className="w-16 h-16 rounded-full bg-amber-100 border-4 border-amber-50 flex items-center justify-center mx-auto shadow-inner">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </div>
        );
    }
  };

  const getConfirmButtonStyle = () => {
    switch (type) {
      case 'success':
        return 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20';
      case 'error':
      case 'confirm':
        return 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/20';
      case 'warning':
      default:
        return 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/20';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
      <div className="bg-white/95 backdrop-blur-xl border border-white/80 rounded-3xl p-6 shadow-2xl max-w-sm w-full text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
        {renderIcon()}

        <div className="space-y-1.5">
          <h3 className="font-black text-lg text-slate-800 tracking-tight leading-snug">
            {title}
          </h3>
          <p className="text-xs font-semibold text-slate-600 leading-relaxed px-2">
            {message}
          </p>
        </div>

        <div className="pt-2">
          {type === 'confirm' ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-all cursor-pointer"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={`w-full py-3 px-4 rounded-2xl text-white font-extrabold text-xs transition-all shadow-md cursor-pointer ${getConfirmButtonStyle()}`}
              >
                {confirmText || 'Ya, Lanjutkan'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className={`w-full py-3 px-4 rounded-2xl text-white font-extrabold text-xs transition-all shadow-md cursor-pointer ${getConfirmButtonStyle()}`}
            >
              {confirmText || 'Mengerti'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
