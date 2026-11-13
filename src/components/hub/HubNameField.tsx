'use client';

/**
 * HubNameField — renames the hub (hub:name), as legacy's hub panel name field.
 */

import { useState, useCallback, type FormEvent } from 'react';
import Bridge from '@arcus/core/bridge';
import { Base, Hub } from '@arcus/core';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';

/** Legacy's character limit for the hub name. */
export const HUB_NAME_MAX_LENGTH = 254;

interface HubNameFieldProps {
  address: string;
  name: string;
}

export function HubNameField({ address, name }: HubNameFieldProps) {
  const dispatch = useAppDispatch();
  const [value, setValue] = useState(name);
  const [saving, setSaving] = useState(false);

  const trimmed = value.trim();
  const changed = trimmed !== '' && trimmed !== name;

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!changed) return;
    setSaving(true);
    try {
      await Bridge.request(Base.CMD_SETATTRIBUTES, address, { [Hub.ATTR_NAME]: trimmed });
      setValue(trimmed);
      dispatch(addNotification({ type: 'success', message: 'Hub name saved.' }));
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to rename the hub.' }));
    } finally {
      setSaving(false);
    }
  }, [address, changed, trimmed, dispatch]);

  return (
    <form onSubmit={handleSubmit} data-testid="hub-name-form" className="space-y-2">
      <label htmlFor="hub-name-input" className="block text-sm font-medium text-swift">
        Hub Name
      </label>
      <div className="flex gap-2">
        <input
          id="hub-name-input"
          data-testid="hub-name-input"
          type="text"
          value={value}
          maxLength={HUB_NAME_MAX_LENGTH}
          placeholder="Hub Name"
          onChange={(e) => setValue(e.target.value)}
          disabled={saving}
          className="flex-1 min-w-0 px-3 py-2 text-sm text-swift bg-crane border border-heron rounded-[var(--border-radius-base)] focus:outline-none focus:border-peacock"
        />
        <button
          type="submit"
          data-testid="hub-name-save"
          disabled={!changed || saving}
          className="px-4 py-2 text-sm bg-peacock text-crane rounded-[var(--border-radius-base)] hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}
