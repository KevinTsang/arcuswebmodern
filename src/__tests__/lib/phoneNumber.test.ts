import { formatPhoneNumber, usPhoneDigits } from '@/lib/phoneNumber';

describe('usPhoneDigits', () => {
  it.each([
    ['5551234567', '5551234567'],
    ['(555) 123-4567', '5551234567'],
    ['555-123-4567', '5551234567'],
    ['555.123.4567', '5551234567'],
    [' 555 123 4567 ', '5551234567'],
    ['15551234567', '5551234567'],
    ['1 555-123-4567', '5551234567'],
    ['1-555-123-4567', '5551234567'],
    ['+1 (555) 123-4567', '5551234567'],
    ['+15551234567', '5551234567'],
  ])('accepts %s', (value, digits) => {
    expect(usPhoneDigits(value)).toBe(digits);
  });

  it.each([
    '',
    '555-1234',
    '555123456',
    '555123456789',
    '25551234567', // 11 digits without the US country code
    '+5551234567', // a + must be followed by the country code 1
    '+64 9 123 4567',
    '1+5551234567',
    'call 555 123 4567 after 5pm',
    'abc5551234567',
    '555/123/4567',
    '555-123-4567#',
    '555-123-4567 x12',
  ])('rejects %s', (value) => {
    expect(usPhoneDigits(value)).toBeNull();
  });
});

describe('formatPhoneNumber', () => {
  it.each(['5551234567', '555.123.4567', '1 555 123 4567', '+1 (555) 123-4567'])(
    'formats %s the way the platform stores it',
    (value) => {
      expect(formatPhoneNumber(value)).toBe('(555) 123-4567');
    },
  );

  it('returns null for an invalid number', () => {
    expect(formatPhoneNumber('555-1234')).toBeNull();
  });
});
