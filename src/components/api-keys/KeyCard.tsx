'use client';

import { useState } from 'react';
import type { ApiKeyMeta } from '@arcus/core/services/ApiKeyService';
import { stringsToPermSet } from './permissions';
import PermissionsTable from './PermissionsTable';
import { TestIdScope } from '@/lib/testIdScope';

export default function KeyCard({
  apiKey: k,
  onRevoke,
  onDelete,
}: {
  apiKey: ApiKeyMeta;
  onRevoke: (apiKey: ApiKeyMeta) => void;
  onDelete: (apiKey: ApiKeyMeta) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const permSet = stringsToPermSet(k.permissions);

  return (
    <div data-testid={`apikey-${k.id}`} data-expired={k.expired} className={`border rounded-[var(--border-radius-base)] ${k.expired ? 'border-heron bg-pigeon/20 opacity-60' : 'border-heron'}`}>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-sm font-medium text-swift hover:underline text-left"
            >
              {k.label}
            </button>
            {k.expired && (
              <span className="text-xs bg-cardinal/10 text-cardinal px-1.5 py-0.5 rounded">
                Revoked
              </span>
            )}
          </div>
          <div className="flex gap-4 mt-0.5 text-xs text-grouse">
            <span data-testid={`apikey-prefix-${k.id}`} className="font-mono">{k.keyPrefix}...</span>
            <span>Created: {k.created ? new Date(k.created).toLocaleDateString() : '—'}</span>
            <span>Last used: {k.lastUsed ? new Date(k.lastUsed).toLocaleDateString() : 'Never'}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => setExpanded(!expanded)}
            data-testid={`apikey-permissions-toggle-${k.id}`}
            className="text-xs text-peacock hover:underline"
          >
            {expanded ? 'Hide' : 'Permissions'}
          </button>
          {!k.expired ? (
            <button onClick={() => onRevoke(k)} data-testid={`apikey-revoke-${k.id}`} className="text-xs text-cardinal hover:underline">
              Revoke
            </button>
          ) : (
            <button onClick={() => onDelete(k)} data-testid={`apikey-delete-${k.id}`} className="text-xs text-cardinal hover:underline">
              Delete
            </button>
          )}
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-3 border-t border-heron/50 pt-2">
          <TestIdScope.Provider value={`apikey-${k.id}`}>
            <PermissionsTable perms={permSet} />
          </TestIdScope.Provider>
        </div>
      )}
    </div>
  );
}
