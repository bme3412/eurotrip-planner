import { Sun, Sunrise, Sunset } from 'lucide-react';

export function getBestTimeIcon(time) {
  const t = time?.toLowerCase() || '';
  if (t.includes('sunrise') || t.includes('morning')) return Sunrise;
  if (t.includes('sunset') || t.includes('golden')) return Sunset;
  return Sun;
}
