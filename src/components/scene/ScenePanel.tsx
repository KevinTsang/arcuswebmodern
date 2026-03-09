import { useState, useCallback, useEffect, useMemo } from 'react';
import Bridge from '@arcus/core/bridge';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { useSidePanel } from '@/components/SidePanel';
import { getDefaultValues } from './sceneDefaults';
import { ActionCategoryList } from './ActionCategoryList';
import { ActionDeviceConfigurator } from './ActionDeviceConfigurator';
import { resolveSceneActions } from './resolveSceneActions';
import type { ResolvedAction } from './resolveSceneActions';
import type { SelectorDef } from './types';

export type { ResolvedAction } from './resolveSceneActions';

export interface ActionConfig {
  name: string;
  template: string;
  context: Record<string, Record<string, unknown>>;
}

interface ScenePanelProps {
  scene?: Record<string, unknown>;
}

export function ScenePanel({ scene }: ScenePanelProps) {
  const isEdit = !!scene;
  const dispatch = useAppDispatch();
  const { closeRight } = useSidePanel();
  const placeId = useAppSelector((s) => s.place.placeId) ?? '';

  const address = scene?.['base:address'] as string | undefined;
  const sceneTemplateId = scene?.['scene:template'] as string | undefined;

  const [name, setName] = useState(isEdit ? ((scene['scene:name'] as string) ?? '') : 'New Scene');
  const [actions, setActions] = useState<ResolvedAction[]>([]);
  const [templateAddress, setTemplateAddress] = useState('');
  const [configuredActions, setConfiguredActions] = useState<Map<string, ActionConfig>>(new Map());
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await resolveSceneActions(placeId, sceneTemplateId);
        if (cancelled) return;
        setActions(result.actions);
        setTemplateAddress(result.templateAddress);

        // Pre-populate configuredActions from existing scene actions (edit mode)
        if (scene) {
          const existing = scene['scene:actions'] as Array<Record<string, unknown>> | undefined;
          if (existing) {
            const map = new Map<string, ActionConfig>();
            for (const action of existing) {
              const template = (action['template'] as string) ?? '';
              const actionName = (action['name'] as string) ?? '';
              const context = (action['context'] as Record<string, Record<string, unknown>>) ?? {};
              map.set(template, { name: actionName, template, context });
            }
            setConfiguredActions(map);
          }
        }
      } catch {
        dispatch(addNotification({ type: 'error', message: 'Failed to load scene actions' }));
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [placeId, sceneTemplateId, scene, dispatch]);

  const satisfiableActions = useMemo(() => actions.filter((a) => a.satisfiable), [actions]);
  const unsatisfiableActions = useMemo(() => actions.filter((a) => !a.satisfiable), [actions]);

  const getConfiguredDeviceCount = useCallback((actionId: string) => {
    const config = configuredActions.get(actionId);
    if (!config) return 0;
    return Object.keys(config.context).length;
  }, [configuredActions]);

  const hasAnyConfigured = useMemo(() => {
    for (const config of configuredActions.values()) {
      if (Object.keys(config.context).length > 0) return true;
    }
    return false;
  }, [configuredActions]);

  const handleToggleDevice = useCallback((action: ResolvedAction, deviceAddr: string, selectors: SelectorDef[]) => {
    setConfiguredActions((prev) => {
      const next = new Map(prev);
      const existing = next.get(action.id) ?? { name: action.name, template: action.id, context: {} };
      const newContext = { ...existing.context };
      if (newContext[deviceAddr]) {
        delete newContext[deviceAddr];
      } else {
        newContext[deviceAddr] = getDefaultValues(selectors, undefined);
      }
      next.set(action.id, { ...existing, context: newContext });
      return next;
    });
  }, []);

  const handleDeviceValueChange = useCallback((actionId: string, deviceAddr: string, key: string, value: unknown) => {
    setConfiguredActions((prev) => {
      const next = new Map(prev);
      const existing = next.get(actionId);
      if (!existing) return prev;
      const deviceContext = { ...(existing.context[deviceAddr] ?? {}) };
      deviceContext[key] = value;
      next.set(actionId, {
        ...existing,
        context: { ...existing.context, [deviceAddr]: deviceContext },
      });
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!name.trim()) return;
    if (!isEdit && (!hasAnyConfigured || !templateAddress)) return;
    setSaving(true);
    try {
      const saveActions: Array<{ name: string; template: string; context: Record<string, Record<string, unknown>> }> = [];
      for (const config of configuredActions.values()) {
        if (Object.keys(config.context).length > 0) {
          saveActions.push(config);
        }
      }
      if (isEdit && address) {
        await Bridge.request('base:SetAttributes', address, {
          'scene:name': name.trim(),
          'scene:actions': saveActions,
        });
        dispatch(addNotification({ type: 'success', message: 'Scene saved' }));
      } else {
        await Bridge.request('scenetmpl:Create', templateAddress, {
          placeId,
          name: name.trim(),
          actions: saveActions,
        });
        dispatch(addNotification({ type: 'success', message: 'Scene created' }));
      }
      closeRight();
    } catch {
      dispatch(addNotification({ type: 'error', message: isEdit ? 'Failed to save scene' : 'Failed to create scene' }));
    }
    setSaving(false);
  }, [isEdit, address, placeId, name, hasAnyConfigured, templateAddress, configuredActions, dispatch, closeRight]);

  const handleDelete = useCallback(async () => {
    if (!address) return;
    setDeleting(true);
    try {
      await Bridge.request('scene:Delete', address, {});
      dispatch(addNotification({ type: 'success', message: 'Scene deleted' }));
      closeRight();
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to delete scene' }));
    }
    setDeleting(false);
  }, [address, dispatch, closeRight]);

  if (loading) {
    return (
      <div>
        <h3 className="text-lg font-semibold text-swift mb-4">{isEdit ? 'Edit Scene' : 'Create Scene'}</h3>
        <p className="text-sm text-grouse">Loading actions...</p>
      </div>
    );
  }

  if (activeAction) {
    const action = actions.find((a) => a.id === activeAction);
    if (!action) {
      setActiveAction(null);
      return null;
    }
    return (
      <ActionDeviceConfigurator
        action={action}
        configuredActions={configuredActions}
        onBack={() => setActiveAction(null)}
        onToggleDevice={handleToggleDevice}
        onDeviceValueChange={handleDeviceValueChange}
      />
    );
  }

  return (
    <div>
      <ActionCategoryList
        name={name}
        onNameChange={setName}
        satisfiableActions={satisfiableActions}
        unsatisfiableActions={unsatisfiableActions}
        getConfiguredDeviceCount={getConfiguredDeviceCount}
        saving={saving}
        hasAnyConfigured={hasAnyConfigured}
        onSelectAction={setActiveAction}
        onSave={handleSave}
        onCancel={closeRight}
        heading={isEdit ? 'Edit Scene' : 'Create Scene'}
        saveLabel={isEdit ? 'Save' : 'Create Scene'}
        savingLabel={isEdit ? 'Saving...' : 'Creating...'}
      />

      {isEdit && (
        <>
          <hr className="border-heron my-4" />

          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-sm text-cardinal hover:underline"
            >
              Delete Scene
            </button>
          ) : (
            <div>
              <p className="text-sm text-swift mb-3">Are you sure you want to delete this scene?</p>
              <div className="flex gap-3">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-cardinal text-crane px-4 py-2 rounded-[var(--border-radius-base)] text-sm disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Yes, Delete'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="border border-heron text-coot px-4 py-2 rounded-[var(--border-radius-base)] text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
