'use client';

import { useState, useCallback } from 'react';
import { emptyPermSet, hasAnyPermission, type PermSet } from './permissions';
import PermissionsTable from './PermissionsTable';
import { TestIdScope } from '@/lib/testIdScope';

interface CreateKeyFormProps {
  /** Creates the key. The form stays open, keeping what was entered, until it is closed. */
  onCreate: (label: string, perms: PermSet) => Promise<void>;
  onCancel: () => void;
}

/** Name and permissions for a new API key. Unmount it to clear what was entered. */
export function CreateKeyForm({ onCreate, onCancel }: CreateKeyFormProps) {
  const [label, setLabel] = useState('');
  const [perms, setPerms] = useState<PermSet>(emptyPermSet);
  const [creating, setCreating] = useState(false);

  const canCreate = !creating && label.trim() !== '' && hasAnyPermission(perms);

  const handleCreate = useCallback(async () => {
    if (!label.trim() || !hasAnyPermission(perms)) return;
    setCreating(true);
    try {
      await onCreate(label.trim(), perms);
    } finally {
      setCreating(false);
    }
  }, [label, perms, onCreate]);

  const togglePerm = useCallback((catKey: string, action: 'r' | 'w' | 'x' | '*') => {
    setPerms((prev) => {
      if (action === '*') {
        const allOn = prev[catKey].r && prev[catKey].w && prev[catKey].x;
        return { ...prev, [catKey]: { r: !allOn, w: !allOn, x: !allOn } };
      }
      return { ...prev, [catKey]: { ...prev[catKey], [action]: !prev[catKey][action] } };
    });
  }, []);

  return (
    <div className="border border-heron rounded-[var(--border-radius-base)] overflow-hidden mb-6">
      <div className="px-4 py-3 bg-pigeon/30">
        <h3 className="text-sm font-medium text-swift">Create API Key</h3>
      </div>
      <div className="px-4 py-3 space-y-4">
        <div>
          <label className="block text-sm text-grouse mb-1">Name</label>
          <input
            type="text"
            data-testid="apikey-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={64}
            placeholder="e.g. Home Assistant Integration"
            className="w-full max-w-md border border-heron rounded-[var(--border-radius-base)] px-3 py-2 text-sm text-swift focus:outline-none focus:border-peacock"
          />
        </div>
        <div>
          <label className="block text-sm text-grouse mb-2">Permissions</label>
          <TestIdScope.Provider value="apikey-new">
            <PermissionsTable perms={perms} onToggle={togglePerm} />
          </TestIdScope.Provider>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleCreate}
            data-testid="apikey-create"
            disabled={!canCreate}
            className="px-4 py-2 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90 disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Key'}
          </button>
          <button
            onClick={onCancel}
            data-testid="apikey-cancel"
            className="px-4 py-2 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
