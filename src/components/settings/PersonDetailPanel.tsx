'use client';

import { useState, useCallback } from 'react';
import Bridge from '@arcus/core/bridge';
import { Base, Person as PersonCap } from '@arcus/core';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { useSidePanel } from '@/components/SidePanel';
import type { PersonData } from '@/store/entityTypes';
import InfoRow from './InfoRow';

interface PersonDetailPanelProps {
  person: PersonData;
  placeId: string;
  onRemoved?: () => void;
}

export default function PersonDetailPanel({ person, placeId, onRemoved }: PersonDetailPanelProps) {
  const dispatch = useAppDispatch();
  const { closeRight } = useSidePanel();
  const [removing, setRemoving] = useState(false);

  const name =
    `${person[PersonCap.ATTR_FIRSTNAME] ?? ''} ${person[PersonCap.ATTR_LASTNAME] ?? ''}`.trim();
  const email = person[PersonCap.ATTR_EMAIL] ?? '';
  const phone = person[PersonCap.ATTR_MOBILENUMBER] ?? '';

  const handleRemove = useCallback(async () => {
    if (!window.confirm('Remove this person from the place?')) return;
    setRemoving(true);
    try {
      await Bridge.request(PersonCap.CMD_REMOVEFROMPLACE, person[Base.ATTR_ADDRESS], {
        placeId,
      });
      dispatch(addNotification({ type: 'success', message: 'Person removed.' }));
      onRemoved?.();
      closeRight();
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to remove person.' }));
    } finally {
      setRemoving(false);
    }
  }, [person, placeId, dispatch, closeRight, onRemoved]);

  return (
    <div className="p-4 space-y-4">
      <h3 data-testid="person-panel-title" className="text-lg font-semibold text-swift">{name || email || 'Person'}</h3>
      <InfoRow label="Name" value={name || '—'} />
      <InfoRow label="Email" value={email || '—'} />
      <InfoRow label="Phone" value={phone || '—'} />
      <div className="border-t border-heron pt-4">
        <button
          onClick={handleRemove}
          data-testid="person-remove"
          disabled={removing}
          className="text-sm text-cardinal hover:underline"
        >
          {removing ? 'Removing…' : 'Remove from Place'}
        </button>
      </div>
      <button onClick={closeRight} className="px-4 py-2 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon">
        Close
      </button>
    </div>
  );
}
