import { useCallback, useEffect, useState } from 'react';
import Bridge from '@arcus/core/bridge';
import { Base, CareSubsystem } from '@arcus/core';
import { useCareSubsystem } from './useCareSubsystem';
import {
  transformTemplate,
  type CareTemplate,
  type ListBehaviorsResponse,
  type ListBehaviorTemplatesResponse,
} from '@/lib/careBehaviors';
import type { CareBehavior } from '@/store/entityTypes';

export interface CareBehaviorsState {
  /** Care subsystem address, once the subsystem has loaded. */
  address: string | undefined;
  behaviors: CareBehavior[];
  templates: CareTemplate[];
  loading: boolean;
  /** True when the last ListBehaviors request failed. */
  error: boolean;
  /** Re-fetch the behavior list (e.g. after a save or delete). */
  reload: () => Promise<void>;
}

/**
 * Loads the place's care behaviors (`subcare:ListBehaviors`) and behavior
 * templates (`subcare:ListBehaviorTemplates`). Behaviors reload when the
 * subsystem's behavior list changes; templates reload when the set of
 * care-capable devices changes, since that decides which templates are usable.
 */
export function useCareBehaviors(): CareBehaviorsState {
  const care = useCareSubsystem();
  const address = care.subsystem?.[Base.ATTR_ADDRESS] as string | undefined;
  const behaviorIds = care.subsystem?.[CareSubsystem.ATTR_BEHAVIORS];
  const capableDevices = care.subsystem?.[CareSubsystem.ATTR_CARECAPABLEDEVICES];

  const [behaviors, setBehaviors] = useState<CareBehavior[]>([]);
  const [templates, setTemplates] = useState<CareTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const applyResult = useCallback((res: ListBehaviorsResponse | null) => {
    if (res) setBehaviors(res.behaviors ?? []);
    setError(!res);
    setLoading(false);
  }, []);

  const requestBehaviors = useCallback(
    (): Promise<ListBehaviorsResponse | null> =>
      address
        ? Bridge.request<ListBehaviorsResponse>(CareSubsystem.CMD_LISTBEHAVIORS, address, {}).catch(() => null)
        : Promise.resolve(null),
    [address],
  );

  const reload = useCallback(async (): Promise<void> => {
    if (!address) return;
    applyResult(await requestBehaviors());
  }, [address, requestBehaviors, applyResult]);

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    requestBehaviors().then((res) => {
      if (!cancelled) applyResult(res);
    });
    return () => {
      cancelled = true;
    };
  }, [address, requestBehaviors, applyResult, behaviorIds]);

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    Bridge.request<ListBehaviorTemplatesResponse>(CareSubsystem.CMD_LISTBEHAVIORTEMPLATES, address, {})
      .then((res) => {
        if (!cancelled) setTemplates((res?.behaviorTemplates ?? []).map(transformTemplate));
      })
      .catch(() => {
        if (!cancelled) setTemplates([]);
      });
    return () => {
      cancelled = true;
    };
  }, [address, capableDevices]);

  return { address, behaviors, templates, loading, error, reload };
}
