'use client';

import React, { useEffect } from 'react';
import EuroTripPlanner from '../../components/EuroTripPlanner';
import TravelFilterBox from '../../components/common/TravelFilterBox';
import { useTravelData } from '../../context/TravelDataProvider';

export default function StartPlanningPage() {
  const { isPlanningStarted, startPlanning, videos } = useTravelData();
  
  // Automatically set planning as started when user is on this page
  useEffect(() => {
    // If planning hasn't been started yet, start it
    if (!isPlanningStarted) {
      startPlanning();
    }
  }, [isPlanningStarted, startPlanning]);

  return (
    <main>
      <div className="relative py-8 px-4 bg-gradient-to-b from-slate-900 to-slate-800 text-white">
        <div className="container mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Plan Your Perfect Eurotrip</h1>
          <p className="text-xl text-white/80 max-w-3xl">
            Customize your journey through Europe&apos;s most beautiful cities
          </p>
          
          {/* Filter Box - positioned at the bottom of the header */}
          <div className="mt-8 max-w-md">
            <TravelFilterBox videos={videos} />
          </div>
        </div>
      </div>
      
      <div className="py-8 px-4">
        <div className="container mx-auto">
          <EuroTripPlanner />
        </div>
      </div>
    </main>
  );
}