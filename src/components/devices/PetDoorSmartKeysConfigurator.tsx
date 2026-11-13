'use client';

import { useState, useCallback, useMemo } from 'react';
import { PetDoor, PetToken } from '@arcus/core';
import { useDevice } from '@/hooks/useDeviceCapability';
import { useDeviceActions } from '@/hooks/useDeviceActions';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import {
  defaultSmartKeyName, getPairedPetDoorTokens, petTokenAttr, type PetDoorToken,
} from '@/lib/petDoor';
import { PetDoorSmartKeyRow } from './PetDoorSmartKeyRow';
import { PetDoorAddSmartKeyInstructions } from './PetDoorAddSmartKeyInstructions';

/**
 * Pet door access settings: the smart keys that open the door in Auto mode.
 * Keys can be renamed (pettoken:petName on the key's instance) or removed
 * (petdoor:RemoveToken); new keys are paired at the door.
 */
export default function PetDoorSmartKeysConfigurator({ address }: { address: string }) {
  const device = useDevice(address);
  const { setAttribute, sendCommand } = useDeviceActions(address);
  const dispatch = useAppDispatch();
  const tokens = useMemo(() => getPairedPetDoorTokens(device), [device]);
  const [showAdd, setShowAdd] = useState(false);
  const [toRemove, setToRemove] = useState<PetDoorToken | null>(null);
  const [removing, setRemoving] = useState(false);

  const handleRename = useCallback(async (token: PetDoorToken, name: string) => {
    try {
      await setAttribute(petTokenAttr(PetToken.ATTR_PETNAME, token.instance), name || defaultSmartKeyName(token.index));
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to rename the smart key' }));
    }
  }, [setAttribute, dispatch]);

  const handleConfirmRemove = useCallback((token: PetDoorToken) => setToRemove(token), []);
  const handleCancelRemove = useCallback(() => setToRemove(null), []);

  const handleRemove = useCallback(async () => {
    if (!toRemove) return;
    setRemoving(true);
    try {
      await sendCommand(PetDoor.CMD_REMOVETOKEN, { tokenId: toRemove.tokenId });
      setToRemove(null);
    } catch {
      dispatch(addNotification({ type: 'error', message: `Failed to remove ${toRemove.petName}` }));
    }
    setRemoving(false);
  }, [toRemove, sendCommand, dispatch]);

  const toggleAdd = useCallback(() => setShowAdd((v) => !v), []);

  if (!device) return null;

  return (
    <div>
      <p className="text-sm font-medium text-swift mb-2">Smart Keys</p>
      <div className="flex items-start gap-3">
        <p className="flex-1 text-xs text-grouse">
          The Smart Keys listed below have access to this door while in Auto Mode.
        </p>
        <button
          onClick={toggleAdd}
          disabled={toRemove !== null}
          aria-expanded={showAdd}
          data-testid="petdoor-add-key"
          className="px-3 py-1.5 text-sm rounded-[var(--border-radius-base)] bg-pigeon text-coot hover:bg-heron disabled:opacity-50"
        >
          + Add Smart Key
        </button>
      </div>

      {showAdd && <PetDoorAddSmartKeyInstructions />}

      {tokens.length === 0 ? (
        <p data-testid="petdoor-no-keys" className="text-sm text-grouse mt-3">
          You have not added any Smart Keys yet.
        </p>
      ) : (
        <div className="mt-2">
          {tokens.map((t) => (
            <PetDoorSmartKeyRow
              key={t.instance}
              token={t}
              removeDisabled={toRemove !== null}
              onRename={handleRename}
              onRemove={handleConfirmRemove}
            />
          ))}
        </div>
      )}

      {toRemove && (
        <div
          role="alertdialog"
          aria-label="Remove smart key"
          data-testid="petdoor-remove-confirm"
          className="mt-3 p-3 border border-cardinal/30 bg-cardinal/10 rounded-[var(--border-radius-base)]"
        >
          <p className="text-sm text-swift">Are you sure you want to remove {toRemove.petName}?</p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleCancelRemove}
              disabled={removing}
              data-testid="petdoor-remove-cancel"
              className="px-3 py-1.5 text-sm rounded-[var(--border-radius-base)] bg-pigeon text-coot hover:bg-heron disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleRemove}
              disabled={removing || toRemove.tokenId === null}
              data-testid="petdoor-remove-yes"
              className="px-3 py-1.5 text-sm rounded-[var(--border-radius-base)] bg-cardinal text-crane disabled:opacity-50"
            >
              {removing ? 'Removing...' : 'Yes, Remove'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
