'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import Bridge from '@arcus/core/bridge';
import { Account, Base, Place } from '@arcus/core';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { updatePlace } from '@/store/slices/placeSlice';
import { useSidePanel } from '@/components/SidePanel';
import { SELECTABLE_PLANS, isPromonLevel, planName } from './servicePlans';
import type { SelectablePlan } from './servicePlans';
import { useServicePlan } from './useServicePlan';
import { ServicePlanOption } from './ServicePlanOption';
import { ServicePlanDowngradeWarning } from './ServicePlanDowngradeWarning';

/** `account:UpdateServicePlan` arguments. */
interface UpdateServicePlanRequest {
  placeID: string;
  serviceLevel: string;
  /** Add-on name → active. Sent so a plan change keeps the place's add-ons. */
  addons: Record<string, boolean>;
}

/**
 * Side panel where the account owner moves the active place between plans
 * with `account:UpdateServicePlan`. Pro Monitoring is reached through its
 * enrollment wizard, so it's linked rather than offered here.
 */
export function ServicePlanPanel() {
  const { placeId, placeAddress, level, addons, accountAddress, canManage } = useServicePlan();
  const dispatch = useAppDispatch();
  const { closeRight } = useSidePanel();

  // null = keep the current plan. Tracking only the pick (not a copy of the
  // level) keeps the panel right if the plan changes while it's open.
  const [picked, setPicked] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selected = picked ?? level;
  const changed = !!selected && selected !== level;

  const handleSave = useCallback(async () => {
    if (!placeId || !placeAddress || !accountAddress || !selected || selected === level) return;
    const request: UpdateServicePlanRequest = {
      placeID: placeId,
      serviceLevel: selected,
      addons: Object.fromEntries(addons.map((addon) => [addon, true])),
    };
    setSaving(true);
    try {
      await Bridge.request(Account.CMD_UPDATESERVICEPLAN, accountAddress, request);
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Unable to change your service plan. Please try again.' }));
      setSaving(false);
      return;
    }
    // The platform broadcasts the place's new level too; apply it now so the
    // Profile card doesn't wait on that event.
    dispatch(updatePlace({ [Base.ATTR_ADDRESS]: placeAddress, [Place.ATTR_SERVICELEVEL]: selected }));
    dispatch(addNotification({ type: 'success', message: `Your service plan is now ${planName(selected)}.` }));
    setSaving(false);
    closeRight();
  }, [placeId, placeAddress, accountAddress, selected, level, addons, dispatch, closeRight]);

  if (!placeAddress) {
    return <p data-testid="service-plan-loading" className="p-4 text-sm text-grouse">Loading your place…</p>;
  }

  if (!canManage || !level) {
    return (
      <p data-testid="service-plan-not-owner" className="p-4 text-sm text-grouse">
        Only the account owner can change this place&apos;s service plan.
      </p>
    );
  }

  // Keep today's plan in the list when it isn't one of the pickable ones
  // (Pro Monitoring, an annual or a free plan), so it can stay selected.
  const options: readonly SelectablePlan[] = SELECTABLE_PLANS.some((p) => p.level === level)
    ? SELECTABLE_PLANS
    : [{ level, name: planName(level), summary: 'Your current plan.' }, ...SELECTABLE_PLANS];

  return (
    <div className="p-4 space-y-4">
      <p className="text-sm text-coot">
        Current plan: <span data-testid="service-plan-panel-current" className="font-medium text-swift">{planName(level)}</span>
      </p>

      <fieldset className="space-y-2" disabled={saving}>
        <legend className="text-sm text-grouse mb-2">Choose a plan</legend>
        {options.map((plan) => (
          <ServicePlanOption
            key={plan.level}
            level={plan.level}
            name={plan.name}
            summary={plan.summary}
            checked={plan.level === selected}
            current={plan.level === level}
            disabled={saving}
            onSelect={setPicked}
          />
        ))}
      </fieldset>

      {changed && <ServicePlanDowngradeWarning from={level} to={selected} />}

      {!isPromonLevel(level) && (
        <p data-testid="service-plan-promon" className="text-xs text-grouse">
          Want 24/7 professional monitoring?{' '}
          <Link href="/promonitoring" onClick={closeRight} className="text-peacock hover:underline">
            Set up Pro Monitoring
          </Link>
        </p>
      )}

      <div className="flex gap-2">
        <button
          data-testid="service-plan-save"
          onClick={handleSave}
          disabled={!changed || saving}
          className="px-4 py-2 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Change Plan'}
        </button>
        <button
          onClick={closeRight}
          className="px-4 py-2 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
