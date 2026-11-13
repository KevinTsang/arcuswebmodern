import { createHash } from 'crypto';
import { ZWaveProtocol } from '@arcus/core';
import {
  QR_VERSION_S2,
  QR_VERSION_SMARTSTART,
  ZWaveQrError,
  parseZWaveQrCode,
  tryParseZWaveQrCode,
} from '@/lib/zwaveQr';

// ── Helpers ───────────────────────────────────────────────────────────

// Example codes from the Z-Wave QR spec, as used in zwave-js's parse.test.ts.
const ACME_DIMMER =
  '900132782003515253545541424344453132333435212223242500100435301537022065520001000000300578';
const ACME_DIMMER_S2_ONLY =
  '900032782003515253545541424344453132333435212223242500100435301537022065520001000000300578';
const OSCORP_LOCK =
  '9001346230075152535455414243444531323334352122232425001016387007680220655210100000017002880642002122232425414243444511121314153132333435';
const BAD_CHECKSUM =
  '900199999003090360850151462432730701509765221393752300100179303072022000881000020000900257';
const DSK = '51525-35455-41424-34445-31323-33435-21222-32425';

const pad = (value: number, digits: number) => String(value).padStart(digits, '0');
/** A TLV block: type and critical flag, two-digit length, then the value digits. */
const tlv = (type: number, value: string, critical = false) =>
  pad((type << 1) | (critical ? 1 : 0), 2) + pad(value.length, 2) + value;
const PRODUCT_TYPE = tlv(0, pad(0x1101, 5) + pad(0x0601, 5));
const PRODUCT_ID = tlv(1, pad(0xfff0, 5) + pad(0x0064, 5) + pad(0x0003, 5) + pad(0x0242, 5));

/** Build a code with a correct checksum, computed with Node's SHA-1. */
function buildCode({
  version = 1,
  keys = 0b011,
  dsk = DSK,
  blocks = PRODUCT_TYPE + PRODUCT_ID,
}: { version?: number; keys?: number; dsk?: string; blocks?: string } = {}): string {
  const body = pad(keys, 3) + dsk.split('-').join('') + blocks;
  const digest = createHash('sha1').update(body, 'ascii').digest();
  return `90${pad(version, 2)}${pad(digest.readUInt16BE(0), 5)}${body}`;
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('parseZWaveQrCode – spec examples', () => {
  it('parses the Acme Light Dimmer SmartStart code', () => {
    expect(parseZWaveQrCode(ACME_DIMMER)).toEqual({
      version: QR_VERSION_SMARTSTART,
      requestedSecurityClasses: [
        ZWaveProtocol.SECURITY_S2_UNAUTHENTICATED,
        ZWaveProtocol.SECURITY_S2_AUTHENTICATED,
      ],
      dsk: DSK,
      pin: '51525',
      applicationVersion: '2.66',
      genericDeviceClass: 0x11,
      specificDeviceClass: 0x01,
      installerIconType: 0x0601,
      manufacturerId: 0xfff0,
      productType: 0x0064,
      productId: 0x0003,
      extraBlocks: [],
      code: ACME_DIMMER,
    });
  });

  it('parses an S2-only (version 00) code', () => {
    const result = parseZWaveQrCode(ACME_DIMMER_S2_ONLY);
    expect(result.version).toBe(QR_VERSION_S2);
    expect(result.dsk).toBe(DSK);
  });

  it('parses the Oscorp Door Lock with a UUID block', () => {
    const result = parseZWaveQrCode(OSCORP_LOCK);
    expect(result).toMatchObject({
      requestedSecurityClasses: [
        ZWaveProtocol.SECURITY_S2_UNAUTHENTICATED,
        ZWaveProtocol.SECURITY_S2_AUTHENTICATED,
        ZWaveProtocol.SECURITY_S2_ACCESS_CONTROL,
      ],
      uuid: '52e67ea9a1d0868d2b717ab77a5b829b',
      applicationVersion: '1.32',
      genericDeviceClass: 0x40,
      specificDeviceClass: 0x03,
      installerIconType: 0x0300,
      manufacturerId: 0xfff1,
      productType: 0x03e8,
      productId: 0x0011,
    });
  });
});

describe('parseZWaveQrCode – invalid codes', () => {
  it.each([
    ['does not start with 90', '010000000000000000000000000000000000000000000000000000'],
    ['is too short', '900012345001'],
    ['has an incorrect checksum', BAD_CHECKSUM],
    ['contains letters', `${ACME_DIMMER.slice(0, 20)}A${ACME_DIMMER.slice(21)}`],
    ['is empty', ''],
  ])('throws when the code %s', (_reason, code) => {
    expect(() => parseZWaveQrCode(code)).toThrow(ZWaveQrError);
  });

  it('names the problem in the error', () => {
    expect(() => parseZWaveQrCode(BAD_CHECKSUM)).toThrow('Invalid Z-Wave QR code');
  });

  it('rejects an unknown version', () => {
    expect(() => parseZWaveQrCode(buildCode({ version: 2 }))).toThrow(ZWaveQrError);
  });

  it('rejects requested keys that are not security classes', () => {
    expect(() => parseZWaveQrCode(buildCode({ keys: 0b1000 }))).toThrow(ZWaveQrError);
  });

  it('rejects a DSK group above 65535', () => {
    expect(() => parseZWaveQrCode(buildCode({ dsk: DSK.replace('35455', '65536') }))).toThrow(ZWaveQrError);
  });

  it('requires ProductType and ProductId blocks', () => {
    expect(() => parseZWaveQrCode(buildCode({ blocks: PRODUCT_TYPE }))).toThrow(ZWaveQrError);
    expect(() => parseZWaveQrCode(buildCode({ blocks: PRODUCT_ID }))).toThrow(ZWaveQrError);
  });

  it('rejects an unknown critical block', () => {
    expect(() => parseZWaveQrCode(buildCode({ blocks: PRODUCT_TYPE + PRODUCT_ID + tlv(0x10, '123', true) })))
      .toThrow(ZWaveQrError);
  });

  it('rejects a malformed ProductId block', () => {
    expect(() => parseZWaveQrCode(buildCode({ blocks: PRODUCT_TYPE + tlv(1, '99999') }))).toThrow(ZWaveQrError);
  });

  it('rejects a truncated block', () => {
    expect(() => parseZWaveQrCode(buildCode({ blocks: `${PRODUCT_TYPE}${PRODUCT_ID}0210` }))).toThrow(ZWaveQrError);
  });
});

describe('parseZWaveQrCode – fields', () => {
  it('reads S0 and every S2 class from the keys bitmask', () => {
    expect(parseZWaveQrCode(buildCode({ keys: 0b10000111 })).requestedSecurityClasses).toEqual([
      ZWaveProtocol.SECURITY_S2_UNAUTHENTICATED,
      ZWaveProtocol.SECURITY_S2_AUTHENTICATED,
      ZWaveProtocol.SECURITY_S2_ACCESS_CONTROL,
      ZWaveProtocol.SECURITY_S0,
    ]);
  });

  it('allows no requested keys', () => {
    expect(parseZWaveQrCode(buildCode({ keys: 0 })).requestedSecurityClasses).toEqual([]);
  });

  it('keeps leading zeros in DSK groups and the PIN', () => {
    const dsk = '00042-00000-65535-00001-31323-33435-21222-32425';
    const result = parseZWaveQrCode(buildCode({ dsk }));
    expect(result.dsk).toBe(dsk);
    expect(result.pin).toBe('00042');
  });

  it('reads the inclusion interval and supported protocols', () => {
    const result = parseZWaveQrCode(buildCode({
      blocks: PRODUCT_TYPE + PRODUCT_ID + tlv(2, '05') + tlv(4, '03'),
    }));
    expect(result.maxInclusionRequestInterval).toBe(640);
    expect(result.supportedProtocols).toEqual(['ZWAVE', 'ZWAVE_LONG_RANGE']);
  });

  it('reads supported protocols written as 3 or 5 digits', () => {
    expect(parseZWaveQrCode(buildCode({ blocks: PRODUCT_TYPE + PRODUCT_ID + tlv(4, '001') })).supportedProtocols)
      .toEqual(['ZWAVE']);
    expect(parseZWaveQrCode(buildCode({ blocks: PRODUCT_TYPE + PRODUCT_ID + tlv(4, '00002') })).supportedProtocols)
      .toEqual(['ZWAVE_LONG_RANGE']);
  });

  it('keeps unknown non-critical blocks raw', () => {
    const result = parseZWaveQrCode(buildCode({ blocks: PRODUCT_TYPE + tlv(0x10, '0123') + PRODUCT_ID }));
    expect(result.extraBlocks).toEqual([{ type: 0x10, value: '0123' }]);
    expect(result.manufacturerId).toBe(0xfff0);
  });

  it('keeps a UUID block in an unsupported format raw', () => {
    const result = parseZWaveQrCode(buildCode({ blocks: PRODUCT_TYPE + PRODUCT_ID + tlv(3, '0112') }));
    expect(result.uuid).toBeUndefined();
    expect(result.extraBlocks).toEqual([{ type: 3, value: '0112' }]);
  });

  it('keeps a malformed optional block raw', () => {
    const result = parseZWaveQrCode(buildCode({ blocks: PRODUCT_TYPE + PRODUCT_ID + tlv(2, '1') }));
    expect(result.maxInclusionRequestInterval).toBeUndefined();
    expect(result.extraBlocks).toEqual([{ type: 2, value: '1' }]);
  });
});

describe('parseZWaveQrCode – text around the code', () => {
  it('ignores surrounding whitespace', () => {
    expect(parseZWaveQrCode(`  ${ACME_DIMMER}\n`).dsk).toBe(DSK);
  });

  it('ignores whitespace and newlines in the middle', () => {
    const spaced = `${ACME_DIMMER.slice(0, 30)} \n\t${ACME_DIMMER.slice(30)}`;
    expect(parseZWaveQrCode(spaced).code).toBe(ACME_DIMMER);
  });

  it('finds the code after other text', () => {
    expect(parseZWaveQrCode(`S2:${ACME_DIMMER}`).code).toBe(ACME_DIMMER);
  });

  it('finds the code before other text and extra digits', () => {
    expect(parseZWaveQrCode(`${ACME_DIMMER}1234`).code).toBe(ACME_DIMMER);
    expect(parseZWaveQrCode(`${ACME_DIMMER};model=x`).code).toBe(ACME_DIMMER);
  });

  it('skips an invalid candidate to find a valid one', () => {
    expect(parseZWaveQrCode(`${BAD_CHECKSUM} ${OSCORP_LOCK}`).code).toBe(OSCORP_LOCK);
  });

  it('throws when no candidate is valid', () => {
    expect(() => parseZWaveQrCode(`hello ${BAD_CHECKSUM}`)).toThrow('no valid QR code found');
  });
});

describe('tryParseZWaveQrCode', () => {
  it('returns the parsed code', () => {
    expect(tryParseZWaveQrCode(ACME_DIMMER)?.pin).toBe('51525');
  });

  it('returns null for text that is not a Z-Wave code', () => {
    expect(tryParseZWaveQrCode('https://example.com')).toBeNull();
  });
});
