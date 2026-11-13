import {
  S2_PIN_FAILED,
  S2_PIN_TIMEOUT,
  dskGroups,
  dskTailsMatch,
  errorCode,
  formatCountdown,
  isS2FailureCode,
  isValidDsk,
  isValidS2Pin,
  secondsUntil,
} from '@/lib/zwaveS2';

const HUB_DSK = '00000-35455-41424-34445-31323-33435-21222-32425';
const LABEL_DSK = '51525-35455-41424-34445-31323-33435-21222-32425';

describe('isS2FailureCode', () => {
  it('accepts the two S2 PIN codes', () => {
    expect(isS2FailureCode(S2_PIN_TIMEOUT)).toBe(true);
    expect(isS2FailureCode(S2_PIN_FAILED)).toBe(true);
  });

  it.each([undefined, null, '', 'pairing.failed'])('rejects %j', (code) => {
    expect(isS2FailureCode(code)).toBe(false);
  });
});

describe('isValidDsk / dskGroups', () => {
  it('accepts eight five-digit groups', () => {
    expect(isValidDsk(HUB_DSK)).toBe(true);
    expect(dskGroups(HUB_DSK)).toEqual(['00000', '35455', '41424', '34445', '31323', '33435', '21222', '32425']);
  });

  it.each([
    ['seven groups', '00000-35455-41424-34445-31323-33435-21222'],
    ['a short group', '0000-35455-41424-34445-31323-33435-21222-32425'],
    ['a group above 65535', '00000-65536-41424-34445-31323-33435-21222-32425'],
    ['letters', '00000-3545a-41424-34445-31323-33435-21222-32425'],
    ['no dashes', '0000035455414243444531323334352122232425'],
    ['nothing', ''],
  ])('rejects %s', (_label, dsk) => {
    expect(isValidDsk(dsk)).toBe(false);
    expect(dskGroups(dsk)).toEqual([]);
  });
});

describe('dskTailsMatch', () => {
  it('ignores group 1', () => {
    expect(dskTailsMatch(HUB_DSK, LABEL_DSK)).toBe(true);
  });

  it('notices a difference in any of groups 2–8', () => {
    expect(dskTailsMatch(HUB_DSK, LABEL_DSK.replace(/32425$/, '32426'))).toBe(false);
    expect(dskTailsMatch(HUB_DSK, LABEL_DSK.replace('-35455-', '-35454-'))).toBe(false);
  });

  it('is false when either DSK is malformed', () => {
    expect(dskTailsMatch(HUB_DSK, 'nope')).toBe(false);
    expect(dskTailsMatch('', LABEL_DSK)).toBe(false);
  });
});

describe('isValidS2Pin', () => {
  it.each(['00000', '12345', '65535'])('accepts %s', (pin) => {
    expect(isValidS2Pin(pin)).toBe(true);
  });

  it.each(['65536', '99999', '1234', '123456', '12a45', ' 1234', ''])('rejects %j', (pin) => {
    expect(isValidS2Pin(pin)).toBe(false);
  });
});

describe('secondsUntil / formatCountdown', () => {
  it('rounds up partial seconds', () => {
    expect(secondsUntil(10_500, 0)).toBe(11);
    expect(secondsUntil(1_000, 0)).toBe(1);
  });

  it('never goes below zero', () => {
    expect(secondsUntil(0, 5_000)).toBe(0);
  });

  it('formats minutes and seconds', () => {
    expect(formatCountdown(195)).toBe('3:15');
    expect(formatCountdown(9)).toBe('0:09');
    expect(formatCountdown(0)).toBe('0:00');
  });
});

describe('errorCode', () => {
  it('reads a platform error code', () => {
    expect(errorCode({ code: 'request.param.invalid', message: 'bad' })).toBe('request.param.invalid');
  });

  it('is undefined for an Error or nothing', () => {
    expect(errorCode(new Error('boom'))).toBeUndefined();
    expect(errorCode(null)).toBeUndefined();
    expect(errorCode(undefined)).toBeUndefined();
  });
});
