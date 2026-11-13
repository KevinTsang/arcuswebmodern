'use client';

import { useState, useCallback } from 'react';
import type { PetDoorToken } from '@/lib/petDoor';

interface PetDoorSmartKeyRowProps {
  token: PetDoorToken;
  /** Disables Remove while another key's removal is being confirmed. */
  removeDisabled: boolean;
  onRename: (token: PetDoorToken, name: string) => void;
  onRemove: (token: PetDoorToken) => void;
}

/** One paired smart key: an editable pet name, saved on blur or Enter, and Remove. */
export function PetDoorSmartKeyRow({ token, removeDisabled, onRename, onRemove }: PetDoorSmartKeyRowProps) {
  const [name, setName] = useState(token.petName);
  const [savedName, setSavedName] = useState(token.petName);
  // Pick up a name changed elsewhere (or reverted after a failed save)
  if (token.petName !== savedName) {
    setSavedName(token.petName);
    setName(token.petName);
  }

  const inputId = `petdoor-key-name-${token.instance}`;

  const commit = useCallback(() => {
    const trimmed = name.trim();
    if (trimmed === token.petName) return;
    // An empty name is passed through; the parent saves the slot's default
    onRename(token, trimmed);
  }, [name, token, onRename]);

  const handleRemove = useCallback(() => onRemove(token), [token, onRemove]);

  return (
    <div data-testid={`petdoor-key-${token.instance}`} className="flex items-end gap-3 py-2 border-b border-heron">
      <div className="flex-1 min-w-0">
        <label htmlFor={inputId} className="block text-xs text-grouse mb-1">Name</label>
        <input
          id={inputId}
          type="text"
          value={name}
          maxLength={64}
          onChange={(e) => setName(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') setName(token.petName);
          }}
          className="w-full text-sm text-swift bg-transparent border-b border-heron focus:border-peacock focus:outline-none"
        />
      </div>
      <button
        onClick={handleRemove}
        disabled={removeDisabled}
        data-testid={`petdoor-key-remove-${token.instance}`}
        className="px-3 py-1.5 text-sm rounded-[var(--border-radius-base)] bg-pigeon text-coot hover:bg-heron disabled:opacity-50"
      >
        Remove
      </button>
    </div>
  );
}
