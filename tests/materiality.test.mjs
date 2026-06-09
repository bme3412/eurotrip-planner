import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assessWeatherChange } from '../src/lib/concierge/materiality.js';

const wetForecast = {
  morning: { pop: 0.2, condition: 'Clouds' },
  afternoon: { pop: 0.75, condition: 'Rain' },
};

describe('assessWeatherChange', () => {
  it('ignores rain when daytime plans are all indoor', () => {
    const { material } = assessWeatherChange({
      forecast: wetForecast,
      monthlyNormal: { rainDays: 8 },
      schedule: [
        { time: '10:00', name: 'Louvre', indoor: true },
        { time: '15:00', name: 'Musée d\'Orsay', indoor: true },
      ],
    });
    assert.equal(material, false);
  });

  it('flags rain when an outdoor daytime stop is exposed', () => {
    const { material, signal } = assessWeatherChange({
      forecast: wetForecast,
      monthlyNormal: { rainDays: 8 },
      schedule: [
        { time: '10:00', name: 'Louvre', indoor: true },
        { time: '15:00', name: 'Luxembourg Gardens', indoor: false },
      ],
    });
    assert.equal(material, true);
    assert.equal(signal.atActivity, 'Luxembourg Gardens');
  });
});
