'use client';

/**
 * CareBehaviors — the Care "Behaviors" tab: the place's care behaviors with
 * enable/disable switches, an editor for each, and the template library to
 * add new ones.
 *
 * Replaces the behavior list of src/components/subsystem/care/status/ and
 * src/components/subsystem/care/behaviors/.
 */

import { useCallback, useState } from 'react';
import Bridge from '@arcus/core/bridge';
import { CareSubsystem } from '@arcus/core';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { useSidePanel } from '@/components/SidePanel';
import { useCareBehaviors } from '@/hooks/useCareBehaviors';
import { newBehaviorFrom, type CareTemplate } from '@/lib/careBehaviors';
import type { CareBehavior } from '@/store/entityTypes';
import { CareBehaviorRow } from './CareBehaviorRow';
import { CareBehaviorLibrary } from './CareBehaviorLibrary';
import { CareBehaviorEditor } from './CareBehaviorEditor';

export function CareBehaviors() {
  const dispatch = useAppDispatch();
  const { openRight } = useSidePanel();
  const { address, behaviors, templates, loading, error, reload } = useCareBehaviors();
  const [showLibrary, setShowLibrary] = useState(false);
  /** Optimistic enabled state while a toggle is in flight, by behavior id. */
  const [pending, setPending] = useState<{ [id: string]: boolean }>({});

  const templateFor = useCallback(
    (behavior: CareBehavior) => templates.find((t) => t.id === behavior.templateId),
    [templates],
  );

  const handleToggle = useCallback(async (behavior: CareBehavior, enabled: boolean) => {
    if (!address || !behavior.id) return;
    const id = behavior.id;
    setPending((prev) => ({ ...prev, [id]: enabled }));
    try {
      await Bridge.request(CareSubsystem.CMD_UPDATEBEHAVIOR, address, { behavior: { ...behavior, enabled } });
      await reload();
    } catch {
      dispatch(addNotification({
        type: 'error',
        message: `Failed to ${enabled ? 'enable' : 'disable'} '${behavior.name ?? 'Care Behavior'}'`,
      }));
    }
    setPending((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, [address, reload, dispatch]);

  const handleEdit = useCallback((behavior: CareBehavior) => {
    if (!address) return;
    openRight(
      <CareBehaviorEditor address={address} template={templateFor(behavior)} behavior={behavior} onSaved={reload} />,
      { title: 'Edit Care Behavior', key: `care-behavior:${behavior.id}` },
    );
  }, [address, openRight, templateFor, reload]);

  const handleSelectTemplate = useCallback((template: CareTemplate) => {
    if (!address) return;
    openRight(
      <CareBehaviorEditor address={address} template={template} behavior={newBehaviorFrom(template)} onSaved={reload} />,
      { title: 'Add Care Behavior', key: `care-behavior:new:${template.id}` },
    );
    setShowLibrary(false);
  }, [address, openRight, reload]);

  const handlePreviewTemplate = useCallback((template: CareTemplate) => {
    if (!address) return;
    openRight(
      <CareBehaviorEditor address={address} template={template} readOnly onSaved={reload} />,
      { title: template.name, key: `care-behavior:preview:${template.id}` },
    );
  }, [address, openRight, reload]);

  const addButton = (
    <button
      type="button"
      data-testid="care-behavior-add"
      onClick={() => setShowLibrary((v) => !v)}
      disabled={!address}
      className="bg-peacock text-crane px-4 py-1.5 rounded-[var(--border-radius-base)] text-sm hover:opacity-90 disabled:opacity-50"
    >
      {showLibrary ? 'Close Library' : '+ Add Behavior'}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h3 data-testid="care-behaviors-title" className="text-sm font-medium text-swift">My Care Behaviors</h3>
        {addButton}
      </div>

      {showLibrary && (
        <CareBehaviorLibrary templates={templates} onSelect={handleSelectTemplate} onPreview={handlePreviewTemplate} />
      )}

      {!address || (loading && behaviors.length === 0) ? (
        <p data-testid="care-behaviors-loading" className="text-sm text-grouse">
          {address ? 'Loading behaviors…' : 'Care is not available for this place.'}
        </p>
      ) : error && behaviors.length === 0 ? (
        <div data-testid="care-behaviors-error" className="text-sm text-grouse">
          Couldn&apos;t load care behaviors.{' '}
          <button type="button" data-testid="care-behaviors-retry" onClick={() => void reload()} className="text-peacock hover:underline">
            Retry
          </button>
        </div>
      ) : behaviors.length === 0 ? (
        <div data-testid="care-behaviors-empty" className="text-center py-8">
          <p className="text-grouse mb-2">No behaviors configured.</p>
          <p className="text-sm text-grouse">
            Care behaviors monitor activity patterns and alert you when something unusual happens.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {behaviors.map((behavior, i) => {
            const id = behavior.id ?? '';
            const shown = id in pending ? { ...behavior, enabled: pending[id] } : behavior;
            return (
              <CareBehaviorRow
                key={id || i}
                behavior={shown}
                template={templateFor(behavior)}
                toggling={id in pending}
                onToggle={handleToggle}
                onEdit={handleEdit}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
