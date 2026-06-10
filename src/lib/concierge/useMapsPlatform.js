'use client';

import { useEffect, useState } from 'react';
import { detectMapsPlatform } from './mapsLink';

/**
 * Which maps app this device should deep-link into. Resolves after mount so
 * server-rendered HTML (always Google) never mismatches on hydration — iPhones
 * flip to Apple Maps before anyone can tap.
 */
export function useMapsPlatform() {
  const [platform, setPlatform] = useState('google');
  useEffect(() => {
    setPlatform(detectMapsPlatform());
  }, []);
  return platform;
}
