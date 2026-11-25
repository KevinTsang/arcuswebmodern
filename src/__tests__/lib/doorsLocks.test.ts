import { chimeConfigValue, normalizeAuthorizationByLock, normalizeChimeConfig } from '@/lib/doorsLocks';

const LOCK = 'DRIV:dev:lock';
const ALICE = 'SERV:person:alice';

describe('normalizeAuthorizationByLock', () => {
  it('keeps well-formed entries', () => {
    expect(normalizeAuthorizationByLock({ [LOCK]: [{ person: ALICE, state: 'AUTHORIZED' }] })).toEqual({
      [LOCK]: [{ person: ALICE, state: 'AUTHORIZED' }],
    });
  });

  it('drops locks that are not mapped to arrays', () => {
    expect(normalizeAuthorizationByLock({ [LOCK]: null, 'DRIV:dev:b': { person: ALICE } })).toEqual({});
  });

  it('drops entries without a person or with an unknown state', () => {
    expect(normalizeAuthorizationByLock({
      [LOCK]: [
        { person: ALICE, state: 'PENDING' },
        { state: 'AUTHORIZED' },
        { person: 'SERV:person:bob', state: 'MAYBE' },
        null,
        'x',
      ],
    })).toEqual({ [LOCK]: [{ person: ALICE, state: 'PENDING' }] });
  });

  it('returns an empty map for a missing or non-object value', () => {
    expect(normalizeAuthorizationByLock(undefined)).toEqual({});
    expect(normalizeAuthorizationByLock(null)).toEqual({});
    expect(normalizeAuthorizationByLock([])).toEqual({});
  });
});

describe('normalizeChimeConfig', () => {
  it('keeps well-formed entries and drops the rest', () => {
    expect(normalizeChimeConfig([
      { device: 'DRIV:dev:a', enabled: true },
      { device: 'DRIV:dev:b' },
      { enabled: false },
      null,
    ])).toEqual([{ device: 'DRIV:dev:a', enabled: true }]);
  });

  it('returns an empty list for a non-array value', () => {
    expect(normalizeChimeConfig({ device: 'DRIV:dev:a', enabled: true })).toEqual([]);
    expect(normalizeChimeConfig(undefined)).toEqual([]);
  });
});

describe('chimeConfigValue', () => {
  it('writes one struct per device', () => {
    expect(chimeConfigValue([{ device: 'DRIV:dev:a', enabled: false }])).toEqual([
      { device: 'DRIV:dev:a', enabled: false },
    ]);
  });
});
