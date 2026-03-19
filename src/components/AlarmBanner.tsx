'use client';

/**
 * AlarmBanner — persistent banner shown below the header when an alarm
 * incident is active. Clicking it navigates to the services/alarms page.
 *
 * Mirrors the context-bar alarm banner from src/components/context-bar/.
 */

import Link from 'next/link';
import { AlarmIncident } from '@arcus/core';
import { useAppSelector } from '@/store/hooks';
import { selectAllIncidents } from '@/store/slices/incidentsSlice';

const ALERT_LABELS: Record<string, string> = {
  [AlarmIncident.ALERT_SECURITY]: 'Security Alarm',
  [AlarmIncident.ALERT_PANIC]: 'Panic Alarm',
  [AlarmIncident.ALERT_SMOKE]: 'Smoke Alarm',
  [AlarmIncident.ALERT_CO]: 'Carbon Monoxide Alarm',
  [AlarmIncident.ALERT_WATER]: 'Water Leak Alarm',
  [AlarmIncident.ALERT_CARE]: 'Care Alarm',
  [AlarmIncident.ALERT_WEATHER]: 'Weather Alert',
};

export default function AlarmBanner() {
  const incidents = useAppSelector(selectAllIncidents);

  const activeIncident = incidents.find(
    (i) => i[AlarmIncident.ATTR_ALERTSTATE] === AlarmIncident.ALERTSTATE_ALERT,
  );

  if (!activeIncident) return null;

  const alertType = activeIncident[AlarmIncident.ATTR_ALERT];
  const label = (alertType && ALERT_LABELS[alertType]) ?? 'Alarm Active';

  return (
    <Link
      href="/services"
      className="w-full bg-cardinal text-crane px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2 hover:bg-cardinal/90 transition-colors"
    >
      <svg className="w-5 h-5 flex-shrink-0 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
      <span>{label} — Tap to view</span>
    </Link>
  );
}
