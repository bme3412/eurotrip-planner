'use client';

import React from 'react';

// Utility to join class names safely
function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

// Color tokens for tier theming
const TONES = {
  emerald: {
    panel: 'from-emerald-50 to-white ring-emerald-200',
    chip: 'bg-emerald-100 text-emerald-800 ring-emerald-200'
  },
  amber: {
    panel: 'from-amber-50 to-white ring-amber-200',
    chip: 'bg-amber-100 text-amber-800 ring-amber-200'
  },
  sky: {
    panel: 'from-sky-50 to-white ring-sky-200',
    chip: 'bg-sky-100 text-sky-800 ring-sky-200'
  },
  indigo: {
    panel: 'from-indigo-50 to-white ring-indigo-200',
    chip: 'bg-indigo-100 text-indigo-800 ring-indigo-200'
  },
  rose: {
    panel: 'from-rose-50 to-white ring-rose-200',
    chip: 'bg-rose-100 text-rose-800 ring-rose-200'
  },
  gray: {
    panel: 'from-gray-50 to-white ring-gray-200',
    chip: 'bg-gray-100 text-gray-800 ring-gray-200'
  }
};

export function Card({ children, className = '', interactive = true }) {
  return (
    <div
      className={cx(
        'rounded-lg bg-white/80 backdrop-blur-sm ring-1 ring-gray-200 shadow-sm',
        interactive && 'transition-all duration-200 hover:-translate-y-0.5 hover:ring-indigo-200/70 hover:shadow',
        className
      )}
    >
      {children}
    </div>
  );
}

export function Chip({ children, className = '', tone = 'gray' }) {
  const styles = TONES[tone] || TONES.gray;
  return (
    <span className={cx('text-[10px] md:text-xs px-2 py-1 rounded-full whitespace-nowrap ring-1', styles.chip, className)}>
      {children}
    </span>
  );
}

export function TierPanel({ title, count, icon, tone = 'gray', children, className = '' }) {
  const styles = TONES[tone] || TONES.gray;
  return (
    <section
      className={cx(
        'relative overflow-hidden rounded-xl bg-gradient-to-br p-4 md:p-5 shadow-sm ring-1',
        styles.panel,
        'transition-shadow hover:shadow-md',
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.06),transparent_40%)]" />
      <header className="relative flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/80 ring-1 ring-gray-200 text-[15px]" aria-hidden>
            {icon}
          </span>
          <h3 className="text-base md:text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        {typeof count === 'number' && (
          <Chip tone={tone}>{count} picks</Chip>
        )}
      </header>
      <div className="relative">
        {children}
      </div>
    </section>
  );
}

// Small meta chip for list items
export function MetaChip({ icon, children, className = '' }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full bg-gray-50 text-gray-700 ring-1 ring-gray-200 px-2 py-0.5 text-[11px] leading-5', className)}>
      {icon ? <span aria-hidden>{icon}</span> : null}
      {children}
    </span>
  );
}

// Item row used inside lists
export function ListItem({ title, subtitle, icon, right, className = '' }) {
  return (
    <Card className={cx('p-3', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {icon ? (
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-50 text-gray-700 ring-1 ring-gray-200 text-[13px]" aria-hidden>{icon}</span>
            ) : null}
            <h4 className="font-medium text-gray-900 text-sm md:text-[15px] truncate" title={typeof title === 'string' ? title : undefined}>{title}</h4>
          </div>
          {subtitle ? (
            <p className="text-xs text-gray-600 mt-1 line-clamp-1">{subtitle}</p>
          ) : null}
        </div>
        {right}
      </div>
    </Card>
  );
}

export const tones = TONES;


