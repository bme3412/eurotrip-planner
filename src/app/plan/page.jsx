'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const ConversationalPlanner = dynamic(
  () => import('@/components/conversation/ConversationalPlanner'),
  {
    ssr: false,
    loading: () => (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading…</p>
        </div>
      </div>
    ),
  }
);

function PlanContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q')?.trim() || null;
  return <ConversationalPlanner initialUserMessage={q} />;
}

export default function PlanPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading…</p>
        </div>
      </div>
    }>
      <PlanContent />
    </Suspense>
  );
}
