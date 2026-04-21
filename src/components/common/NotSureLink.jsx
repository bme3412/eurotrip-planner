'use client';

import Link from 'next/link';
import { HelpCircle } from 'lucide-react';

/**
 * NotSureLink - Subtle escape hatch from a structured form step into the planner.
 *
 * Renders a small inline link that hands the user off to /plan?q=<question> so
 * the planner can pick up the conversation from wherever they got stuck.
 *
 * Props:
 *   question  - The seeded prompt text (required)
 *   label     - Visible link text. Defaults to "Not sure?"
 *   className - Optional extra classes
 */
export default function NotSureLink({ question, label = 'Not sure?', className = '' }) {
  if (!question) return null;
  const href = `/plan?q=${encodeURIComponent(question)}`;
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1 text-xs font-medium text-[#8a8578] hover:text-[#a08545] transition-colors ${className}`}
    >
      <HelpCircle className="w-3 h-3" />
      <span>{label}</span>
    </Link>
  );
}
