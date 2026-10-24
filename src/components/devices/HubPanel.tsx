'use client';

/**
 * HubPanel — displays hub status at the top of the device list.
 *
 * Replaces src/components/hub/panel/. Shows hub connection state,
 * model name, battery status, and firmware version.
 */

import { memo } from 'react';
import { Hub, HubAdvanced, HubPower } from '@arcus/core';
import { useAppSelector } from '@/store/hooks';

function HubPanelInner() {
  const hub = useAppSelector((s) => s.hub.hub);

  if (!hub) return null;

  const state = (hub[Hub.ATTR_STATE] as string) ?? '';
  const online = state === Hub.STATE_NORMAL;
  const modelName = (hub[Hub.ATTR_MODEL] as string) ?? 'Smart Hub';
  const name = (hub[Hub.ATTR_NAME] as string) ?? modelName;
  const firmwareVersion = (hub[HubAdvanced.ATTR_OSVER] as string) ?? '';
  const batteryPowered = hub[HubPower.ATTR_SOURCE] === HubPower.SOURCE_BATTERY;
  const battery = hub['hubpow:mainslevel'] as number | undefined;

  return (
    <div
      data-testid="hub-panel"
      data-online={online}
      className={`
        border rounded-[var(--border-radius-base)] p-4 mb-4
        ${online ? 'border-heron bg-crane' : 'border-cardinal/30 bg-cardinal/5'}
      `}
    >
      <div className="flex items-center gap-3">
        {/* Hub icon */}
        <div
          className={`
            w-10 h-10 rounded-full flex items-center justify-center
            ${online ? 'bg-honeycreeper/10 text-honeycreeper' : 'bg-cardinal/10 text-cardinal'}
          `}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
          </svg>
        </div>

        {/* Hub info */}
        <div className="flex-1 min-w-0">
          <h3 data-testid="hub-name" className="text-sm font-medium text-swift">{name}</h3>
          <p data-testid="hub-status" className="text-xs text-grouse">
            {online ? 'Online' : 'Offline'}
            {firmwareVersion && ` \u00B7 v${firmwareVersion}`}
            {batteryPowered && battery != null && ` \u00B7 Battery: ${Math.round(battery)}%`}
          </p>
        </div>

        {/* Status indicator */}
        <div
          className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
            online ? 'bg-honeycreeper' : 'bg-cardinal'
          }`}
        />
      </div>
    </div>
  );
}

export const HubPanel = memo(HubPanelInner);
