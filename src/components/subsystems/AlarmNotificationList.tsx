'use client';

/**
 * AlarmNotificationList — ordered call tree for alarm notifications.
 *
 * Displays the list of contacts who will be notified when an alarm
 * triggers. Contacts can be reordered, enabled, or disabled.
 */

import { useState, useCallback } from 'react';
import { Base, AlarmSubsystem, Person } from '@arcus/core';
import Bridge from '@arcus/core/bridge';
import { useAlarmSubsystem } from '@/hooks/useAlarmSubsystem';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { selectAllPeople } from '@/store/slices/peopleSlice';
import { addNotification } from '@/store/slices/uiSlice';
import type { AlarmCallEntry } from '@/store/entityTypes';

export function AlarmNotificationList() {
  const dispatch = useAppDispatch();
  const alarm = useAlarmSubsystem();
  const people = useAppSelector(selectAllPeople);
  const [saving, setSaving] = useState(false);

  const callTree = alarm.callTree;
  const alarmAddr = alarm.alarmSubsystem?.[Base.ATTR_ADDRESS] as string | undefined;

  const getPersonName = useCallback((personAddr: string): string => {
    const person = people.find((p) => p[Base.ATTR_ADDRESS] === personAddr);
    if (!person) return 'Unknown';
    const first = (person[Person.ATTR_FIRSTNAME] as string) ?? '';
    const last = (person[Person.ATTR_LASTNAME] as string) ?? '';
    return `${first} ${last}`.trim() || 'Unknown';
  }, [people]);

  const saveCallTree = useCallback(async (updated: AlarmCallEntry[]) => {
    if (!alarmAddr) return;
    setSaving(true);
    try {
      await Bridge.request(Base.CMD_SETATTRIBUTES, alarmAddr, {
        [AlarmSubsystem.ATTR_CALLTREE]: updated,
      });
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to update notification list' }));
    }
    setSaving(false);
  }, [alarmAddr, dispatch]);

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
        <p className="text-sm text-grouse">No contacts configured for alarm notifications.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-base font-medium text-swift mb-1">Notification List</h3>
      <p className="text-xs text-grouse mb-3">
        People will be notified in this order when an alarm is triggered.
      </p>
      <div className="space-y-2">
        {callTree.map((entry, index) => {
          const name = getPersonName(entry.person ?? '');
          return (
            <div
              key={entry.person ?? index}
              className={`flex items-center gap-3 px-3 py-2.5 rounded border border-heron ${
                !entry.enabled ? 'opacity-50' : ''
              }`}
            >
              <span className="text-xs font-medium text-grouse w-5 text-center">{index + 1}</span>
              <span className="text-sm text-swift flex-1">{name}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleMoveUp(index)}
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
