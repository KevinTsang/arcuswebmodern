'use client';

import { useState, useCallback } from 'react';
import Bridge from '@arcus/core/bridge';
import { Base, Account, Place } from '@arcus/core';
import type { AddPlaceResponse } from '@/arcus/types';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { switchPlaceThunk } from '@/store/thunks/switchPlaceThunk';
import { useSidePanel } from '@/components/SidePanel';
import Field from './Field';

interface AddPlacePanelProps {
  /** The signed-in person's own account; the new place is added to it. */
  accountId: string;
  /** Called after the place is created so the places list can refresh. */
  onSaved?: () => void;
}

interface AddedPlace {
  placeId: string;
  name: string;
}

export default function AddPlacePanel({ accountId, onSaved }: AddPlacePanelProps) {
  const dispatch = useAppDispatch();
  const { closeRight } = useSidePanel();

  const [name, setName] = useState('');
  const [street1, setStreet1] = useState('');
  const [city, setCity] = useState('');
  const [stateProv, setStateProv] = useState('');
  const [zip, setZip] = useState('');
  const [saving, setSaving] = useState(false);
  const [added, setAdded] = useState<AddedPlace | null>(null);
  const [switching, setSwitching] = useState(false);

  const handleCreate = useCallback(async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const resp = await Bridge.request<AddPlaceResponse>(Account.CMD_ADDPLACE, `SERV:account:${accountId}`, {
        place: {
          [Place.ATTR_NAME]: name.trim(),
          [Place.ATTR_STREETADDRESS1]: street1.trim(),
          [Place.ATTR_CITY]: city.trim(),
          [Place.ATTR_STATEPROV]: stateProv.trim(),
          [Place.ATTR_ZIPCODE]: zip.trim(),
        },
        serviceLevel: 'BASIC',
      });
      // Adding a place doesn't change the session's active place, so the
      // active-place state is left alone; the user can switch to it below.
      setAdded({
        placeId: resp.place[Base.ATTR_ID],
        name: resp.place[Place.ATTR_NAME] ?? name.trim(),
      });
      dispatch(addNotification({ type: 'success', message: 'Place created!' }));
      onSaved?.();
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to create place.' }));
    } finally {
      setSaving(false);
    }
  }, [accountId, name, street1, city, stateProv, zip, dispatch, onSaved]);

  const handleSwitch = useCallback(async () => {
    if (!added) return;
    setSwitching(true);
    try {
      await dispatch(switchPlaceThunk(added.placeId)).unwrap();
      closeRight();
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to switch to the new place.' }));
    } finally {
      setSwitching(false);
    }
  }, [added, dispatch, closeRight]);

  if (added) {
    return (
      <div className="p-4 space-y-4">
        <h3 data-testid="add-place-panel-title" className="text-lg font-semibold text-swift">Add a Place</h3>
        <p data-testid="add-place-added" className="text-sm text-coot">
          <span className="font-medium text-swift">{added.name}</span> has been added to your account.
        </p>
        <p className="text-sm text-grouse">Switch to it now to set it up, or keep using your current place.</p>
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSwitch}
            data-testid="add-place-switch"
            disabled={switching}
            className="px-4 py-2 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90 disabled:opacity-50"
          >
            {switching ? 'Switching…' : `Switch to ${added.name}`}
          </button>
          <button
            onClick={closeRight}
            data-testid="add-place-done"
            disabled={switching}
            className="px-4 py-2 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon disabled:opacity-50"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h3 data-testid="add-place-panel-title" className="text-lg font-semibold text-swift">Add a Place</h3>
      <Field label="Place Name" value={name} onChange={setName} placeholder="e.g. Lake House" />
      <Field label="Street Address" value={street1} onChange={setStreet1} />
      <Field label="City" value={city} onChange={setCity} />
      <Field label="State" value={stateProv} onChange={setStateProv} />
      <Field label="ZIP Code" value={zip} onChange={setZip} />
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleCreate}
          data-testid="place-create"
          disabled={saving || !name.trim()}
          className="px-4 py-2 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90 disabled:opacity-50"
        >
          {saving ? 'Creating…' : 'Create Place'}
        </button>
        <button onClick={closeRight} className="px-4 py-2 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon">
          Cancel
        </button>
      </div>
    </div>
  );
}
