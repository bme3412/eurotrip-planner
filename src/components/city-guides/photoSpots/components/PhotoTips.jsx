'use client';

import React from 'react';

export default function PhotoTips({ tips }) {
  if (!tips || tips.length === 0) return null;
  return (
    <section className="border-t border-gray-200 pt-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 tracking-tight">Photography Tips</h2>
      <div className="grid md:grid-cols-2 gap-6">
        {tips.map((tip, i) => (
          <div
            key={i}
            className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-5"
          >
            <h3 className="font-bold text-gray-900 mb-2">{tip.title}</h3>
            <p className="text-gray-600 text-[15px] leading-relaxed">{tip.content}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
