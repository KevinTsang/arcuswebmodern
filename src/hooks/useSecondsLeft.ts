'use client';

import { useEffect, useState } from 'react';
import { secondsUntil } from '@/lib/zwaveS2';

/**
 * Whole seconds left until `expires` (ms since the epoch), updated every
 * second. Null while there is no deadline; stops ticking at 0.
 */
export function useSecondsLeft(expires: number | null): number | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (expires == null) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    const tick = () => {
      const current = Date.now();
      setNow(current);
      if (current >= expires && timer) clearInterval(timer);
    };
    // Catch up at once: `now` may be from long before this deadline was set.
    const first = setTimeout(tick, 0);
    timer = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      if (timer) clearInterval(timer);
    };
  }, [expires]);

  return expires == null ? null : secondsUntil(expires, now);
}
