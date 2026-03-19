import React from 'react';
import { CheckCircle } from 'lucide-react';

export const Toast = ({ message }) => {
  if (!message) return null;

  return (
    <div className="fixed bottom-8 right-8 bg-slate-900 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom z-50">
      <CheckCircle size={18} className="text-emerald-400" />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};
