'use client';

import React, { useState } from 'react';
import { DocumentArrowDownIcon } from '@heroicons/react/24/outline';

export default function ExportPDF({ cityName, cityData, className = '' }) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      // Dynamic import of html2pdf library
      const html2pdf = (await import('html2pdf.js')).default;
      
      // Create a printable version of the content
      const content = createPrintableContent(cityName, cityData);
      
      const opt = {
        margin: [0.5, 0.5],
        filename: `${cityName}-travel-guide.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      await html2pdf().set(opt).from(content).save();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const createPrintableContent = (city, data) => {
    const container = document.createElement('div');
    container.style.padding = '20px';
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.color = '#333';
    
    // Title
    const title = document.createElement('h1');
    title.textContent = `${data?.displayName || city} Travel Guide`;
    title.style.color = '#1e40af';
    title.style.marginBottom = '10px';
    title.style.fontSize = '32px';
    container.appendChild(title);

    // Subtitle
    if (data?.country) {
      const subtitle = document.createElement('p');
      subtitle.textContent = data.country;
      subtitle.style.color = '#666';
      subtitle.style.marginBottom = '20px';
      subtitle.style.fontSize = '16px';
      container.appendChild(subtitle);
    }

    // Divider
    const divider = document.createElement('hr');
    divider.style.margin = '20px 0';
    divider.style.border = 'none';
    divider.style.borderTop = '2px solid #e5e7eb';
    container.appendChild(divider);

    // Overview
    if (data?.overview?.introduction) {
      const overviewTitle = document.createElement('h2');
      overviewTitle.textContent = 'Overview';
      overviewTitle.style.color = '#1e40af';
      overviewTitle.style.marginTop = '20px';
      overviewTitle.style.marginBottom = '10px';
      overviewTitle.style.fontSize = '24px';
      container.appendChild(overviewTitle);

      const overviewText = document.createElement('p');
      overviewText.textContent = data.overview.introduction;
      overviewText.style.lineHeight = '1.6';
      overviewText.style.marginBottom = '20px';
      container.appendChild(overviewText);
    }

    // Top Attractions
    if (data?.attractions?.sites && data.attractions.sites.length > 0) {
      const attractionsTitle = document.createElement('h2');
      attractionsTitle.textContent = 'Top Attractions';
      attractionsTitle.style.color = '#1e40af';
      attractionsTitle.style.marginTop = '20px';
      attractionsTitle.style.marginBottom = '10px';
      attractionsTitle.style.fontSize = '24px';
      attractionsTitle.style.pageBreakBefore = 'auto';
      container.appendChild(attractionsTitle);

      const attractionsList = document.createElement('ul');
      attractionsList.style.listStyleType = 'none';
      attractionsList.style.padding = '0';

      data.attractions.sites.slice(0, 15).forEach(site => {
        const li = document.createElement('li');
        li.style.marginBottom = '15px';
        li.style.pageBreakInside = 'avoid';

        const name = document.createElement('strong');
        name.textContent = site.name;
        name.style.fontSize = '16px';
        name.style.color = '#1f2937';
        li.appendChild(name);

        if (site.category) {
          const category = document.createElement('span');
          category.textContent = ` (${site.category})`;
          category.style.color = '#6b7280';
          category.style.fontSize = '14px';
          li.appendChild(category);
        }

        if (site.description) {
          const desc = document.createElement('p');
          desc.textContent = site.description;
          desc.style.marginTop = '5px';
          desc.style.fontSize = '14px';
          desc.style.lineHeight = '1.5';
          desc.style.color = '#4b5563';
          li.appendChild(desc);
        }

        attractionsList.appendChild(li);
      });

      container.appendChild(attractionsList);
    }

    // Neighborhoods
    if (data?.neighborhoods?.neighborhoods && data.neighborhoods.neighborhoods.length > 0) {
      const neighborhoodsTitle = document.createElement('h2');
      neighborhoodsTitle.textContent = 'Neighborhoods';
      neighborhoodsTitle.style.color = '#1e40af';
      neighborhoodsTitle.style.marginTop = '30px';
      neighborhoodsTitle.style.marginBottom = '10px';
      neighborhoodsTitle.style.fontSize = '24px';
      neighborhoodsTitle.style.pageBreakBefore = 'auto';
      container.appendChild(neighborhoodsTitle);

      const neighborhoodsList = document.createElement('ul');
      neighborhoodsList.style.listStyleType = 'none';
      neighborhoodsList.style.padding = '0';

      data.neighborhoods.neighborhoods.forEach(neighborhood => {
        const li = document.createElement('li');
        li.style.marginBottom = '15px';
        li.style.pageBreakInside = 'avoid';

        const name = document.createElement('strong');
        name.textContent = neighborhood.name;
        name.style.fontSize = '16px';
        name.style.color = '#1f2937';
        li.appendChild(name);

        if (neighborhood.vibe) {
          const vibe = document.createElement('span');
          vibe.textContent = ` - ${neighborhood.vibe}`;
          vibe.style.color = '#6b7280';
          vibe.style.fontSize = '14px';
          vibe.style.fontStyle = 'italic';
          li.appendChild(vibe);
        }

        if (neighborhood.description) {
          const desc = document.createElement('p');
          desc.textContent = neighborhood.description;
          desc.style.marginTop = '5px';
          desc.style.fontSize = '14px';
          desc.style.lineHeight = '1.5';
          desc.style.color = '#4b5563';
          li.appendChild(desc);
        }

        neighborhoodsList.appendChild(li);
      });

      container.appendChild(neighborhoodsList);
    }

    // Getting Around
    if (data?.connections) {
      const transportTitle = document.createElement('h2');
      transportTitle.textContent = 'Getting Around';
      transportTitle.style.color = '#1e40af';
      transportTitle.style.marginTop = '30px';
      transportTitle.style.marginBottom = '10px';
      transportTitle.style.fontSize = '24px';
      transportTitle.style.pageBreakBefore = 'auto';
      container.appendChild(transportTitle);

      if (data.connections.publicTransport?.overview) {
        const transportOverview = document.createElement('p');
        transportOverview.textContent = data.connections.publicTransport.overview;
        transportOverview.style.lineHeight = '1.6';
        transportOverview.style.marginBottom = '15px';
        container.appendChild(transportOverview);
      }
    }

    // Footer
    const footer = document.createElement('div');
    footer.style.marginTop = '40px';
    footer.style.paddingTop = '20px';
    footer.style.borderTop = '2px solid #e5e7eb';
    footer.style.textAlign = 'center';
    footer.style.color = '#9ca3af';
    footer.style.fontSize = '12px';
    
    const footerText = document.createElement('p');
    footerText.textContent = `Generated from Eurotrip Planner on ${new Date().toLocaleDateString()}`;
    footer.appendChild(footerText);
    
    container.appendChild(footer);

    return container;
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className={`inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 font-medium text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <DocumentArrowDownIcon className="w-5 h-5" />
      <span>{isExporting ? 'Generating PDF...' : 'Export PDF'}</span>
    </button>
  );
}

