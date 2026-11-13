'use client';

/**
 * HubAdvancedSettings — the hub's sounds, cellular backup and radio
 * diagnostics on one page (Devices › Hub › Advanced).
 */

import Link from 'next/link';
import { useAppSelector } from '@/store/hooks';
import { HubSoundsCard } from './HubSoundsCard';
import { CellularBackupCard } from './CellularBackupCard';
import { ZWaveNetworkCard } from './ZWaveNetworkCard';
import { ZigbeeNetworkCard } from './ZigbeeNetworkCard';
import type { HubAdvancedAttributes } from './hubAdvancedTypes';

export function HubAdvancedSettings() {
  const hub = useAppSelector((s) => s.hub.hub) as HubAdvancedAttributes | null;

  return (
    <div className="p-[var(--gutter)] max-w-3xl">
      <Link href="/devices" data-testid="hub-advanced-back" className="text-sm text-peacock hover:underline">
        &lsaquo; Devices
      </Link>
      <h2
        data-testid="hub-advanced-title"
        className="text-[length:var(--font-size-h2)] font-[var(--heading-font-weight)] text-swift mt-2 mb-4"
      >
        Hub Advanced Settings
      </h2>

      {!hub ? (
        <p data-testid="hub-advanced-no-hub" className="text-sm text-grouse">
          No hub is registered at this place.
        </p>
      ) : (
        <div className="space-y-4">
          <HubSoundsCard hub={hub} />
          <CellularBackupCard hub={hub} />
          <ZWaveNetworkCard hub={hub} />
          <ZigbeeNetworkCard hub={hub} />
        </div>
      )}
    </div>
  );
}
