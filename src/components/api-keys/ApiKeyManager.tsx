'use client';

import { useState, useCallback, useEffect } from 'react';
import { ApiKeyService } from '@arcus/core/services';
import type { ApiKeyMeta } from '@arcus/core/services/ApiKeyService';
import { permSetToStrings, type PermSet } from './permissions';
import { CreatedKeyBanner } from './CreatedKeyBanner';
import { CreateKeyForm } from './CreateKeyForm';
import { KeyList } from './KeyList';

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
 *
 * This component holds the state the pieces share (the keys, the error, and
 * which piece is showing). The create form keeps its own fields, and the
 * banner its own Copy state.
 */
export function ApiKeyManager({ placeId, placeName }: ApiKeyManagerProps) {
  const [keys, setKeys] = useState<ApiKeyMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

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

  const handleCreate = useCallback(async (label: string, perms: PermSet) => {
    setError('');
    try {
      const resp = await ApiKeyService.Create(placeId, label, permSetToStrings(perms));
      setCreatedKey(resp.key as string);
      setShowCreate(false);
      await fetchKeys();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to create API key.');
    }
  }, [placeId, fetchKeys]);

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

  const openCreate = useCallback(() => setShowCreate(true), []);
  const closeCreate = useCallback(() => setShowCreate(false), []);
  const dismissCreatedKey = useCallback(() => setCreatedKey(null), []);

  return (
    <>
      {error && (
        <div data-testid="apikey-error" className="mb-4 text-sm text-cardinal bg-cardinal/5 border border-cardinal/20 rounded-[var(--border-radius-base)] px-4 py-2">
          {error}
        </div>
      )}

      {createdKey && <CreatedKeyBanner token={createdKey} onDismiss={dismissCreatedKey} />}

      {showCreate && <CreateKeyForm onCreate={handleCreate} onCancel={closeCreate} />}

      <KeyList
        keys={keys}
        loading={loading}
        showNewKey={!showCreate}
        onNewKey={openCreate}
        onRevoke={handleRevoke}
        onDelete={handleDelete}
      />
    </>
  );
}
