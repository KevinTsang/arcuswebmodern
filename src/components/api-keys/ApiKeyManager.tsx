'use client';

import { useState, useCallback, useEffect } from 'react';
import { ApiKeyService } from '@arcus/core/services';
import type { ApiKeyMeta } from '@arcus/core/services/ApiKeyService';
import { emptyPermSet, permSetToStrings, hasAnyPermission, type PermSet } from './permissions';
import PermissionsTable from './PermissionsTable';
import KeyCard from './KeyCard';
import { TestIdScope } from '@/lib/testIdScope';

interface ApiKeyManagerProps {
  /** The place whose keys are listed and changed — not necessarily the active place. */
  placeId: string;
  /** Its display name, used in the revoke and delete confirms. */
  placeName: string;
}

/**
 * Key list, create form and one-time token banner for one place. Render it
 * with `key={placeId}` so a different place starts from a clean state and
 * responses for the previous place land on an unmounted instance.
 */
export function ApiKeyManager({ placeId, placeName }: ApiKeyManagerProps) {
  const [keys, setKeys] = useState<ApiKeyMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [label, setLabel] = useState('');
  const [createPerms, setCreatePerms] = useState<PermSet>(emptyPermSet);
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await ApiKeyService.ListKeys(placeId);
      setKeys((resp.keys as ApiKeyMeta[]) ?? []);
    } catch {
      setError('Failed to load API keys.');
    } finally {
      setLoading(false);
    }
  }, [placeId]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCreate = useCallback(async () => {
    if (!label.trim() || !hasAnyPermission(createPerms)) return;
    setCreating(true);
    setError('');
    try {
      const perms = permSetToStrings(createPerms);
      const resp = await ApiKeyService.Create(placeId, label.trim(), perms);
      setCreatedKey(resp.key as string);
      setLabel('');
      setCreatePerms(emptyPermSet());
      setShowCreate(false);
      await fetchKeys();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to create API key.');
    } finally {
      setCreating(false);
    }
  }, [placeId, label, createPerms, fetchKeys]);

  const handleRevoke = useCallback(async (key: ApiKeyMeta) => {
    if (!window.confirm(`Revoke the API key "${key.label}" for ${placeName}? This will immediately disable it.`)) return;
    try {
      await ApiKeyService.Revoke(placeId, key.id);
      await fetchKeys();
    } catch {
      setError('Failed to revoke API key.');
    }
  }, [placeId, placeName, fetchKeys]);

  const handleDelete = useCallback(async (key: ApiKeyMeta) => {
    if (!window.confirm(`Permanently delete the revoked API key "${key.label}" for ${placeName}?`)) return;
    try {
      await ApiKeyService.Delete(placeId, key.id);
      await fetchKeys();
    } catch {
      setError('Failed to delete API key.');
    }
  }, [placeId, placeName, fetchKeys]);

  const handleCopy = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const toggleCreatePerm = useCallback((catKey: string, action: 'r' | 'w' | 'x' | '*') => {
    setCreatePerms((prev) => {
      if (action === '*') {
        const allOn = prev[catKey].r && prev[catKey].w && prev[catKey].x;
        return { ...prev, [catKey]: { r: !allOn, w: !allOn, x: !allOn } };
      }
      return { ...prev, [catKey]: { ...prev[catKey], [action]: !prev[catKey][action] } };
    });
  }, []);

  const resetCreate = useCallback(() => {
    setShowCreate(false);
    setLabel('');
    setCreatePerms(emptyPermSet());
  }, []);

  return (
    <>
      {error && (
        <div data-testid="apikey-error" className="mb-4 text-sm text-cardinal bg-cardinal/5 border border-cardinal/20 rounded-[var(--border-radius-base)] px-4 py-2">
          {error}
        </div>
      )}

      {/* Created key banner */}
      {createdKey && (
        <div data-testid="apikey-created" className="mb-4 bg-honeycreeper/5 border border-honeycreeper/20 rounded-[var(--border-radius-base)] px-4 py-3">
          <p className="text-sm font-medium text-swift mb-1">
            API key created. Copy it now — it will not be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code data-testid="apikey-token" className="flex-1 text-sm bg-pigeon/30 px-3 py-1.5 rounded font-mono break-all">
              {createdKey}
            </code>
            <button
              onClick={() => handleCopy(createdKey)}
              data-testid="apikey-copy"
              className="px-3 py-1.5 text-sm bg-peacock text-crane rounded-[var(--border-radius-base)] hover:bg-peacock/90 flex-shrink-0"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <button
            onClick={() => setCreatedKey(null)}
            data-testid="apikey-dismiss"
            className="mt-2 text-xs text-grouse hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
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
                <PermissionsTable perms={createPerms} onToggle={toggleCreatePerm} />
              </TestIdScope.Provider>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleCreate}
                data-testid="apikey-create"
                disabled={creating || !label.trim() || !hasAnyPermission(createPerms)}
                className="px-4 py-2 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Key'}
              </button>
              <button
                onClick={resetCreate}
                data-testid="apikey-cancel"
                className="px-4 py-2 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keys list */}
      <div className="border border-heron rounded-[var(--border-radius-base)] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-pigeon/30">
          <h3 className="text-sm font-medium text-swift">API Keys</h3>
          {!showCreate && (
            <button
              onClick={() => setShowCreate(true)}
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
                <KeyCard key={k.id} apiKey={k} onRevoke={handleRevoke} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
