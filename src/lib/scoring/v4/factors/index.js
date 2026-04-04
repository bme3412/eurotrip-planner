/**
 * V4 Scoring Factors
 *
 * Simplified 6-factor system: culture, beach, timing, crowds, value, logistics
 */

import { CultureFactor } from './CultureFactor.js';
import { BeachFactor } from './BeachFactor.js';
import { TimingFactor } from './TimingFactor.js';
import { CrowdsFactor } from './CrowdsFactor.js';
import { ValueFactor } from './ValueFactor.js';
import { LogisticsFactor } from './LogisticsFactor.js';

export {
  CultureFactor,
  BeachFactor,
  TimingFactor,
  CrowdsFactor,
  ValueFactor,
  LogisticsFactor,
};

export function getFactorClasses() {
  return {
    culture: CultureFactor,
    beach: BeachFactor,
    timing: TimingFactor,
    crowds: CrowdsFactor,
    value: ValueFactor,
    logistics: LogisticsFactor,
  };
}

export function registerAllFactors(engine) {
  engine.registerFactor('culture', CultureFactor);
  engine.registerFactor('beach', BeachFactor);
  engine.registerFactor('timing', TimingFactor);
  engine.registerFactor('crowds', CrowdsFactor);
  engine.registerFactor('value', ValueFactor);
  engine.registerFactor('logistics', LogisticsFactor);
}
