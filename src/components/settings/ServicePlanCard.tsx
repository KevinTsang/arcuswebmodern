'use client';

import { useCallback } from 'react';
import { useSidePanel } from '@/components/SidePanel';
import InfoCard from './InfoCard';
import InfoRow from './InfoRow';
import { addonName, planName } from './servicePlans';
import { useServicePlan } from './useServicePlan';
import { ServicePlanPanel } from './ServicePlanPanel';

/** Profile card showing the active place's service plan, with a Change action for the account owner. */
export function ServicePlanCard() {
  const { level, addons, placeAddress, canManage } = useServicePlan();
  const { openRight } = useSidePanel();

  const openPanel = useCallback(() => {
    openRight(<ServicePlanPanel />, { title: 'Change Service Plan', key: 'service-plan' });
  }, [openRight]);

  return (
    <InfoCard
      title="Service Plan"
      action={
        canManage ? (
          <button data-testid="service-plan-change" onClick={openPanel} className="text-sm text-peacock hover:underline">
            Change
          </button>
        ) : undefined
      }
    >
      <InfoRow label="Current Plan" value={placeAddress ? planName(level) : '—'} />
      {addons.length > 0 && <InfoRow label="Add-ons" value={addons.map(addonName).join(', ')} />}
      {placeAddress && !canManage && (
        <p data-testid="service-plan-owner-only" className="text-xs text-grouse">
          Only the account owner can change this place&apos;s service plan.
        </p>
      )}
    </InfoCard>
  );
}
