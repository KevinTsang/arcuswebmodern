'use client';

/**
 * CareNotificationList — call tree for care alarm notifications.
 *
 * Displays the people who are notified when a care behavior triggers a
 * care alarm. People can be reordered, enabled, or disabled; changes are
 * saved to `subcare:callTree`.
 *
 * When `subcare:callTreeEnabled` is false (a BASIC place) the platform
 * notifies only the account owner, so the list isn't shown for editing.
 */

import { Base, CareSubsystem } from '@arcus/core';
import { useCareSubsystem } from '@/hooks/useCareSubsystem';
import { CallTreeList } from './CallTreeList';

export function CareNotificationList() {
  const care = useCareSubsystem();
  const careAddr = care.subsystem?.[Base.ATTR_ADDRESS] as string | undefined;

  if (!care.callTreeEnabled) {
    return (
      <div data-testid="care-notification-list">
        <h3 className="text-base font-medium text-swift mb-2">Notification List</h3>
        <p data-testid="care-calltree-owner-only" className="text-sm text-grouse">
          On your current plan, only the account owner is notified when a care alarm is triggered.
          Upgrade to Premium to notify other people in an order you choose.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="care-notification-list">
      <CallTreeList
        callTree={care.callTree}
        subsystemAddress={careAddr}
        attribute={CareSubsystem.ATTR_CALLTREE}
        label="care notification list"
        description="People will be notified in this order when a care alarm is triggered. Ask everyone on the list to save the Arcus number in their contacts so they recognize the call."
        emptyMessage="No contacts configured for care notifications."
      />
    </div>
  );
}
