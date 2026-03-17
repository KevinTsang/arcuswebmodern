'use client';

import { useState, useCallback } from 'react';
import Bridge from '@arcus/core/bridge';
import { Base, Account, Place } from '@arcus/core';
import type { AddPlaceResponse } from '@/arcus/types';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { setPlace } from '@/store/slices/placeSlice';
import { useSidePanel } from '@/components/SidePanel';
import Field from './Field';

export default function AddPlacePanel() {
  const account = useAppSelector((s) => s.auth.account);
  const dispatch = useAppDispatch();
  const { closeRight } = useSidePanel();

  const [name, setName] = useState('');
  const [street1, setStreet1] = useState('');
  const [city, setCity] = useState('');
  const [stateProv, setStateProv] = useState('');
  const [zip, setZip] = useState('');
  const [saving, setSaving] = useState(false);

  const accountAddress = account?.[Base.ATTR_ADDRESS] ?? '';

  const handleCreate = useCallback(async () => {
    if (!accountAddress || !name.trim()) return;
    setSaving(true);
    try {
      const resp = await Bridge.request<AddPlaceResponse>(Account.CMD_ADDPLACE, accountAddress, {
        place: {
          [Place.ATTR_NAME]: name.trim(),
          [Place.ATTR_STREETADDRESS1]: street1.trim(),
          [Place.ATTR_CITY]: city.trim(),
          [Place.ATTR_STATEPROV]: stateProv.trim(),
          [Place.ATTR_ZIPCODE]: zip.trim(),
        },
        serviceLevel: 'BASIC',
      });
      dispatch(setPlace(resp.place));
      dispatch(addNotification({ type: 'success', message: 'Place created!' }));
      closeRight();
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to create place.' }));
    } finally {
      setSaving(false);
    }
  }, [accountAddress, name, street1, city, stateProv, zip, dispatch, closeRight]);

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-semibold text-swift">Add a Place</h3>
      <Field label="Place Name" value={name} onChange={setName} placeholder="e.g. Lake House" />
      <Field label="Street Address" value={street1} onChange={setStreet1} />
      <Field label="City" value={city} onChange={setCity} />
      <Field label="State" value={stateProv} onChange={setStateProv} />
      <Field label="ZIP Code" value={zip} onChange={setZip} />
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleCreate}
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
