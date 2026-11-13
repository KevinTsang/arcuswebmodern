import { Base, Hub, HubAdvanced } from '@arcus/core';
import {
  HUB_FIRMWARE_TIMEOUTS,
  HubFirmwareState,
  hubFirmwareProgressPercent,
  hubFirmwareTimedOut,
  hubFirmwareVersion,
  isHubFirmwareState,
  isHubFirmwareUpdating,
} from '@/lib/hubFirmware';
import type { HubData } from '@/store/entityTypes';

// ── Helpers ───────────────────────────────────────────────────────────

function hub(attrs: Partial<HubData> = {}): HubData {
  return { [Base.ATTR_ADDRESS]: 'SERV:ABC-1234:hub', [Hub.ATTR_STATE]: Hub.STATE_NORMAL, ...attrs };
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('isHubFirmwareState', () => {
  it('is true for DOWNLOADING and APPLYING', () => {
    expect(isHubFirmwareState(HubFirmwareState.DOWNLOADING)).toBe(true);
    expect(isHubFirmwareState(HubFirmwareState.APPLYING)).toBe(true);
  });

  it('is false for other states and missing values', () => {
    expect(isHubFirmwareState('OFFLINE')).toBe(false);
    expect(isHubFirmwareState('REGISTERED')).toBe(false);
    expect(isHubFirmwareState(null)).toBe(false);
    expect(isHubFirmwareState(undefined)).toBe(false);
  });
});

describe('hubFirmwareTimedOut', () => {
  it('times out a download after the download timeout', () => {
    const limit = HUB_FIRMWARE_TIMEOUTS.DOWNLOADING;
    expect(hubFirmwareTimedOut(HubFirmwareState.DOWNLOADING, 0, limit - 1)).toBe(false);
    expect(hubFirmwareTimedOut(HubFirmwareState.DOWNLOADING, 0, limit)).toBe(true);
  });

  it('times out an apply after the shorter apply timeout', () => {
    const limit = HUB_FIRMWARE_TIMEOUTS.APPLYING;
    expect(limit).toBeLessThan(HUB_FIRMWARE_TIMEOUTS.DOWNLOADING);
    expect(hubFirmwareTimedOut(HubFirmwareState.APPLYING, 1000, 1000 + limit - 1)).toBe(false);
    expect(hubFirmwareTimedOut(HubFirmwareState.APPLYING, 1000, 1000 + limit)).toBe(true);
  });

  it('never times out other states', () => {
    expect(hubFirmwareTimedOut('OFFLINE', 0, Number.MAX_SAFE_INTEGER)).toBe(false);
  });
});

describe('hubFirmwareProgressPercent', () => {
  it('rounds to a whole percentage', () => {
    expect(hubFirmwareProgressPercent(42.6)).toBe(43);
  });

  it('clamps to 0–100', () => {
    expect(hubFirmwareProgressPercent(-5)).toBe(0);
    expect(hubFirmwareProgressPercent(250)).toBe(100);
  });

  it('treats missing or invalid progress as 0', () => {
    expect(hubFirmwareProgressPercent(undefined)).toBe(0);
    expect(hubFirmwareProgressPercent(null)).toBe(0);
    expect(hubFirmwareProgressPercent(Number.NaN)).toBe(0);
  });
});

describe('hubFirmwareVersion', () => {
  it('returns hubadv:osver', () => {
    expect(hubFirmwareVersion(hub({ [HubAdvanced.ATTR_OSVER]: '2.2.0.009' }))).toBe('2.2.0.009');
  });

  it('returns empty for a missing hub, a missing version or a non-string', () => {
    expect(hubFirmwareVersion(null)).toBe('');
    expect(hubFirmwareVersion(hub())).toBe('');
    expect(hubFirmwareVersion(hub({ [HubAdvanced.ATTR_OSVER]: 3 }))).toBe('');
  });
});

describe('isHubFirmwareUpdating', () => {
  const FIRMWARE_RESTART = { [HubAdvanced.ATTR_LASTRESTARTREASON]: HubAdvanced.LASTRESTARTREASON_FIRMWARE_UPDATE };

  it('is true for a down hub that restarted for a firmware update', () => {
    expect(isHubFirmwareUpdating(hub({ [Hub.ATTR_STATE]: Hub.STATE_DOWN, ...FIRMWARE_RESTART }))).toBe(true);
  });

  it('is false once the hub is back online', () => {
    expect(isHubFirmwareUpdating(hub(FIRMWARE_RESTART))).toBe(false);
  });

  it('is false for a hub that went down for another reason', () => {
    expect(isHubFirmwareUpdating(hub({
      [Hub.ATTR_STATE]: Hub.STATE_DOWN,
      [HubAdvanced.ATTR_LASTRESTARTREASON]: HubAdvanced.LASTRESTARTREASON_REQUESTED,
    }))).toBe(false);
    expect(isHubFirmwareUpdating(hub({ [Hub.ATTR_STATE]: Hub.STATE_DOWN }))).toBe(false);
  });

  it('is false without a hub', () => {
    expect(isHubFirmwareUpdating(null)).toBe(false);
  });
});
