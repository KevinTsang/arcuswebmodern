import { createHash } from 'crypto';
import { sha1 } from '@/lib/sha1';

const hex = (bytes: Uint8Array) => Buffer.from(bytes).toString('hex');

describe('sha1', () => {
  it.each([
    ['', 'da39a3ee5e6b4b0d3255bfef95601890afd80709'],
    ['abc', 'a9993e364706816aba3e25717850c26c9cd0d89d'],
    ['abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq', '84983e441c3bd26ebaae4aa1f95129e5e54670f1'],
  ])('matches the FIPS 180 vector for %j', (input, expected) => {
    expect(hex(sha1(input))).toBe(expected);
  });

  it.each([55, 56, 63, 64, 65, 119, 128, 1000])('matches Node for a %i-character digit string', (length) => {
    const input = Array.from({ length }, (_, i) => String(i % 10)).join('');
    expect(hex(sha1(input))).toBe(createHash('sha1').update(input, 'ascii').digest('hex'));
  });

  it('returns 20 bytes', () => {
    expect(sha1('x')).toHaveLength(20);
  });
});
