/**
 * One reading of a shade's or Somfy blind's state, shared by the device
 * status line (getDeviceStatusText) and the shade/blind controls so they
 * always agree.
 */

import { Shade, Somfyv1 } from '@arcus/core';
import type { DeviceEntity } from '@/store/entityTypes';

/** shade:level moves in steps of this many percent, as in the legacy client. */
export const SHADE_LEVEL_STEP = 10;
export const SHADE_LEVEL_MIN = 0;
export const SHADE_LEVEL_MAX = 100;

export interface ShadeStatus {
  /** shade:level (0 = closed, 100 = open), or null when missing or not a number. */
  level: number | null;
  /** shade:shadestate reports OBSTRUCTION. */
  obstructed: boolean;
  /** "Obstructed", "<n>% Open" or "Unknown". */
  label: string;
}

export interface BlindStatus {
  /** somfyv1:type is BLIND (Open/Close) rather than the default SHADE (Up/Down). */
  isBlind: boolean;
  /** Label for the button that sends GoToOpen. */
  openLabel: string;
  /** Label for the button that sends GoToClosed. */
  closeLabel: string;
  /** Last reported position as Open/Closed (blind) or Up/Down (shade), or "Unknown". */
  label: string;
}

function clampLevel(level: number): number {
  return Math.min(SHADE_LEVEL_MAX, Math.max(SHADE_LEVEL_MIN, level));
}

/** Round a level to the nearest step, within 0–100. */
export function roundShadeLevel(level: number): number {
  return clampLevel(Math.round(level / SHADE_LEVEL_STEP) * SHADE_LEVEL_STEP);
}

/** The level one step up (direction 1) or down (direction -1) from `level`. */
export function stepShadeLevel(level: number, direction: 1 | -1): number {
  return roundShadeLevel(roundShadeLevel(level) + direction * SHADE_LEVEL_STEP);
}

export function getShadeStatus(device: DeviceEntity | undefined): ShadeStatus {
  const raw = device?.[Shade.ATTR_LEVEL];
  const level = typeof raw === 'number' && Number.isFinite(raw) ? clampLevel(Math.round(raw)) : null;
  const obstructed = device?.[Shade.ATTR_SHADESTATE] === Shade.SHADESTATE_OBSTRUCTION;

  let label: string;
  if (obstructed) label = 'Obstructed';
  else if (level !== null) label = `${level}% Open`;
  else label = 'Unknown';

  return { level, obstructed, label };
}

export function getBlindStatus(device: DeviceEntity | undefined): BlindStatus {
  const isBlind = device?.[Somfyv1.ATTR_TYPE] === Somfyv1.TYPE_BLIND;
  const openLabel = isBlind ? 'Open' : 'Up';
  const closeLabel = isBlind ? 'Close' : 'Down';

  const state = device?.[Somfyv1.ATTR_CURRENTSTATE];
  let label: string;
  if (state === Somfyv1.CURRENTSTATE_OPEN) label = isBlind ? 'Open' : 'Up';
  else if (state === Somfyv1.CURRENTSTATE_CLOSED) label = isBlind ? 'Closed' : 'Down';
  else label = 'Unknown';

  return { isBlind, openLabel, closeLabel, label };
}
