'use client';

/**
 * IncidentTracker — shows active alarm incident with Cancel button.
 * Mirrors the graphical incident tracker from
 * src/components/subsystem/alarms/incident-tracker/graphical/.
 */

import { useState, useCallback } from 'react';
import Bridge from '@arcus/core/bridge';
import { Base, AlarmIncident } from '@arcus/core';
import { useAppDispatch } from '@/store/hooks';
import { setCurrentIncident } from '@/store/slices/incidentsSlice';
import type { IncidentEntity } from '@/store/entityTypes';
import type { CancelIncidentResponse } from '@/arcus/types';
import { addNotification } from '@/store/slices/uiSlice';

const ALERT_CONFIG: Record<string, { label: string; icon: string }> = {
  [AlarmIncident.ALERT_SECURITY]: { label: 'Security Alarm', icon: 'icon-platform-security-1' },
  [AlarmIncident.ALERT_PANIC]: { label: 'Panic Alarm', icon: 'icon-platform-security-1' },
  [AlarmIncident.ALERT_SMOKE]: { label: 'Smoke Alarm', icon: 'icon-platform-smoke-1' },
  [AlarmIncident.ALERT_CO]: { label: 'Carbon Monoxide Alarm', icon: 'icon-platform-co-1' },
  [AlarmIncident.ALERT_WATER]: { label: 'Water Leak Alarm', icon: 'icon-platform-water-leak-2' },
  [AlarmIncident.ALERT_CARE]: { label: 'Care Alarm', icon: 'icon-platform-care-1' },
  [AlarmIncident.ALERT_WEATHER]: { label: 'Weather Alert', icon: 'icon-platform-weather-1' },
};

export default function IncidentTracker({ incident }: { incident: IncidentEntity }) {
  const dispatch = useAppDispatch();
  const [cancelling, setCancelling] = useState(false);

  const alertState = incident[AlarmIncident.ATTR_ALERTSTATE];
  const alertType = incident[AlarmIncident.ATTR_ALERT];
  const address = incident[Base.ATTR_ADDRESS];
  const config = alertType ? ALERT_CONFIG[alertType] : undefined;
  const label = config?.label ?? 'Alarm Active';
  const isCancelling = alertState === AlarmIncident.ALERTSTATE_CANCELLING || cancelling;

  const handleCancel = useCallback(async () => {
    setCancelling(true);
    try {
      const result = await Bridge.request<CancelIncidentResponse>(AlarmIncident.CMD_CANCEL, address, {});
      dispatch(setCurrentIncident(null));
      if (result.warningMessage) {
        dispatch(addNotification({ type: 'warning', message: result.warningMessage }));
      } else {
        dispatch(addNotification({ type: 'success', message: 'Alarm cancelled' }));
      }
    } catch (e: unknown) {
      const err = e as { code?: string } | undefined;
      if (err?.code === 'UnknownDevice') {
        dispatch(addNotification({
          type: 'error',
          message: 'Cannot stop alarm sounds — Hub has lost connection. The Monitoring Station will call to assist.',
        }));
      } else {
        dispatch(addNotification({ type: 'error', message: 'Failed to cancel alarm' }));
      }
    }
    setCancelling(false);
  }, [address, dispatch]);

  return (
    <div className="rounded-[var(--border-radius-base)] border-2 border-cardinal bg-cardinal/5 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {config?.icon && <span className={`${config.icon} text-2xl text-cardinal`} />}
          <div>
            <h3 className="text-lg font-bold text-cardinal">{label}</h3>
            <p className="text-xs text-grouse">
              {alertState === AlarmIncident.ALERTSTATE_PREALERT
                ? 'Pre-alert — alarm will sound shortly'
                : 'Alarm is active'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleCancel}
          disabled={isCancelling}
          className="bg-cardinal text-crane px-6 py-2.5 rounded-[var(--border-radius-base)] text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
        >
          {isCancelling ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-crane/30 border-t-crane rounded-full animate-spin" />
              Cancelling...
            </>
          ) : (
            'Cancel Alarm'
          )}
        </button>
      </div>
    </div>
  );
}
