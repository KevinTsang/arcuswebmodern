'use client';

import type { ApiKeyMeta } from '@arcus/core/services/ApiKeyService';
import KeyCard from './KeyCard';

interface KeyListProps {
  keys: ApiKeyMeta[];
  loading: boolean;
  /** Whether to offer New Key; hidden while the create form is open. */
  showNewKey: boolean;
  onNewKey: () => void;
  onRevoke: (key: ApiKeyMeta) => void;
  onDelete: (key: ApiKeyMeta) => void;
}

/** A place's API keys, with a New Key action. */
export function KeyList({ keys, loading, showNewKey, onNewKey, onRevoke, onDelete }: KeyListProps) {
  return (
    <div className="border border-heron rounded-[var(--border-radius-base)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-pigeon/30">
        <h3 className="text-sm font-medium text-swift">API Keys</h3>
        {showNewKey && (
          <button
            onClick={onNewKey}
            data-testid="apikey-new"
            className="text-sm text-peacock hover:underline"
          >
            New Key
          </button>
        )}
      </div>
      <div className="px-4 py-3">
        {loading ? (
          <p className="text-sm text-grouse">Loading...</p>
        ) : keys.length === 0 ? (
          <p data-testid="apikeys-empty" className="text-sm text-grouse">No API keys created yet.</p>
        ) : (
          <div className="space-y-4">
            {keys.map((k) => (
              <KeyCard key={k.id} apiKey={k} onRevoke={onRevoke} onDelete={onDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
