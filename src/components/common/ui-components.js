'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

// Animation variants for transitions
export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } }
};

// Reusable step container component
export const StepContainer = ({ children, stepNumber, totalSteps, title, icon }) => {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={fadeIn}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-800 flex items-center">
          {icon && <span className="mr-1 text-blue-600">{icon}</span>}
          {title}
        </h3>
        <div className="text-blue-600 flex items-center text-sm font-medium">
          <span>Step {stepNumber} of {totalSteps}</span>
        </div>
      </div>
      {children}
    </motion.div>
  );
};

// Reusable navigation buttons component
export const NavigationButtons = ({
  onBack,
  onNext,
  nextDisabled = false,
  nextLabel = "Next",
  isLoading = false
}) => {
  return (
    <div className="pt-2 flex justify-between">
      {onBack && (
        <button
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg flex items-center space-x-1 shadow-sm hover:bg-gray-300 transition-colors duration-200"
          onClick={onBack}
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          <span>Back</span>
        </button>
      )}
      
      {onNext && (
        <button
          className={`px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center space-x-1 shadow-md hover:bg-blue-700 transition-colors duration-200 ${
            nextDisabled || isLoading ? 'opacity-70 cursor-not-allowed' : ''
          }`}
          onClick={onNext}
          disabled={nextDisabled || isLoading}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Processing...</span>
            </>
          ) : (
            <>
              <span>{nextLabel}</span>
              {nextLabel === "Next" && <ChevronRight className="w-4 h-4 ml-1" />}
            </>
          )}
        </button>
      )}
    </div>
  );
};

// Reusable selection button
export const SelectionButton = ({
  selected,
  onClick,
  children,
  className = ""
}) => {
  return (
    <button
      className={`py-2 px-3 text-sm rounded-lg transition-all duration-200 shadow-sm hover:bg-gray-200 ${
        selected 
          ? 'bg-blue-600 text-white' 
          : 'bg-gray-100 text-gray-800'
      } ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

// Progress steps bar component
export const ProgressSteps = ({
  currentStep,
  totalSteps,
  onStepClick,
  stepIcons
}) => {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
      {Array.from({ length: totalSteps }).map((_, index) => {
        const step = index + 1;
        return (
          <div key={`step-${step}`} className="flex items-center">
            <div 
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium cursor-pointer transition-colors duration-300 ${
                currentStep >= step 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-500'
              } ${
                currentStep === step
                  ? 'ring-2 ring-offset-2 ring-blue-500'
                  : ''
              }`}
              onClick={() => {
                // Only allow going to steps that have been completed or are next
                if (step <= currentStep) {
                  onStepClick(step);
                }
              }}
            >
              {stepIcons[index]}
            </div>
            
            {step < totalSteps && (
              <div 
                className={`w-12 h-0.5 mx-0.5 transition-colors duration-300 ${
                  currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

// Trip summary component for showing selected options
export const TripSummary = ({ 
  dateType, 
  exactDates, 
  month, 
  startCity, 
  selectedCountries, 
  infoPreferences 
}) => {
  return (
    <div className="bg-blue-50 p-3 rounded-lg mt-4">
      <h4 className="text-sm font-medium text-blue-800 flex items-center mb-2">
        Trip Summary
      </h4>
      <div className="space-y-1.5 text-sm text-blue-700">
        <p>
          <span className="font-medium">When:</span>{' '}
          {dateType === 'exact' 
            ? `${exactDates.start} to ${exactDates.end}`
            : `${month}`}
        </p>
        <p>
          <span className="font-medium">Starting in:</span> {startCity}
        </p>
        <p>
          <span className="font-medium">Also visiting:</span>{' '}
          {selectedCountries.join(', ')}
        </p>
        <p>
          <span className="font-medium">Information:</span>{' '}
          {Object.entries(infoPreferences)
            .filter(([_, isSelected]) => isSelected)
            .map(([key]) => key.replace(/([A-Z])/g, ' $1').trim())
            .join(', ')}
        </p>
      </div>
    </div>
  );
};

// Scrollable containers with custom styling
export const ScrollableContainer = ({ children, className = "" }) => {
  return (
    <div className={`custom-scrollbar ${className}`}>
      {children}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(156, 163, 175, 0.5);
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background-color: rgba(229, 231, 235, 0.3);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};