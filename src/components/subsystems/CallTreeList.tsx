'use client';

/**
 * CallTreeList — ordered notification call tree for a subsystem.
 *
 * Displays the people who are notified when the subsystem raises an
 * alarm. Entries can be reordered, enabled, or disabled; every change
 * writes the whole list back to the subsystem's call tree attribute.
 * Shared by the alarm (`subalarm:callTree`) and care (`subcare:callTree`)
 * notification lists.
 */

import { useState, useCallback } from 'react';
import { Base, Person } from '@arcus/core';
import Bridge from '@arcus/core/bridge';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { selectAllPeople } from '@/store/slices/peopleSlice';
import { addNotification } from '@/store/slices/uiSlice';
import type { CallTreeEntry } from '@/store/entityTypes';

export interface CallTreeListProps {
  /** Current call tree, in notification order. */
  callTree: CallTreeEntry[];
  /** Address of the subsystem that owns the call tree. Saving is a no-op without it. */
  subsystemAddress?: string;
  /** Call tree attribute key, e.g. `AlarmSubsystem.ATTR_CALLTREE`. */
  attribute: string;
  /** Explanatory text shown under the heading. */
  description: string;
  /** Text shown when the call tree is empty. */
  emptyMessage: string;
}

export function CallTreeList({
  callTree, subsystemAddress, attribute, description, emptyMessage,
}: CallTreeListProps) {
  const dispatch = useAppDispatch();
  const people = useAppSelector(selectAllPeople);
  const [saving, setSaving] = useState(false);

  const getPersonName = useCallback((personAddr: string): string => {
    const person = people.find((p) => p[Base.ATTR_ADDRESS] === personAddr);
    if (!person) return 'Unknown';
    const first = (person[Person.ATTR_FIRSTNAME] as string) ?? '';
    const last = (person[Person.ATTR_LASTNAME] as string) ?? '';
    return `${first} ${last}`.trim() || 'Unknown';
  }, [people]);

  const saveCallTree = useCallback(async (updated: CallTreeEntry[]) => {
    if (!subsystemAddress) return;
    setSaving(true);
    try {
      await Bridge.request(Base.CMD_SETATTRIBUTES, subsystemAddress, {
        [attribute]: updated,
      });
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to update notification list' }));
    }
    setSaving(false);
  }, [subsystemAddress, attribute, dispatch]);

  const handleToggle = useCallback((index: number) => {
    const updated = callTree.map((entry, i) =>
      i === index ? { ...entry, enabled: !entry.enabled } : entry,
    );
    saveCallTree(updated);
  }, [callTree, saveCallTree]);

  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    const updated = [...callTree];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    saveCallTree(updated);
  }, [callTree, saveCallTree]);

  const handleMoveDown = useCallback((index: number) => {
    if (index >= callTree.length - 1) return;
    const updated = [...callTree];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    saveCallTree(updated);
  }, [callTree, saveCallTree]);

  if (callTree.length === 0) {
    return (
      <div>
        <h3 className="text-base font-medium text-swift mb-2">Notification List</h3>
        <p className="text-sm text-grouse">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-base font-medium text-swift mb-1">Notification List</h3>
      <p className="text-xs text-grouse mb-3">{description}</p>
      <div className="space-y-2">
        {callTree.map((entry, index) => {
          const name = getPersonName(entry.person ?? '');
          return (
            <div
              key={entry.person ?? index}
              data-testid={`calltree-entry-${entry.person ?? index}`}
              data-position={index + 1}
              data-enabled={entry.enabled ?? false}
              className={`flex items-center gap-3 px-3 py-2.5 rounded border border-heron ${
                !entry.enabled ? 'opacity-50' : ''
              }`}
            >
              <span className="text-xs font-medium text-grouse w-5 text-center">{index + 1}</span>
              <span className="text-sm text-swift flex-1">{name}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleMoveUp(index)}
                  data-testid={`calltree-move-up-${entry.person ?? index}`}
                  disabled={index === 0 || saving}
                  className="p-1 text-grouse hover:text-swift disabled:opacity-30"
                  aria-label={`Move ${name} up`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                <button
                  onClick={() => handleMoveDown(index)}
                  data-testid={`calltree-move-down-${entry.person ?? index}`}
                  disabled={index >= callTree.length - 1 || saving}
                  className="p-1 text-grouse hover:text-swift disabled:opacity-30"
                  aria-label={`Move ${name} down`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <button
                onClick={() => handleToggle(index)}
                data-testid={`calltree-toggle-${entry.person ?? index}`}
                disabled={saving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                  entry.enabled ? 'bg-peacock' : 'bg-heron'
                }`}
                role="switch"
                aria-checked={entry.enabled ?? false}
                aria-label={`${entry.enabled ? 'Disable' : 'Enable'} notifications for ${name}`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-crane shadow transition-transform ${
                  entry.enabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
