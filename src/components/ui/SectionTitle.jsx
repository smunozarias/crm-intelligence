import React from 'react';

export const SectionTitle = ({ title, subtitle }) => (
  <div className="mb-6 fade-in">
    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{title}</h1>
    <p className="text-slate-500 text-sm mt-1">{subtitle}</p>
  </div>
);
