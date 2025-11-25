/**
 * Calculate a color class for a month based on its pros and cons
 * @param {string} month - The month name
 * @param {object} monthlyData - Object containing data for all months
 * @returns {string} - A tailwind class string for the month button
 */
export function getMonthColor(month, monthlyData) {
    const data = monthlyData && monthlyData[month];
    if (!data) return 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60';
    
    // Count pro reasons (more is better)
    const proCount = data.reasons_to_visit ? data.reasons_to_visit.length : 0;
    
    // Count con reasons (more is worse)
    const conCount = data.reasons_to_reconsider ? data.reasons_to_reconsider.length : 0;
    
    // Simple ranking (pros - cons)
    const score = proCount - conCount;
    
    if (score >= 3) return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200 hover:border-green-300';
    if (score >= 1) return 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 hover:border-blue-300';
    if (score === 0) return 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200 hover:border-yellow-300';
    return 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200 hover:border-orange-300';
  }