'use client';

import { memo } from 'react';
import ToggleOnOff from './ToggleOnOff';
import LockUnlock from './LockUnlock';
import OpenCloseDoor from './OpenCloseDoor';
import OpenCloseValve from './OpenCloseValve';
import ThermostatControl from './ThermostatControl';
import MultiToggle from './MultiToggle';

interface DeviceActionsProps {
  address: string;
  /** Action name from config (e.g. 'toggle-on-off', 'lock-unlock') */
  action: string;
}

function DeviceActionsInner({ address, action }: DeviceActionsProps) {
  switch (action) {
    case 'toggle-on-off':
      return <ToggleOnOff address={address} />;
    case 'lock-unlock':
      return <LockUnlock address={address} />;
    case 'open-close-door':
      return <OpenCloseDoor address={address} />;
    case 'open-close-valve':
      return <OpenCloseValve address={address} />;
    case 'thermostat-slider':
      return <ThermostatControl address={address} />;
    case 'multi-toggle':
      return <MultiToggle address={address} />;
    default:
      return null;
  }
}

export const DeviceActions = memo(DeviceActionsInner);
