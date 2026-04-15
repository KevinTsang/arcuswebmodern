import { renderHook } from '@testing-library/react';
import { SecuritySubsystem, AlarmSubsystem, SecurityAlarmMode } from '@arcus/core';
import { useAlarmSubsystem } from '@/hooks/useAlarmSubsystem';
import type { SubsystemEntity } from '@/store/entityTypes';
import type { AlarmCallEntry } from '@/store/entityTypes';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockUseSubsystem = jest.fn<SubsystemEntity | undefined, [string]>();

jest.mock('@/hooks/useSubsystem', () => ({
  useSubsystem: (ns: string) => mockUseSubsystem(ns),
}));

// ── Helpers ───────────────────────────────────────────────────────────

function makeSecuritySubsystem(overrides: Record<string, unknown> = {}): SubsystemEntity {
  return {
    id: 'SERV:subsecurity:abc',
    'base:address': 'SERV:subsecurity:abc',
    ...overrides,
  };
}

function makeAlarmSubsystem(overrides: Record<string, unknown> = {}): SubsystemEntity {
  return {
    id: 'SERV:subalarm:abc',
    'base:address': 'SERV:subalarm:abc',
    ...overrides,
  };
}

function makeSafetySubsystem(overrides: Record<string, unknown> = {}): SubsystemEntity {
  return {
    id: 'SERV:subsafety:abc',
    'base:address': 'SERV:subsafety:abc',
    ...overrides,
  };
}

function setupSubsystems(opts: {
  security?: SubsystemEntity;
  safety?: SubsystemEntity;
  alarm?: SubsystemEntity;
} = {}) {
  mockUseSubsystem.mockImplementation((ns: string) => {
    if (ns === 'subsecurity') return opts.security;
    if (ns === 'subsafety') return opts.safety;
    if (ns === 'subalarm') return opts.alarm;
    return undefined;
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('useAlarmSubsystem', () => {
  describe('defaults when no subsystems exist', () => {
    it('returns default values when all subsystems are undefined', () => {
      setupSubsystems();

      const { result } = renderHook(() => useAlarmSubsystem());

      expect(result.current.securityMode).toBe(SecuritySubsystem.ALARMMODE_OFF);
      expect(result.current.securityState).toBe(SecuritySubsystem.ALARMSTATE_DISARMED);
      expect(result.current.currentIncident).toBeUndefined();
      expect(result.current.securityDevices).toEqual([]);
      expect(result.current.triggeredDevices).toEqual([]);
      expect(result.current.offlineDevices).toEqual([]);
      expect(result.current.callTree).toEqual([]);
      expect(result.current.recordOnSecurity).toBe(false);
      expect(result.current.fanShutoffOnSmoke).toBe(false);
      expect(result.current.fanShutoffOnCO).toBe(false);
      expect(result.current.securitySubsystem).toBeUndefined();
      expect(result.current.safetySubsystem).toBeUndefined();
      expect(result.current.alarmSubsystem).toBeUndefined();
    });
  });

  describe('securityMode and securityState', () => {
    it('returns securityMode from the security subsystem', () => {
      setupSubsystems({
        security: makeSecuritySubsystem({
          [SecuritySubsystem.ATTR_ALARMMODE]: SecuritySubsystem.ALARMMODE_ON,
        }),
      });

      const { result } = renderHook(() => useAlarmSubsystem());

      expect(result.current.securityMode).toBe(SecuritySubsystem.ALARMMODE_ON);
    });

    it('returns securityState from the security subsystem', () => {
      setupSubsystems({
        security: makeSecuritySubsystem({
          [SecuritySubsystem.ATTR_ALARMSTATE]: SecuritySubsystem.ALARMSTATE_ARMED,
        }),
      });

      const { result } = renderHook(() => useAlarmSubsystem());

      expect(result.current.securityState).toBe(SecuritySubsystem.ALARMSTATE_ARMED);
    });

    it('returns currentIncident from the security subsystem', () => {
      setupSubsystems({
        security: makeSecuritySubsystem({
          'subsecurity:currentIncident': 'SERV:incident:12345',
        }),
      });

      const { result } = renderHook(() => useAlarmSubsystem());

      expect(result.current.currentIncident).toBe('SERV:incident:12345');
    });
  });

  describe('device lists from security subsystem', () => {
    it('returns securityDevices from the security subsystem', () => {
      const devices = ['DRIV:dev:device1', 'DRIV:dev:device2'];
      setupSubsystems({
        security: makeSecuritySubsystem({
          [SecuritySubsystem.ATTR_SECURITYDEVICES]: devices,
        }),
      });

      const { result } = renderHook(() => useAlarmSubsystem());

      expect(result.current.securityDevices).toEqual(devices);
    });

    it('returns triggeredDevices from the security subsystem', () => {
      const devices = ['DRIV:dev:triggered1'];
      setupSubsystems({
        security: makeSecuritySubsystem({
          [SecuritySubsystem.ATTR_TRIGGEREDDEVICES]: devices,
        }),
      });

      const { result } = renderHook(() => useAlarmSubsystem());

      expect(result.current.triggeredDevices).toEqual(devices);
    });

    it('returns offlineDevices from the security subsystem', () => {
      const devices = ['DRIV:dev:offline1', 'DRIV:dev:offline2'];
      setupSubsystems({
        security: makeSecuritySubsystem({
          [SecuritySubsystem.ATTR_OFFLINEDEVICES]: devices,
        }),
      });

      const { result } = renderHook(() => useAlarmSubsystem());

      expect(result.current.offlineDevices).toEqual(devices);
    });
  });

  describe('callTree from alarm subsystem', () => {
    it('returns callTree from the alarm subsystem', () => {
      const callTree: AlarmCallEntry[] = [
        { person: 'SERV:person:person1', enabled: true },
        { person: 'SERV:person:person2', enabled: false },
      ];
      setupSubsystems({
        alarm: makeAlarmSubsystem({
          [AlarmSubsystem.ATTR_CALLTREE]: callTree,
        }),
      });

      const { result } = renderHook(() => useAlarmSubsystem());

      expect(result.current.callTree).toEqual(callTree);
    });

    it('returns empty callTree when alarm subsystem has no callTree', () => {
      setupSubsystems({
        alarm: makeAlarmSubsystem(),
      });

      const { result } = renderHook(() => useAlarmSubsystem());

      expect(result.current.callTree).toEqual([]);
    });
  });

  describe('toggle settings from alarm subsystem', () => {
    it('returns recordOnSecurity as true when set', () => {
      setupSubsystems({
        alarm: makeAlarmSubsystem({
          [AlarmSubsystem.ATTR_RECORDONSECURITY]: true,
        }),
      });

      const { result } = renderHook(() => useAlarmSubsystem());

      expect(result.current.recordOnSecurity).toBe(true);
    });

    it('returns fanShutoffOnSmoke as true when set', () => {
      setupSubsystems({
        alarm: makeAlarmSubsystem({
          [AlarmSubsystem.ATTR_FANSHUTOFFONSMOKE]: true,
        }),
      });

      const { result } = renderHook(() => useAlarmSubsystem());

      expect(result.current.fanShutoffOnSmoke).toBe(true);
    });

    it('returns fanShutoffOnCO as true when set', () => {
      setupSubsystems({
        alarm: makeAlarmSubsystem({
          [AlarmSubsystem.ATTR_FANSHUTOFFONCO]: true,
        }),
      });

      const { result } = renderHook(() => useAlarmSubsystem());

      expect(result.current.fanShutoffOnCO).toBe(true);
    });

    it('defaults toggle settings to false when alarm subsystem exists but attrs are absent', () => {
      setupSubsystems({
        alarm: makeAlarmSubsystem(),
      });

      const { result } = renderHook(() => useAlarmSubsystem());

      expect(result.current.recordOnSecurity).toBe(false);
      expect(result.current.fanShutoffOnSmoke).toBe(false);
      expect(result.current.fanShutoffOnCO).toBe(false);
    });
  });

  describe('per-mode settings with correct defaults', () => {
    it('returns default mode settings when security subsystem has no mode attributes', () => {
      setupSubsystems({
        security: makeSecuritySubsystem(),
      });

      const { result } = renderHook(() => useAlarmSubsystem());

      for (const mode of ['ON', 'PARTIAL'] as const) {
        expect(result.current.modeSettings[mode]).toEqual({
          devices: [],
          entranceDelaySec: 30,
          exitDelaySec: 30,
          soundsEnabled: true,
          silent: false,
          alarmSensitivityDeviceCount: 1,
        });
      }
    });

    it('returns default mode settings when no security subsystem exists', () => {
      setupSubsystems();

      const { result } = renderHook(() => useAlarmSubsystem());

      expect(result.current.modeSettings.ON.devices).toEqual([]);
      expect(result.current.modeSettings.ON.entranceDelaySec).toBe(30);
      expect(result.current.modeSettings.ON.exitDelaySec).toBe(30);
      expect(result.current.modeSettings.ON.soundsEnabled).toBe(true);
      expect(result.current.modeSettings.ON.silent).toBe(false);
      expect(result.current.modeSettings.ON.alarmSensitivityDeviceCount).toBe(1);

      expect(result.current.modeSettings.PARTIAL.devices).toEqual([]);
      expect(result.current.modeSettings.PARTIAL.entranceDelaySec).toBe(30);
      expect(result.current.modeSettings.PARTIAL.exitDelaySec).toBe(30);
      expect(result.current.modeSettings.PARTIAL.soundsEnabled).toBe(true);
      expect(result.current.modeSettings.PARTIAL.silent).toBe(false);
      expect(result.current.modeSettings.PARTIAL.alarmSensitivityDeviceCount).toBe(1);
    });
  });

  describe('per-mode settings when populated', () => {
    it('returns ON mode settings from security subsystem', () => {
      const onDevices = ['DRIV:dev:door1', 'DRIV:dev:motion1'];
      setupSubsystems({
        security: makeSecuritySubsystem({
          [`${SecurityAlarmMode.ATTR_DEVICES}:ON`]: onDevices,
          [`${SecurityAlarmMode.ATTR_ENTRANCEDELAYSEC}:ON`]: 45,
          [`${SecurityAlarmMode.ATTR_EXITDELAYSEC}:ON`]: 60,
          [`${SecurityAlarmMode.ATTR_SOUNDSENABLED}:ON`]: false,
          [`${SecurityAlarmMode.ATTR_SILENT}:ON`]: true,
          [`${SecurityAlarmMode.ATTR_ALARMSENSITIVITYDEVICECOUNT}:ON`]: 3,
        }),
      });

      const { result } = renderHook(() => useAlarmSubsystem());

      expect(result.current.modeSettings.ON).toEqual({
        devices: onDevices,
        entranceDelaySec: 45,
        exitDelaySec: 60,
        soundsEnabled: false,
        silent: true,
        alarmSensitivityDeviceCount: 3,
      });
    });

    it('returns PARTIAL mode settings from security subsystem', () => {
      const partialDevices = ['DRIV:dev:door1'];
      setupSubsystems({
        security: makeSecuritySubsystem({
          [`${SecurityAlarmMode.ATTR_DEVICES}:PARTIAL`]: partialDevices,
          [`${SecurityAlarmMode.ATTR_ENTRANCEDELAYSEC}:PARTIAL`]: 15,
          [`${SecurityAlarmMode.ATTR_EXITDELAYSEC}:PARTIAL`]: 20,
          [`${SecurityAlarmMode.ATTR_SOUNDSENABLED}:PARTIAL`]: true,
          [`${SecurityAlarmMode.ATTR_SILENT}:PARTIAL`]: false,
          [`${SecurityAlarmMode.ATTR_ALARMSENSITIVITYDEVICECOUNT}:PARTIAL`]: 2,
        }),
      });

      const { result } = renderHook(() => useAlarmSubsystem());

      expect(result.current.modeSettings.PARTIAL).toEqual({
        devices: partialDevices,
        entranceDelaySec: 15,
        exitDelaySec: 20,
        soundsEnabled: true,
        silent: false,
        alarmSensitivityDeviceCount: 2,
      });
    });

    it('returns different settings for ON and PARTIAL modes simultaneously', () => {
      const onDevices = ['DRIV:dev:door1', 'DRIV:dev:motion1'];
      const partialDevices = ['DRIV:dev:door1'];
      setupSubsystems({
        security: makeSecuritySubsystem({
          [`${SecurityAlarmMode.ATTR_DEVICES}:ON`]: onDevices,
          [`${SecurityAlarmMode.ATTR_ENTRANCEDELAYSEC}:ON`]: 45,
          [`${SecurityAlarmMode.ATTR_EXITDELAYSEC}:ON`]: 60,
          [`${SecurityAlarmMode.ATTR_SOUNDSENABLED}:ON`]: false,
          [`${SecurityAlarmMode.ATTR_SILENT}:ON`]: true,
          [`${SecurityAlarmMode.ATTR_ALARMSENSITIVITYDEVICECOUNT}:ON`]: 3,
          [`${SecurityAlarmMode.ATTR_DEVICES}:PARTIAL`]: partialDevices,
          [`${SecurityAlarmMode.ATTR_ENTRANCEDELAYSEC}:PARTIAL`]: 15,
          [`${SecurityAlarmMode.ATTR_EXITDELAYSEC}:PARTIAL`]: 20,
          [`${SecurityAlarmMode.ATTR_SOUNDSENABLED}:PARTIAL`]: true,
          [`${SecurityAlarmMode.ATTR_SILENT}:PARTIAL`]: false,
          [`${SecurityAlarmMode.ATTR_ALARMSENSITIVITYDEVICECOUNT}:PARTIAL`]: 2,
        }),
      });

      const { result } = renderHook(() => useAlarmSubsystem());

      expect(result.current.modeSettings.ON.devices).toEqual(onDevices);
      expect(result.current.modeSettings.ON.entranceDelaySec).toBe(45);
      expect(result.current.modeSettings.ON.silent).toBe(true);
      expect(result.current.modeSettings.PARTIAL.devices).toEqual(partialDevices);
      expect(result.current.modeSettings.PARTIAL.entranceDelaySec).toBe(15);
      expect(result.current.modeSettings.PARTIAL.silent).toBe(false);
    });
  });

  describe('raw subsystem references', () => {
    it('returns securitySubsystem reference', () => {
      const security = makeSecuritySubsystem();
      setupSubsystems({ security });

      const { result } = renderHook(() => useAlarmSubsystem());

      expect(result.current.securitySubsystem).toBe(security);
    });

    it('returns safetySubsystem reference', () => {
      const safety = makeSafetySubsystem();
      setupSubsystems({ safety });

      const { result } = renderHook(() => useAlarmSubsystem());

      expect(result.current.safetySubsystem).toBe(safety);
    });

    it('returns alarmSubsystem reference', () => {
      const alarm = makeAlarmSubsystem();
      setupSubsystems({ alarm });

      const { result } = renderHook(() => useAlarmSubsystem());

      expect(result.current.alarmSubsystem).toBe(alarm);
    });

    it('returns all three subsystem references when all exist', () => {
      const security = makeSecuritySubsystem();
      const safety = makeSafetySubsystem();
      const alarm = makeAlarmSubsystem();
      setupSubsystems({ security, safety, alarm });

      const { result } = renderHook(() => useAlarmSubsystem());

      expect(result.current.securitySubsystem).toBe(security);
      expect(result.current.safetySubsystem).toBe(safety);
      expect(result.current.alarmSubsystem).toBe(alarm);
    });
  });
});
