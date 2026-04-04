'use client';

import React, { useState, useEffect } from 'react';

const CURRENCIES = [
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
];

// Exchange rates (base: EUR = 1.0)
// In production, these should come from an API
const EXCHANGE_RATES = {
  EUR: 1.0,
  USD: 1.09,
  GBP: 0.86,
  JPY: 163.5,
  CAD: 1.52,
  AUD: 1.66,
  CHF: 0.96,
};

export const CurrencyContext = React.createContext({
  currency: 'EUR',
  setCurrency: () => {},
  convertPrice: (price) => price,
  formatPrice: (price) => `€${price}`,
});

export function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState('EUR');

  useEffect(() => {
    // Load saved currency preference from localStorage
    const savedCurrency = localStorage.getItem('preferredCurrency');
    if (savedCurrency && CURRENCIES.find(c => c.code === savedCurrency)) {
      setCurrency(savedCurrency);
    }
  }, []);

  const handleSetCurrency = (newCurrency) => {
    setCurrency(newCurrency);
    localStorage.setItem('preferredCurrency', newCurrency);
  };

  const convertPrice = (priceInEUR) => {
    if (!priceInEUR || isNaN(priceInEUR)) return 0;
    const rate = EXCHANGE_RATES[currency] || 1.0;
    return Math.round(priceInEUR * rate * 100) / 100;
  };

  const formatPrice = (priceInEUR) => {
    const converted = convertPrice(priceInEUR);
    const currencyInfo = CURRENCIES.find(c => c.code === currency);
    const symbol = currencyInfo?.symbol || '€';
    
    // Format based on currency
    if (currency === 'JPY') {
      return `${symbol}${Math.round(converted)}`;
    }
    return `${symbol}${converted.toFixed(2)}`;
  };

  return (
    <CurrencyContext.Provider value={{ 
      currency, 
      setCurrency: handleSetCurrency, 
      convertPrice, 
      formatPrice 
    }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export default function CurrencySelector({ compact = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const { currency, setCurrency } = React.useContext(CurrencyContext);

  const selectedCurrency = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 px-2 py-1 text-sm text-gray-700 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          <span className="font-medium">{selectedCurrency.symbol}</span>
          <span className="text-xs">{selectedCurrency.code}</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)}
            ></div>
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
              <div className="py-1">
                {CURRENCIES.map((curr) => (
                  <button
                    key={curr.code}
                    onClick={() => {
                      setCurrency(curr.code);
                      setIsOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors flex items-center justify-between ${
                      curr.code === currency ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    <span>
                      <span className="font-medium">{curr.symbol}</span> {curr.name}
                    </span>
                    {curr.code === currency && (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Currency
      </label>
      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
      >
        {CURRENCIES.map((curr) => (
          <option key={curr.code} value={curr.code}>
            {curr.symbol} {curr.name} ({curr.code})
          </option>
        ))}
      </select>
    </div>
  );
}

// Hook to use currency context
export function useCurrency() {
  const context = React.useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

