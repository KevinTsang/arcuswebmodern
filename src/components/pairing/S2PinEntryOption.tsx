'use client';

/**
 * S2PinEntryOption — lets the user pair a Z-Wave device without the S2 PIN.
 *
 * zwave-js recommends offering a way around S2: some locks claim S2 support
 * but fail the key exchange, and once S2 has been tried the device can't fall
 * back. Turning this on leaves `s2PinEntry` out of the search, so the hub
 * doesn't ask for a PIN and the device joins with S2 Unauthenticated or S0
 * instead (arcusplatform docs/zwave-s2-pin-pairing.md).
 */

import { useCallback, type ChangeEvent } from 'react';

interface S2PinEntryOptionProps {
  /** True to pair without the PIN. */
  skipPin: boolean;
  onChange: (skipPin: boolean) => void;
}

export function S2PinEntryOption({ skipPin, onChange }: S2PinEntryOptionProps) {
  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => onChange(e.target.checked), [onChange]);

  return (
    <div data-testid="s2-pin-entry-option" className="mb-4 p-3 border border-heron rounded-[var(--border-radius-base)] bg-pigeon">
      <label className="flex items-start gap-2 text-sm text-swift">
        <input
          type="checkbox"
          data-testid="s2-pin-entry-skip"
          checked={skipPin}
          onChange={handleChange}
          className="mt-0.5"
        />
        <span>
          Pair without the S2 PIN
          <span className="block text-xs text-coot mt-0.5">
            Only if this device failed secure pairing before. It will join with lower security (S2
            Unauthenticated or S0), and you won&apos;t be asked for the PIN.
          </span>
        </span>
      </label>
    </div>
  );
}
