/**
 * DoorsLocksServiceView — the Doors & Locks service page with its tabs.
 *
 * Replaces src/components/subsystem/doors-locks/doors-locks.stache. The
 * active tab comes from the route (/services/doors-locks/<action>):
 * Status (device summary), Access List (PINs per lock) and More (door chime).
 */

import { resolveSubsystemAction } from '@/lib/subsystemTabs';
import { DoorsLocksView } from './DoorsLocksView';
import { SubsystemTabs } from './SubsystemTabs';
import { LockAccessList } from './LockAccessList';
import { DoorChimeSettings } from './DoorChimeSettings';

export function DoorsLocksServiceView({ action }: { action?: string }) {
  const active = resolveSubsystemAction('doors-locks', action);

  return (
    <div>
      <SubsystemTabs slug="doors-locks" active={active} testIdPrefix="doors-tab" />
      {active === 'access-list' && <LockAccessList />}
      {active === 'more' && <DoorChimeSettings />}
      {active === 'status' && <DoorsLocksView />}
    </div>
  );
}
