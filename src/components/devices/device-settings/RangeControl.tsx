'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export function RangeControl({
  value,
  min,
  max,
  onChange,
}: {
  value: string;
  min: number;
  max: number;
  onChange: (v: string) => void;
}) {
  const [local, setLocal] = useState(value);
  const focused = useRef(false);

  // Sync from prop when input is not focused
  useEffect(() => {
    if (!focused.current) {
      setLocal(value);
    }
  }, [value]);

  const handleBlur = useCallback(() => {
    focused.current = false;
    const num = Number(local);
    if (isNaN(num) || num < min || num > max) {
      setLocal(value);
      return;
    }
    if (local !== value) {
      onChange(String(num));
    }
  }, [local, value, min, max, onChange]);

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={min}
        max={max}
        value={local}
        onFocus={() => { focused.current = true; }}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => { if (e.key === 'Enter') handleBlur(); }}
        className="w-20 px-2 py-1 text-sm rounded-[var(--border-radius-base)] border border-heron bg-crane text-swift"
      />
      <span className="text-xs text-grouse">{min}–{max}</span>
    </div>
  );
}
