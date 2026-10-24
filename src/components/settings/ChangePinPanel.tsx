'use client';

import { useState, useCallback } from 'react';
import Bridge from '@arcus/core/bridge';
import { Person } from '@arcus/core';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { useSidePanel } from '@/components/SidePanel';
import ChangePinForm from '@/components/ChangePinForm';

export default function ChangePinPanel() {
  const person = useAppSelector((s) => s.auth.person);
  const placeId = useAppSelector((s) => s.place.placeId);
  const dispatch = useAppDispatch();
  const { closeRight } = useSidePanel();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = useCallback(async (pin: string) => {
    const personId = person?.personId;
    if (!personId || !placeId) return;

    setLoading(true);
    setError(null);

    try {
      await Bridge.restfulRequest(Person.CMD_CHANGEPINV2, `SERV:person:${personId}`, {
        place: placeId,
        pin,
      });
      dispatch(addNotification({ type: 'success', message: 'PIN code updated.' }));
      closeRight();
    } catch {
      setError('PIN code was unable to be changed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [person, placeId, dispatch, closeRight]);

  return (
    <div className="p-4 space-y-4">
      <h3 data-testid="pin-panel-title" className="text-lg font-semibold text-swift">Change PIN Code</h3>
      <ChangePinForm
        onSave={handleSave}
        onSkip={closeRight}
        loading={loading}
        error={error}
        description="Change the PIN code used to disarm your security alarm and unlock doors."
        saveLabel="Change PIN"
        savingLabel="Changing PIN…"
      />
    </div>
  );
}
