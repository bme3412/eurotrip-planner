'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  ChevronDown,
  Plane,
  Navigation,
  Wallet,
  Wifi,
  Lightbulb,
  MapPin
} from 'lucide-react';
import { TransportOptionList } from './TransportOptionCard';
import { CITY_FAQS, DEFAULT_FAQS } from "./_data/cityFaqs";
import { CITY_NARRATIVES, DEFAULT_NARRATIVE } from "./_data/cityNarratives";

// Dynamically import the map component to avoid SSR issues
const AirportRouteMap = dynamic(() => import('./AirportRouteMap'), {
  ssr: false,
  loading: () => (
    <div className="h-72 sm:h-80 md:h-96 bg-gray-100 rounded-xl flex items-center justify-center">
      <div className="flex items-center gap-2 text-gray-500">
        <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        <span>Loading map...</span>
      </div>
    </div>
  ),
});


export default function StartHere({ cityName, cityData }) {
  const cityKey = cityName?.toLowerCase();
  const narrative = CITY_NARRATIVES[cityKey] || DEFAULT_NARRATIVE;
  const faqs = CITY_FAQS[cityKey] || DEFAULT_FAQS;
  const displayName = cityName?.charAt(0).toUpperCase() + cityName?.slice(1) || 'This City';

  const [openFaq, setOpenFaq] = useState(null);
  const [gettingInData, setGettingInData] = useState(null);
  const [selectedAirport, setSelectedAirport] = useState(null);
  const [selectedRouteId, setSelectedRouteId] = useState(null);

  // Fetch getting-in.json data for the city
  useEffect(() => {
    const fetchGettingInData = async () => {
      if (!cityData?.country || !cityKey) return;

      try {
        const countryFolder = cityData.country === 'United Kingdom' ? 'UK'
          : cityData.country === 'Czech Republic' ? 'Czechia'
          : cityData.country;

        const response = await fetch(`/data/${countryFolder}/${cityKey}/getting-in.json`);
        if (response.ok) {
          const data = await response.json();
          setGettingInData(data);
          // Auto-select first airport
          if (data.airports?.length > 0) {
            setSelectedAirport(data.airports[0].code);
          }
        }
      } catch {
        // Silently fail - city doesn't have getting-in.json yet
      }
    };

    fetchGettingInData();
  }, [cityKey, cityData?.country]);

  // Get routes for selected airport
  const selectedAirportData = useMemo(() => {
    if (!gettingInData || !selectedAirport) return null;
    return gettingInData.airports?.find((a) => a.code === selectedAirport);
  }, [gettingInData, selectedAirport]);

  // Handle airport selection
  const handleSelectAirport = (code) => {
    setSelectedAirport(code);
    setSelectedRouteId(null); // Clear route selection when changing airport
  };

  // Handle route selection
  const handleSelectRoute = (routeId) => {
    setSelectedRouteId(selectedRouteId === routeId ? null : routeId);
  };

  // Section accent colors - just left border + icon color (removed timing)
  const SECTION_ACCENTS = {
    arrival: { border: 'border-l-sky-400', icon: Plane, iconColor: 'text-sky-500' },
    gettingAround: { border: 'border-l-indigo-400', icon: Navigation, iconColor: 'text-indigo-500' },
    money: { border: 'border-l-emerald-400', icon: Wallet, iconColor: 'text-emerald-500' },
    connectivity: { border: 'border-l-amber-400', icon: Wifi, iconColor: 'text-amber-500' },
    quickWins: { border: 'border-l-violet-400', icon: Lightbulb, iconColor: 'text-violet-500' }
  };

  // Convert markdown-style bold to JSX
  const renderContent = (content) => {
    const parts = content.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  // Editorial-style section with accent border
  const Section = ({ sectionKey, title, content }) => {
    const accent = SECTION_ACCENTS[sectionKey] || SECTION_ACCENTS.quickWins;
    const Icon = accent.icon;

    return (
      <section className={`border-l-[3px] ${accent.border} pl-5 py-1`}>
        <div className="flex items-center gap-2.5 mb-3">
          <Icon className={`h-[18px] w-[18px] ${accent.iconColor}`} />
          <h2 className="text-[17px] font-bold text-gray-900 tracking-tight">{title}</h2>
        </div>
        <div className="space-y-3">
          {content.split('\n\n').map((paragraph, i) => (
            <p key={i} className="text-gray-600 leading-7 text-[15px]">
              {renderContent(paragraph)}
            </p>
          ))}
        </div>
      </section>
    );
  };

  const FAQItem = ({ faq, index }) => {
    const isOpen = openFaq === index;
    return (
      <div className="border-b border-gray-100 last:border-b-0">
        <button
          onClick={() => setOpenFaq(isOpen ? null : index)}
          className="w-full py-4 flex items-start justify-between gap-4 text-left group"
        >
          <span className={`text-[15px] leading-snug transition-colors ${
            isOpen ? 'text-gray-900 font-semibold' : 'text-gray-700 font-medium group-hover:text-gray-900'
          }`}>{faq.question}</span>
          <ChevronDown
            className={`w-4 h-4 shrink-0 mt-1 transition-all duration-200 ${
              isOpen ? 'rotate-180 text-indigo-500' : 'text-gray-400 group-hover:text-gray-600'
            }`}
          />
        </button>
        <div className={`overflow-hidden transition-all duration-200 ease-out ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <p className="text-gray-600 leading-7 text-[15px] pb-4 pr-6">{faq.answer}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <article className="lg:max-w-none">
        {/* Getting to city */}
        <div className="mb-10">
          {/* Header with airport tabs */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <Plane className="h-5 w-5 text-sky-500" />
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                Getting to {displayName}
              </h2>
            </div>

            {/* Airport toggle */}
            {gettingInData?.airports?.length > 1 && (
              <div className="flex bg-gray-100 rounded-lg p-1">
                {gettingInData.airports.map((airport) => (
                  <button
                    key={airport.code}
                    onClick={() => handleSelectAirport(airport.code)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                      selectedAirport === airport.code
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {airport.code}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Prose summary */}
          {selectedAirportData && (
            <p className="text-gray-600 leading-relaxed mb-5">
              {selectedAirportData.code === 'CDG' ? (
                <>
                  <strong className="text-gray-900">RER B</strong> is fastest (€12, 35–50 min to Gare du Nord). {' '}
                  <strong className="text-gray-900">Roissybus</strong> goes to Opéra (€16, 60–75 min). {' '}
                  <strong className="text-gray-900">Taxis</strong> are flat-rate: €55 Right Bank, €62 Left Bank. {' '}
                  <strong className="text-gray-900">Uber/Bolt</strong> run €50–80.
                </>
              ) : selectedAirportData.code === 'ORY' ? (
                <>
                  <strong className="text-gray-900">Orlybus</strong> to Denfert-Rochereau is simplest (€12, 30–40 min). {' '}
                  <strong className="text-gray-900">Orlyval + RER B</strong> connects to central Paris (€14, 35–45 min). {' '}
                  <strong className="text-gray-900">Tram T7</strong> is cheapest but slow (€2, 40–50 min). {' '}
                  <strong className="text-gray-900">Taxis</strong> are flat-rate: €35 Left Bank, €41 Right Bank.
                </>
              ) : (
                <>Multiple transport options connect the airport to the city center.</>
              )}
            </p>
          )}

          {/* Transport options */}
          {selectedAirportData?.routes && (
            <div className="mb-6">
              <TransportOptionList
                routes={selectedAirportData.routes}
                selectedRouteId={selectedRouteId}
                onSelectRoute={handleSelectRoute}
                layout="row"
                compact={true}
              />
            </div>
          )}

          {/* Map */}
          {gettingInData && (
            <AirportRouteMap
              data={gettingInData}
              selectedRouteId={selectedRouteId}
              onSelectRoute={handleSelectRoute}
              selectedAirport={selectedAirport}
              onSelectAirport={handleSelectAirport}
              className="h-72 sm:h-80 md:h-96 aspect-[4/3] md:aspect-auto"
            />
          )}

        </div>
      </article>

      {/* FAQ Section */}
      <section className="border-t border-gray-200 pt-8">
        <h2 className="text-lg font-bold text-gray-900 tracking-tight mb-6">Frequently Asked Questions</h2>
        <div className="grid lg:grid-cols-2 gap-x-12">
          <div>
            {faqs.slice(0, Math.ceil(faqs.length / 2)).map((faq, i) => (
              <FAQItem key={i} faq={faq} index={i} />
            ))}
          </div>
          <div>
            {faqs.slice(Math.ceil(faqs.length / 2)).map((faq, i) => (
              <FAQItem key={i + Math.ceil(faqs.length / 2)} faq={faq} index={i + Math.ceil(faqs.length / 2)} />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-10 pt-6 border-t border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
          <span className="text-gray-500 font-medium">Plan smarter. Travel better.</span>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/city-guides" className="text-gray-500 hover:text-indigo-600 transition-colors font-medium">
              Browse all cities
            </Link>
            <Link href="mailto:hello@eurotrip.guide" className="text-gray-500 hover:text-indigo-600 transition-colors font-medium">
              Get support
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
