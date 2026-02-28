'use client';

/**
 * DeviceBadges — renders status badges for a device.
 *
 * Replaces src/components/device/badges/. Instead of 30+ separate
 * CanJS components, badges are rendered from data returned by
 * useDeviceBadges() hook.
 */

import { memo } from 'react';
import { useDeviceBadges, type BadgeInfo } from '@/hooks/useDeviceConfig';

interface DeviceBadgesProps {
  address: string;
}

function DeviceBadgesInner({ address }: DeviceBadgesProps) {
  const badges = useDeviceBadges(address);

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((badge) => (
        <Badge key={badge.key} badge={badge} />
      ))}
    </div>
  );
}

function Badge({ badge }: { badge: BadgeInfo }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-pigeon rounded text-xs text-coot">
      <span className="text-grouse">{badge.label}:</span>
      <span className="font-medium">{badge.value}</span>
    </span>
  );
}

export const DeviceBadges = memo(DeviceBadgesInner);
