'use client';

import { Account, Base, Place } from '@arcus/core';
import { useAppSelector } from '@/store/hooks';

export interface ServicePlanState {
  /** `base:address` of the active place; undefined until it has loaded. */
  placeAddress: string | undefined;
  /** `base:id` of the active place. */
  placeId: string | undefined;
  /** The active place's `place:serviceLevel`. */
  level: string | undefined;
  /** The active place's `place:serviceAddons`. */
  addons: string[];
  /** Address of the account that owns the active place, when it's the loaded account. */
  accountAddress: string | undefined;
  /**
   * The signed-in person owns the account the active place belongs to. The
   * platform only lets the account owner change a place's plan.
   */
  canManage: boolean;
}

const NO_ADDONS: string[] = [];

/** The active place's service plan, and whether the signed-in person may change it. */
export function useServicePlan(): ServicePlanState {
  const personId = useAppSelector((s) => s.auth.person?.personId);
  const account = useAppSelector((s) => s.auth.account);
  const place = useAppSelector((s) => s.place.place);

  const placeAccountId = place?.[Place.ATTR_ACCOUNT];
  const loadedAccountAddress = account?.[Base.ATTR_ADDRESS];
  // auth.account follows the active place, but only once its fetch succeeds:
  // make sure it's this place's account before acting on it.
  const accountAddress =
    placeAccountId && loadedAccountAddress === `SERV:account:${placeAccountId}` ? loadedAccountAddress : undefined;
  const canManage = !!accountAddress && !!personId && account?.[Account.ATTR_OWNER] === personId;

  return {
    placeAddress: place?.[Base.ATTR_ADDRESS],
    placeId: place?.[Base.ATTR_ID],
    level: place?.[Place.ATTR_SERVICELEVEL],
    addons: place?.[Place.ATTR_SERVICEADDONS] ?? NO_ADDONS,
    accountAddress,
    canManage,
  };
}
