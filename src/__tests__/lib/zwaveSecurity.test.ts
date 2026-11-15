import { ZWaveProtocol } from '@arcus/core';
import { securityClassLabel, zwaveSecurityInfo } from '@/lib/zwaveSecurity';

describe('zwaveSecurityInfo', () => {
  it('flags a device granted less than it asked for', () => {
    expect(zwaveSecurityInfo({
      [ZWaveProtocol.ATTR_SECURITY]: ZWaveProtocol.SECURITY_S2_UNAUTHENTICATED,
      [ZWaveProtocol.ATTR_SECURITYREQUESTED]: ZWaveProtocol.SECURITY_S2_ACCESS_CONTROL,
    })).toEqual({
      granted: ZWaveProtocol.SECURITY_S2_UNAUTHENTICATED,
      requested: ZWaveProtocol.SECURITY_S2_ACCESS_CONTROL,
      downgraded: true,
      s0Downgrade: false,
    });
  });

  it('treats S0 as lower than any S2 class', () => {
    expect(zwaveSecurityInfo({
      [ZWaveProtocol.ATTR_SECURITY]: ZWaveProtocol.SECURITY_S0,
      [ZWaveProtocol.ATTR_SECURITYREQUESTED]: ZWaveProtocol.SECURITY_S2_UNAUTHENTICATED,
    })?.downgraded).toBe(true);
  });

  it('does not flag a device that got what it asked for', () => {
    expect(zwaveSecurityInfo({
      [ZWaveProtocol.ATTR_SECURITY]: ZWaveProtocol.SECURITY_S2_AUTHENTICATED,
      [ZWaveProtocol.ATTR_SECURITYREQUESTED]: ZWaveProtocol.SECURITY_S2_AUTHENTICATED,
    })?.downgraded).toBe(false);
  });

  it('does not flag when the requested class is unknown', () => {
    expect(zwaveSecurityInfo({ [ZWaveProtocol.ATTR_SECURITY]: ZWaveProtocol.SECURITY_NONE })).toEqual({
      granted: ZWaveProtocol.SECURITY_NONE,
      requested: null,
      downgraded: false,
      s0Downgrade: false,
    });
  });

  it('reports a missing granted class as unknown, not NONE', () => {
    expect(zwaveSecurityInfo({ [ZWaveProtocol.ATTR_SECURITYREQUESTED]: ZWaveProtocol.SECURITY_S0 })).toEqual({
      granted: null,
      requested: ZWaveProtocol.SECURITY_S0,
      downgraded: false,
      s0Downgrade: false,
    });
  });

  it('does not flag unrecognized values', () => {
    expect(zwaveSecurityInfo({
      [ZWaveProtocol.ATTR_SECURITY]: 'S3',
      [ZWaveProtocol.ATTR_SECURITYREQUESTED]: ZWaveProtocol.SECURITY_S2_ACCESS_CONTROL,
    })?.downgraded).toBe(false);
  });

  describe('S0 downgrade', () => {
    it.each([
      [ZWaveProtocol.SECURITY_S0, ZWaveProtocol.SECURITY_S2_UNAUTHENTICATED],
      [ZWaveProtocol.SECURITY_S0, ZWaveProtocol.SECURITY_S2_ACCESS_CONTROL],
      [ZWaveProtocol.SECURITY_NONE, ZWaveProtocol.SECURITY_S2_AUTHENTICATED],
    ])('flags %s granted to a device that asked for %s', (granted, requested) => {
      const info = zwaveSecurityInfo({
        [ZWaveProtocol.ATTR_SECURITY]: granted,
        [ZWaveProtocol.ATTR_SECURITYREQUESTED]: requested,
      });
      expect(info?.s0Downgrade).toBe(true);
      expect(info?.downgraded).toBe(true);
    });

    it('does not flag a downgrade that stays within S2', () => {
      expect(zwaveSecurityInfo({
        [ZWaveProtocol.ATTR_SECURITY]: ZWaveProtocol.SECURITY_S2_UNAUTHENTICATED,
        [ZWaveProtocol.ATTR_SECURITYREQUESTED]: ZWaveProtocol.SECURITY_S2_AUTHENTICATED,
      })?.s0Downgrade).toBe(false);
    });

    it('does not flag an S0 device that got no security', () => {
      expect(zwaveSecurityInfo({
        [ZWaveProtocol.ATTR_SECURITY]: ZWaveProtocol.SECURITY_NONE,
        [ZWaveProtocol.ATTR_SECURITYREQUESTED]: ZWaveProtocol.SECURITY_S0,
      })?.s0Downgrade).toBe(false);
    });

    it('does not flag an S2 device whose granted class is unknown', () => {
      expect(zwaveSecurityInfo({
        [ZWaveProtocol.ATTR_SECURITYREQUESTED]: ZWaveProtocol.SECURITY_S2_ACCESS_CONTROL,
      })?.s0Downgrade).toBe(false);
    });
  });

  it('is null when neither attribute is present', () => {
    expect(zwaveSecurityInfo(undefined)).toBeNull();
    expect(zwaveSecurityInfo(null)).toBeNull();
    expect(zwaveSecurityInfo({ 'ZWAV:Manufacturer': '0086' })).toBeNull();
    expect(zwaveSecurityInfo({ [ZWaveProtocol.ATTR_SECURITY]: '' })).toBeNull();
  });
});

describe('securityClassLabel', () => {
  it('names known classes', () => {
    expect(securityClassLabel(ZWaveProtocol.SECURITY_S2_ACCESS_CONTROL)).toBe('S2 Access Control');
    expect(securityClassLabel(ZWaveProtocol.SECURITY_S0)).toBe('S0 (legacy)');
    expect(securityClassLabel(ZWaveProtocol.SECURITY_NONE)).toBe('None');
  });

  it('shows unknown values as sent', () => {
    expect(securityClassLabel('S3')).toBe('S3');
  });
});
