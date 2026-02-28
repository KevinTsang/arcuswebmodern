'use client';

/**
 * Countdown — countdown timer display.
 *
 * Replaces src/components/countdown/.
 */

import { useState, useEffect, useRef } from 'react';

interface CountdownProps {
  /** Target time in ms since epoch, or duration in seconds */
  targetMs?: number;
  durationSeconds?: number;
  format?: (remaining: number) => string;
  onComplete?: () => void;
}

function defaultFormat(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function Countdown({ targetMs, durationSeconds, format = defaultFormat, onComplete }: CountdownProps) {
  const [remaining, setRemaining] = useState(() => {
    if (durationSeconds != null) return durationSeconds;
    if (targetMs != null) return Math.max(0, Math.ceil((targetMs - Date.now()) / 1000));
    return 0;
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [onComplete]);

  return <span className="font-mono text-swift">{format(remaining)}</span>;
}
