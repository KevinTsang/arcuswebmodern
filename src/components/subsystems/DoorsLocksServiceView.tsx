/**
 * DoorsLocksServiceView — the Doors & Locks service page with its tabs.
 *
 * Replaces src/components/subsystem/doors-locks/doors-locks.stache. The
 * active tab comes from the route (/services/doors-locks/<action>):
 * Status (device summary), Access List (PINs per lock) and More (door chime).
 */

import { DoorsLocksView } from './DoorsLocksView';
import { DoorsLocksTabs, DOORS_LOCKS_TABS, type DoorsLocksAction } from './DoorsLocksTabs';
import { LockAccessList } from './LockAccessList';
import { DoorChimeSettings } from './DoorChimeSettings';

function toAction(action: string): DoorsLocksAction {
  return DOORS_LOCKS_TABS.find((t) => t.action === action)?.action ?? 'status';
}

export function DoorsLocksServiceView({ action = 'status' }: { action?: string }) {
  const active = toAction(action);

  return (
    <div>
      <DoorsLocksTabs active={active} />
      {active === 'access-list' && <LockAccessList />}
      {active === 'more' && <DoorChimeSettings />}
      {active === 'status' && <DoorsLocksView />}
    </div>
  );
}
