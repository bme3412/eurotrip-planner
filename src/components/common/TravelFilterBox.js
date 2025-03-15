'use client';

import React, { useState, useMemo } from 'react';
import { Calendar, MapPin, Globe } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

// Import separated step components
import DateSelectionStep from './DateSelectionStep';
import CitySelectionStep from './CitySelectionStep';
import TripCustomizationStep from './TripCustomizationStep';

/**
 * Enhanced Travel Filter Box Component
 * Refactored into a 3-step process with improved UI based on mockups
 */
const TravelFilterBox = ({ videos = [], onSearch }) => {
  // State for multi-step form
  const [dateType, setDateType] = useState(null); // 'exact' or 'flexible'
  const [month, setMonth] = useState(null);
  const [exactDates, setExactDates] = useState({ start: '', end: '' });
  const [startCity, setStartCity] = useState('');
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [infoPreferences, setInfoPreferences] = useState({
    cityGuides: false,
    dayTrips: false,
    itineraries: false,
  });
  const [currentStep, setCurrentStep] = useState(1);
  const [isSearching, setIsSearching] = useState(false);

  // Extract unique locations and countries from videos or use fallbacks
  const popularCities = useMemo(() => {
    return [
      ...new Set(
        videos?.map((video) => video.location) || [
          'Paris',
          'Barcelona',
          'Rome',
          'Amsterdam',
          'Berlin',
          'Prague',
          'Vienna',
          'Athens',
          'Lisbon',
          'Madrid',
          'London',
          'Dublin',
          'Copenhagen',
          'Stockholm',
          'Budapest',
          'Florence',
          'Venice',
          'Munich',
          'Zurich',
          'Brussels',
        ]
      ),
    ];
  }, [videos]);

  // Extract countries from videos or use fallback
  const countries = useMemo(() => {
    return [
      ...new Set(
        videos?.map((video) => video.country) || [
          'France',
          'Spain',
          'Italy',
          'Netherlands',
          'Germany',
          'Czech Republic',
          'Austria',
          'Greece',
          'Portugal',
          'Switzerland',
          'Belgium',
          'Croatia',
          'Denmark',
          'Hungary',
          'Ireland',
          'Slovenia',
          'United Kingdom',
          'Sweden',
          'Norway',
          'Finland',
          'Poland',
        ]
      ),
    ];
  }, [videos]);

  // Navigation functions
  const goToNextStep = () => {
    setCurrentStep((prev) => Math.min(prev + 1, 3));
  };

  const goToPreviousStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Form submission
  const handleSubmit = () => {
    setIsSearching(true);

    // Collect all search parameters
    const searchParams = {
      dateType,
      ...(dateType === 'exact' ? { exactDates } : { month }),
      startCity,
      countries: selectedCountries,
      infoPreferences,
    };

    // Submit with short loading delay for better UX
    setTimeout(() => {
      if (onSearch) {
        onSearch(searchParams);
      }
      setIsSearching(false);
    }, 800);
  };

  // Animation variants for transitions
  const fadeIn = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3 } },
    exit: { opacity: 0, transition: { duration: 0.2 } },
  };

  return (
    <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg overflow-hidden border border-gray-100">
      {/* Progress steps */}
      <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
        {[1, 2, 3].map((step) => (
          <div key={`step-${step}`} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium cursor-pointer transition-colors duration-300 ${
                currentStep >= step
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-500"
              } ${
                currentStep === step ? "ring-2 ring-offset-2 ring-blue-500" : ""
              }`}
              onClick={() => {
                // Only allow going to steps that have been completed
                if (step < currentStep) {
                  setCurrentStep(step);
                }
              }}
            >
              {step === 1 && <Calendar className="w-5 h-5" />}
              {step === 2 && <MapPin className="w-5 h-5" />}
              {step === 3 && <Globe className="w-5 h-5" />}
            </div>

            {step < 3 && (
              <div
                className={`w-24 h-1 mx-1 transition-colors duration-300 ${
                  currentStep > step ? "bg-blue-600" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="p-6">
        <AnimatePresence mode="wait">
          {/* Step 1: Date Selection */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={fadeIn}
            >
              <DateSelectionStep
                dateType={dateType}
                setDateType={setDateType}
                exactDates={exactDates}
                setExactDates={setExactDates}
                month={month}
                setMonth={setMonth}
                goToNextStep={goToNextStep}
              />
            </motion.div>
          )}

          {/* Step 2: City Selection */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={fadeIn}
            >
              <CitySelectionStep
                popularCities={popularCities}
                startCity={startCity}
                setStartCity={setStartCity}
                goToNextStep={goToNextStep}
                goToPreviousStep={goToPreviousStep}
              />
            </motion.div>
          )}

          {/* Step 3: Trip Customization */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={fadeIn}
            >
              <TripCustomizationStep
                countries={countries}
                selectedCountries={selectedCountries}
                setSelectedCountries={setSelectedCountries}
                infoPreferences={infoPreferences}
                setInfoPreferences={setInfoPreferences}
                dateType={dateType}
                exactDates={exactDates}
                month={month}
                startCity={startCity}
                goToPreviousStep={goToPreviousStep}
                onSubmit={handleSubmit}
                isSearching={isSearching}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TravelFilterBox;