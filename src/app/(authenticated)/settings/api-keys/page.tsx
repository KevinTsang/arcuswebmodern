'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useAppSelector } from '@/store/hooks';
import { ApiKeyService } from '@arcus/core/services';
import type { ApiKeyMeta } from '@arcus/core/services/ApiKeyService';
import { emptyPermSet, permSetToStrings, hasAnyPermission, type PermSet } from '@/components/api-keys/permissions';
import PermissionsTable from '@/components/api-keys/PermissionsTable';
import KeyCard from '@/components/api-keys/KeyCard';

export default function ApiKeysPage() {
  const placeId = useAppSelector((s) => s.place.placeId);
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
    if (!placeId) return;
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
    if (!placeId || !label.trim() || !hasAnyPermission(createPerms)) return;
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

  const handleRevoke = useCallback(async (id: string) => {
    if (!placeId) return;
    if (!window.confirm('Revoke this API key? This will immediately disable it.')) return;
    try {
      await ApiKeyService.Revoke(placeId, id);
      await fetchKeys();
    } catch {
      setError('Failed to revoke API key.');
    }
  }, [placeId, fetchKeys]);

  const handleDelete = useCallback(async (id: string) => {
    if (!placeId) return;
    if (!window.confirm('Permanently delete this revoked API key?')) return;
    try {
      await ApiKeyService.Delete(placeId, id);
      await fetchKeys();
    } catch {
      setError('Failed to delete API key.');
    }
  }, [placeId, fetchKeys]);

  const handleCopy = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const toggleCreatePerm = (catKey: string, action: 'r' | 'w' | 'x' | '*') => {
    setCreatePerms((prev) => {
      if (action === '*') {
        const allOn = prev[catKey].r && prev[catKey].w && prev[catKey].x;
        return { ...prev, [catKey]: { r: !allOn, w: !allOn, x: !allOn } };
      }
      return { ...prev, [catKey]: { ...prev[catKey], [action]: !prev[catKey][action] } };
    });
  };

  const resetCreate = () => {
    setShowCreate(false);
    setLabel('');
    setCreatePerms(emptyPermSet());
  };

  return (
    <div className="p-[var(--gutter)]">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/settings"
          className="text-peacock hover:underline text-sm"
        >
          Settings
        </Link>
        <span className="text-grouse text-sm">/</span>
        <h2 className="text-[length:var(--font-size-h2)] font-[var(--heading-font-weight)] text-swift">
          API Keys
        </h2>
      </div>

      {error && (
        <div className="mb-4 text-sm text-cardinal bg-cardinal/5 border border-cardinal/20 rounded-[var(--border-radius-base)] px-4 py-2">
          {error}
        </div>
      )}

      {/* Created key banner */}
      {createdKey && (
        <div className="mb-4 bg-honeycreeper/5 border border-honeycreeper/20 rounded-[var(--border-radius-base)] px-4 py-3">
          <p className="text-sm font-medium text-swift mb-1">
            API key created. Copy it now — it will not be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm bg-pigeon/30 px-3 py-1.5 rounded font-mono break-all">
              {createdKey}
            </code>
            <button
              onClick={() => handleCopy(createdKey)}
              className="px-3 py-1.5 text-sm bg-peacock text-crane rounded-[var(--border-radius-base)] hover:bg-peacock/90 flex-shrink-0"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <button
            onClick={() => setCreatedKey(null)}
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
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                maxLength={64}
                placeholder="e.g. Home Assistant Integration"
                className="w-full max-w-md border border-heron rounded-[var(--border-radius-base)] px-3 py-2 text-sm text-swift focus:outline-none focus:border-peacock"
              />
            </div>
            <div>
              <label className="block text-sm text-grouse mb-2">Permissions</label>
              <PermissionsTable perms={createPerms} onToggle={toggleCreatePerm} />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleCreate}
                disabled={creating || !label.trim() || !hasAnyPermission(createPerms)}
                className="px-4 py-2 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Key'}
              </button>
              <button
                onClick={resetCreate}
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
            <p className="text-sm text-grouse">No API keys created yet.</p>
          ) : (
            <div className="space-y-4">
              {keys.map((k) => (
                <KeyCard
                  key={k.id}
                  apiKey={k}
                  onRevoke={() => handleRevoke(k.id)}
                  onDelete={() => handleDelete(k.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
