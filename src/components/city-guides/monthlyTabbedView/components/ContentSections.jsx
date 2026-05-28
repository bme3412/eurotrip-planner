import React from 'react';

function ReasonsBlock({ title, items }) {
  if (items.length === 0) {
    return (
      <>
        <h3 className="text-xl font-bold text-gray-900 mb-4 tracking-tight">{title}</h3>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </>
    );
  }
  return (
    <>
      <h3 className="text-xl font-bold text-gray-900 mb-4 tracking-tight">{title}</h3>
      <div className="prose prose-lg max-w-none">
        {items.map((item, idx) => (
          <p key={idx} className="text-gray-700 leading-relaxed mb-4 last:mb-0 text-[17px]">
            <strong className="text-gray-900">{item?.reason}</strong>
            {item?.details && ` — ${item.details}`}
          </p>
        ))}
      </div>
    </>
  );
}

/**
 * "Why Visit" + "Things to Keep in Mind" sections shown in the right column
 * below the calendar. Each block falls back to a skeleton when the underlying
 * list is empty (i.e. the month JSON is still loading or doesn't have authored
 * reasons).
 */
export default function ContentSections({ monthName, visitList, considerList }) {
  return (
    <div className="space-y-8">
      <section>
        <ReasonsBlock title={`Why Visit in ${monthName}`} items={visitList} />
      </section>
      <section className="border-t border-gray-200 pt-8">
        <ReasonsBlock title="Things to Keep in Mind" items={considerList} />
      </section>
    </div>
  );
}
