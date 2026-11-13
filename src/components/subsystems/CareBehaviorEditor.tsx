'use client';

/**
 * CareBehaviorEditor — side-panel form that creates a care behavior from a
 * template (`subcare:AddBehavior`), edits one (`subcare:UpdateBehavior`) or
 * removes it (`subcare:RemoveBehavior`).
 *
 * The template decides which fields appear: participating devices, open
 * counts, duration, temperature range, curfew time and monitoring windows.
 * With `readOnly` it previews a template the place has no devices for.
 *
 * Replaces src/components/subsystem/care/behaviors/edit-panel/.
 */

import { useCallback, useState, type ComponentType } from 'react';
import Bridge from '@arcus/core/bridge';
import { CareSubsystem } from '@arcus/core';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { useSidePanel } from '@/components/SidePanel';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import {
  MAX_BEHAVIOR_NAME_LENGTH,
  saveErrorMessage,
  summarizeField,
  type CareFieldKey,
  type CareTemplate,
} from '@/lib/careBehaviors';
import type { CareBehavior } from '@/store/entityTypes';
import type { CareBehaviorFieldProps } from './careBehaviorTypes';
import { CareBehaviorDevicesField } from './CareBehaviorDevicesField';
import { CareBehaviorOpenCountField } from './CareBehaviorOpenCountField';
import { CareBehaviorDurationField } from './CareBehaviorDurationField';
import { CareBehaviorTemperatureField } from './CareBehaviorTemperatureField';
import { CareBehaviorCurfewField } from './CareBehaviorCurfewField';
import { CareBehaviorTimeWindowsField } from './CareBehaviorTimeWindowsField';

const FIELD_EDITORS: { [key in CareFieldKey]: ComponentType<CareBehaviorFieldProps> } = {
  devices: CareBehaviorDevicesField,
  devicesOpenCount: CareBehaviorOpenCountField,
  duration: CareBehaviorDurationField,
  temperatureRange: CareBehaviorTemperatureField,
  time: CareBehaviorCurfewField,
  timeWindows: CareBehaviorTimeWindowsField,
};

interface CareBehaviorEditorProps {
  /** Care subsystem address. */
  address: string;
  /** Template the behavior is (or will be) built from; undefined if the platform no longer offers it. */
  template: CareTemplate | undefined;
  /** The behavior to edit, or a new one from `newBehaviorFrom`. Omit with `readOnly`. */
  behavior?: CareBehavior;
  /** Preview a template the place has no compatible devices for. */
  readOnly?: boolean;
  /** Called after a successful save or removal so the list can refresh. */
  onSaved: () => void;
}

interface PlatformError {
  code?: string;
}

export function CareBehaviorEditor({ address, template, behavior: initial, readOnly = false, onSaved }: CareBehaviorEditorProps) {
  const dispatch = useAppDispatch();
  const { closeRight } = useSidePanel();
  const [behavior, setBehavior] = useState<CareBehavior>(initial ?? {});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const isNew = !behavior.id;
  const name = behavior.name ?? '';
  const fields = template?.fields ?? [];
  const missingField = template
    ? fields.some((f) => summarizeField(behavior, f, template) === null)
    : false;
  const canSave = !readOnly && !!template && name.trim().length > 0 && !missingField && !saving;

  const handleChange = useCallback((patch: Partial<CareBehavior>) => {
    setBehavior((prev) => ({ ...prev, ...patch }));
    setFormError(null);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setFormError(null);
    const payload: CareBehavior = { ...behavior, name: name.trim() };
    try {
      await Bridge.request(
        isNew ? CareSubsystem.CMD_ADDBEHAVIOR : CareSubsystem.CMD_UPDATEBEHAVIOR,
        address,
        { behavior: payload },
      );
      dispatch(addNotification({
        type: 'success',
        message: `'${payload.name}' has been ${isNew ? 'added' : 'saved'}.`,
      }));
      onSaved();
      closeRight();
    } catch (e) {
      const message = saveErrorMessage((e as PlatformError | undefined)?.code);
      setFormError(message);
      dispatch(addNotification({ type: 'error', message }));
      setSaving(false);
    }
  }, [behavior, name, isNew, address, dispatch, onSaved, closeRight]);

  const handleDelete = useCallback(async () => {
    setConfirmingDelete(false);
    if (!behavior.id) return;
    setSaving(true);
    try {
      await Bridge.request(CareSubsystem.CMD_REMOVEBEHAVIOR, address, { id: behavior.id });
      dispatch(addNotification({ type: 'success', message: `'${initial?.name ?? name}' was removed.` }));
      onSaved();
      closeRight();
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to remove Care Behavior' }));
      setSaving(false);
    }
  }, [behavior.id, initial, name, address, dispatch, onSaved, closeRight]);

  return (
    <div data-testid="care-behavior-editor" className="space-y-5">
      {readOnly ? (
        <>
          <p data-testid="care-editor-unavailable" className="text-sm text-cardinal">
            There are no devices paired that meet the requirement for this Care Behavior.
          </p>
          <h3 data-testid="care-editor-template-name" className="text-base font-medium text-swift">{template?.name}</h3>
        </>
      ) : (
        <div>
          <label htmlFor="care-behavior-name" className="block text-xs font-medium text-coot mb-1">Care Behavior Name</label>
          <input
            id="care-behavior-name"
            data-testid="care-editor-name"
            value={name}
            maxLength={MAX_BEHAVIOR_NAME_LENGTH}
            onChange={(e) => handleChange({ name: e.target.value })}
            className="w-full text-sm border border-heron rounded-[var(--border-radius-base)] px-3 py-2 bg-crane text-swift"
          />
        </div>
      )}

      {template?.description && (
        <p data-testid="care-editor-description" className="text-sm text-grouse">{template.description}</p>
      )}
      {!template && (
        <p data-testid="care-editor-no-template" className="text-sm text-grouse">
          This behavior&apos;s template is no longer available, so its settings can&apos;t be edited.
        </p>
      )}

      {template && fields.map((field) => {
        const Editor = FIELD_EDITORS[field.key];
        const summary = summarizeField(behavior, field, template);
        return (
          <section key={field.key} data-testid={`care-section-${field.key}`} className="border-t border-heron pt-4">
            <div className="flex items-baseline justify-between gap-3 mb-1">
              <h4 className="text-sm font-medium text-swift">{field.label}</h4>
              {!readOnly && (
                <span data-testid={`care-section-status-${field.key}`} className={`text-xs ${summary ? 'text-grouse' : 'text-cardinal'}`}>
                  {summary ?? 'Required'}
                </span>
              )}
            </div>
            {field.description && <p className="text-xs text-grouse mb-2">{field.description}</p>}
            {!readOnly && <Editor behavior={behavior} field={field} template={template} onChange={handleChange} />}
          </section>
        );
      })}

      {formError && <p data-testid="care-editor-error" className="text-sm text-cardinal">{formError}</p>}

      {!readOnly && (
        <div className="flex gap-2 border-t border-heron pt-4">
          <button
            type="button"
            data-testid="care-editor-save"
            onClick={handleSave}
            disabled={!canSave}
            className="bg-peacock text-crane px-5 py-2 rounded-[var(--border-radius-base)] text-sm hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            data-testid="care-editor-cancel"
            onClick={closeRight}
            className="border border-heron px-5 py-2 rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon"
          >
            Cancel
          </button>
          {!isNew && (
            <button
              type="button"
              data-testid="care-editor-remove"
              onClick={() => setConfirmingDelete(true)}
              disabled={saving}
              className="ml-auto text-sm text-cardinal hover:underline disabled:opacity-50"
            >
              Remove Behavior
            </button>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmingDelete}
        title="Remove Care Behavior"
        message={`Are you sure you want to remove '${initial?.name ?? name}'?`}
        confirmLabel="Yes, Remove Behavior"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  );
}
