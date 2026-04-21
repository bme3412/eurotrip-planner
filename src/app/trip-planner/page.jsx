'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { motion } from 'framer-motion';
import AnchoredWizard from '@/components/trip-planner/AnchoredWizard';

/**
 * Loading fallback for conversation mode
 */
function ConversationLoading() {
  return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-600">Loading trip planner...</p>
      </div>
    </div>
  );
}

/**
 * Inner component that reads search params
 */
function TripPlannerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = searchParams.get('mode');

  // Redirect conversation mode to /plan (the new unified agent route)
  useEffect(() => {
    if (mode === 'conversation') {
      router.replace('/plan');
    }
  }, [mode, router]);

  // Show loading while redirecting
  if (mode === 'conversation') {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  // Read URL params for pre-filling wizard
  const initialStartCityId = searchParams.get('start');
  const initialEndCityId = searchParams.get('end');
  const initialStartDate = searchParams.get('startDate');
  const initialEndDate = searchParams.get('endDate');
  const isAuditMode = mode === 'audit';
  const auditCityIds = searchParams.get('cities')?.split(',').filter(Boolean) || [];

  // Default: Show advanced wizard mode
  return (
    <div className="min-h-screen relative overflow-hidden bg-[#faf8f5]">
      {/* Atmospheric background */}
      <div className="absolute inset-0">
        {/* Warm gradient base */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 100% 70% at 50% -10%, #f5f0e8 0%, #faf8f5 50%)',
          }}
        />
        {/* Subtle grain texture */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />
        {/* Accent glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] opacity-30"
          style={{
            background: 'radial-gradient(ellipse at center, #e8d5a3 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10">
        {/* Wizard */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <AnchoredWizard
            initialStartCityId={initialStartCityId}
            initialEndCityId={initialEndCityId}
            initialStartDate={initialStartDate}
            initialEndDate={initialEndDate}
            isAuditMode={isAuditMode}
            auditCityIds={auditCityIds}
          />
        </motion.div>
      </div>
    </div>
  );
}

/**
 * TripPlannerPage - Entry point for the step-by-step wizard
 *
 * Note: ?mode=conversation now redirects to /plan (the unified agent route)
 */
export default function TripPlannerPage() {
  return (
    <Suspense fallback={<ConversationLoading />}>
      <TripPlannerContent />
    </Suspense>
  );
}
