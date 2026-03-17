'use client';

import { useState, useCallback } from 'react';
import Bridge from '@arcus/core/bridge';
import { Base, Place } from '@arcus/core';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setPlace } from '@/store/slices/placeSlice';
import { addNotification } from '@/store/slices/uiSlice';
import { useSidePanel } from '@/components/SidePanel';
import Field from './Field';
import { type PlaceData } from './types';

interface PlaceInfoPanelProps {
  placeData: PlaceData;
  onSaved?: () => void;
}

export default function PlaceInfoPanel({ placeData, onSaved }: PlaceInfoPanelProps) {
  const dispatch = useAppDispatch();
  const { closeRight } = useSidePanel();
  const activePlaceId = useAppSelector((s) => s.place.placeId);

  const isActivePlace = placeData[Base.ATTR_ID] === activePlaceId;

  const [name, setName] = useState(placeData[Place.ATTR_NAME] ?? '');
  const [street1, setStreet1] = useState(placeData[Place.ATTR_STREETADDRESS1] ?? '');
  const [street2, setStreet2] = useState(placeData[Place.ATTR_STREETADDRESS2] ?? '');
  const [city, setCity] = useState(placeData[Place.ATTR_CITY] ?? '');
  const [stateProv, setStateProv] = useState(placeData[Place.ATTR_STATEPROV] ?? '');
  const [zip, setZip] = useState(placeData[Place.ATTR_ZIPCODE] ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    const address = placeData[Base.ATTR_ADDRESS];
    if (!address) return;
    setSaving(true);
    try {
      const attrs = {
        [Place.ATTR_NAME]: name,
        [Place.ATTR_STREETADDRESS1]: street1,
        [Place.ATTR_STREETADDRESS2]: street2,
        [Place.ATTR_CITY]: city,
        [Place.ATTR_STATEPROV]: stateProv,
        [Place.ATTR_ZIPCODE]: zip,
      };
      await Bridge.request(Base.CMD_SETATTRIBUTES, address, attrs);

      // Update Redux if this is the active place
      if (isActivePlace) {
        dispatch(setPlace({ ...placeData, ...attrs }));
      }

      dispatch(addNotification({ type: 'success', message: 'Place info updated.' }));
      onSaved?.();
      closeRight();
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to update place info.' }));
    } finally {
      setSaving(false);
    }
  }, [placeData, name, street1, street2, city, stateProv, zip, isActivePlace, dispatch, closeRight, onSaved]);

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-semibold text-swift">Edit Place</h3>
      <Field label="Place Name" value={name} onChange={setName} />
      <Field label="Street Address" value={street1} onChange={setStreet1} />
      <Field label="Street Address 2" value={street2} onChange={setStreet2} />
      <Field label="City" value={city} onChange={setCity} />
      <Field label="State" value={stateProv} onChange={setStateProv} />
      <Field label="ZIP Code" value={zip} onChange={setZip} />
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={closeRight} className="px-4 py-2 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon">
          Cancel
        </button>
      </div>
    </div>
  );
}
