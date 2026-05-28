'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

function FaqItem({ faq, isOpen, onToggle }) {
  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full py-4 flex items-start justify-between gap-4 text-left group"
      >
        <span
          className={`text-[15px] leading-snug transition-colors ${
            isOpen
              ? 'text-gray-900 font-semibold'
              : 'text-gray-700 font-medium group-hover:text-gray-900'
          }`}
        >
          {faq.question}
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 mt-1 transition-all duration-200 ${
            isOpen
              ? 'rotate-180 text-indigo-500'
              : 'text-gray-400 group-hover:text-gray-600'
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ease-out ${
          isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <p className="text-gray-600 leading-7 text-[15px] pb-4 pr-6">
          {faq.answer}
        </p>
      </div>
    </div>
  );
}

export default function FaqAccordion({ faqs }) {
  const [openFaq, setOpenFaq] = useState(null);
  const half = Math.ceil(faqs.length / 2);
  const leftFaqs = faqs.slice(0, half);
  const rightFaqs = faqs.slice(half);

  const handleToggle = (index) => () =>
    setOpenFaq((prev) => (prev === index ? null : index));

  return (
    <section className="border-t border-gray-200 pt-8">
      <h2 className="text-lg font-bold text-gray-900 tracking-tight mb-6">
        Frequently Asked Questions
      </h2>
      <div className="grid lg:grid-cols-2 gap-x-12">
        <div>
          {leftFaqs.map((faq, i) => (
            <FaqItem
              key={i}
              faq={faq}
              isOpen={openFaq === i}
              onToggle={handleToggle(i)}
            />
          ))}
        </div>
        <div>
          {rightFaqs.map((faq, i) => {
            const index = i + half;
            return (
              <FaqItem
                key={index}
                faq={faq}
                isOpen={openFaq === index}
                onToggle={handleToggle(index)}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
