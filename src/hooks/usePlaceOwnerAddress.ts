'use client';

/**
 * usePlaceOwnerAddress — the address of the active place's owner.
 *
 * People in the store don't carry their place role, so this asks the platform
 * with `place:ListPersonsWithAccess`, as the legacy client did. It returns
 * `undefined` while loading, if the lookup fails, or if no owner is listed.
 */

import { useEffect, useState } from 'react';
import { Base, Place } from '@arcus/core';
import Bridge from '@arcus/core/bridge';
import { useAppSelector } from '@/store/hooks';

const OWNER_ROLE = 'OWNER';

/** One entry of `place:ListPersonsWithAccess` (arcusplatform `PersonAccessDescriptor`). */
interface PersonAccessDescriptor {
  person?: { [Base.ATTR_ADDRESS]?: string };
  role?: string;
}

interface ListPersonsWithAccessResponse {
  persons?: PersonAccessDescriptor[];
}

export function usePlaceOwnerAddress(): string | undefined {
  const placeAddress = useAppSelector((state) => state.place?.place?.[Base.ATTR_ADDRESS] as string | undefined);
  const [owner, setOwner] = useState<{ place: string; address: string | undefined }>();

  useEffect(() => {
    if (!placeAddress) return;
    let cancelled = false;
    Bridge.request<ListPersonsWithAccessResponse>(Place.CMD_LISTPERSONSWITHACCESS, placeAddress, {})
      .then((res) => {
        const entry = res.persons?.find((p) => p.role === OWNER_ROLE);
        if (!cancelled) setOwner({ place: placeAddress, address: entry?.person?.[Base.ATTR_ADDRESS] });
      })
      .catch(() => {
        // Without the owner the list just doesn't lock anyone; the platform still applies its rules.
        if (!cancelled) setOwner({ place: placeAddress, address: undefined });
      });
    return () => {
      cancelled = true;
    };
  }, [placeAddress]);

  return owner?.place === placeAddress ? owner?.address : undefined;
}
