/**
 * Parser for Z-Wave S2 / SmartStart QR codes.
 *
 * Follows the Z-Wave Alliance "Node Provisioning QR Code Format" as
 * implemented by zwave-js (`parseQRCodeString` in packages/core/src/qr). The
 * code is a string of decimal digits:
 *
 * | Offset | Digits | Field |
 * |---|---|---|
 * | 0 | 2 | Lead-in, always `90` |
 * | 2 | 2 | Version: 00 S2, 01 SmartStart |
 * | 4 | 5 | Checksum: first two bytes (big-endian) of SHA-1 over everything from offset 9 |
 * | 9 | 3 | Requested keys bitmask: bit 0 S2 Unauthenticated, 1 S2 Authenticated, 2 S2 Access Control, 7 S0 |
 * | 12 | 40 | DSK, eight 5-digit groups; the first is the PIN |
 * | 52 | … | TLV blocks: 2-digit type (type << 1 | critical), 2-digit length, then `length` digits |
 *
 * Numbers are written in decimal: a byte as 3 digits, a 16-bit value as 5.
 * ProductType and ProductId blocks are required.
 *
 * Pure and synchronous, so the PIN prompt and a future SmartStart provisioning
 * flow can both use it.
 */

import { ZWaveProtocol } from '@arcus/core';
import { sha1 } from './sha1';

/** Security classes in the terms `ZWAV:Security` uses. */
export type ZWaveSecurityClass =
  | typeof ZWaveProtocol.SECURITY_S2_UNAUTHENTICATED
  | typeof ZWaveProtocol.SECURITY_S2_AUTHENTICATED
  | typeof ZWaveProtocol.SECURITY_S2_ACCESS_CONTROL
  | typeof ZWaveProtocol.SECURITY_S0;

export const QR_VERSION_S2 = 0;
export const QR_VERSION_SMARTSTART = 1;

/** TLV block types. */
export const QR_TLV = {
  PRODUCT_TYPE: 0x00,
  PRODUCT_ID: 0x01,
  MAX_INCLUSION_REQUEST_INTERVAL: 0x02,
  UUID16: 0x03,
  SUPPORTED_PROTOCOLS: 0x04,
} as const;

export type ZWaveQrProtocol = 'ZWAVE' | 'ZWAVE_LONG_RANGE';

/** A TLV block the parser does not interpret, kept as its raw digits. */
export interface ZWaveQrExtraBlock {
  type: number;
  value: string;
}

export interface ZWaveQrCode {
  /** 0 for an S2-only code, 1 for SmartStart. */
  version: number;
  requestedSecurityClasses: ZWaveSecurityClass[];
  /** All eight DSK groups, dash separated. */
  dsk: string;
  /** DSK group 1, the S2 PIN. */
  pin: string;
  genericDeviceClass: number;
  specificDeviceClass: number;
  installerIconType: number;
  manufacturerId: number;
  productType: number;
  productId: number;
  /** `major.minor`. */
  applicationVersion: string;
  /** Seconds. */
  maxInclusionRequestInterval?: number;
  /** 32 hex digits. */
  uuid?: string;
  supportedProtocols?: ZWaveQrProtocol[];
  extraBlocks: ZWaveQrExtraBlock[];
  /** The code itself, without whitespace or text around it. */
  code: string;
}

export class ZWaveQrError extends Error {
  constructor(reason: string) {
    super(`Invalid Z-Wave QR code: ${reason}`);
    this.name = 'ZWaveQrError';
  }
}

const MIN_LENGTH = 52;
const CANDIDATE_PATTERN = new RegExp(`90\\d{${MIN_LENGTH - 2},}`, 'g');

const SECURITY_BITS: ReadonlyArray<ZWaveSecurityClass | null> = [
  ZWaveProtocol.SECURITY_S2_UNAUTHENTICATED,
  ZWaveProtocol.SECURITY_S2_AUTHENTICATED,
  ZWaveProtocol.SECURITY_S2_ACCESS_CONTROL,
  null,
  null,
  null,
  null,
  ZWaveProtocol.SECURITY_S0,
];

function fail(reason: string): never {
  throw new ZWaveQrError(reason);
}

function readNumber(digits: string, offset: number, length: number, max: number): number {
  const part = digits.slice(offset, offset + length);
  if (part.length !== length || !/^\d+$/.test(part)) fail('invalid data');
  const value = parseInt(part, 10);
  if (value > max) fail('invalid data');
  return value;
}

/** 2 digits, 0–99. */
const readLevel = (d: string, o: number) => readNumber(d, o, 2, 99);
/** 3 digits, one byte. */
const readUInt8 = (d: string, o: number) => readNumber(d, o, 3, 0xff);
/** 5 digits, two bytes. */
const readUInt16 = (d: string, o: number) => readNumber(d, o, 5, 0xffff);

function checksum(code: string, end: number): number {
  const digest = sha1(code.slice(9, end));
  return (digest[0] << 8) | digest[1];
}

type BlockFields = Partial<Omit<ZWaveQrCode, 'extraBlocks' | 'code'>>;

/** Interpret one TLV value, or return null for a type this parser doesn't know. */
function parseBlock(type: number, data: string): BlockFields | null {
  switch (type) {
    case QR_TLV.PRODUCT_TYPE: {
      const deviceClasses = readUInt16(data, 0);
      return {
        genericDeviceClass: deviceClasses >>> 8,
        specificDeviceClass: deviceClasses & 0xff,
        installerIconType: readUInt16(data, 5),
      };
    }
    case QR_TLV.PRODUCT_ID: {
      const version = readUInt16(data, 15);
      return {
        manufacturerId: readUInt16(data, 0),
        productType: readUInt16(data, 5),
        productId: readUInt16(data, 10),
        applicationVersion: `${version >>> 8}.${version & 0xff}`,
      };
    }
    case QR_TLV.MAX_INCLUSION_REQUEST_INTERVAL:
      return { maxInclusionRequestInterval: 128 * readLevel(data, 0) };
    case QR_TLV.UUID16: {
      // Only presentation format 0 (eight 16-bit values) is understood.
      if (readLevel(data, 0) !== 0) return null;
      let uuid = '';
      for (let chunk = 0; chunk < 8; chunk++) {
        uuid += readUInt16(data, 2 + chunk * 5).toString(16).padStart(4, '0');
      }
      return { uuid };
    }
    case QR_TLV.SUPPORTED_PROTOCOLS: {
      const mask = data.length === 2 ? readLevel(data, 0)
        : data.length === 3 ? readUInt8(data, 0)
          : data.length === 5 ? readUInt16(data, 0)
            : 0;
      const supportedProtocols: ZWaveQrProtocol[] = [];
      if (mask & 0b01) supportedProtocols.push('ZWAVE');
      if (mask & 0b10) supportedProtocols.push('ZWAVE_LONG_RANGE');
      return { supportedProtocols };
    }
    default:
      return null;
  }
}

/**
 * Parse a code with nothing around it. With `findEnd`, the code may be
 * followed by extra digits: it ends after the first block where the checksum
 * matches.
 */
function parseExact(code: string, findEnd: boolean): ZWaveQrCode {
  if (!code.startsWith('90')) fail('must start with 90');
  if (code.length < MIN_LENGTH) fail('too short');
  if (!/^\d+$/.test(code)) fail('contains invalid characters');

  const version = readLevel(code, 2);
  if (version > QR_VERSION_SMARTSTART) fail('invalid version');

  const expected = readUInt16(code, 4);
  if (!findEnd && checksum(code, code.length) !== expected) fail('invalid checksum');

  const keys = readUInt8(code, 9);
  const requestedSecurityClasses: ZWaveSecurityClass[] = [];
  for (let bit = 0; bit < 8; bit++) {
    if (!(keys & (1 << bit))) continue;
    const securityClass = SECURITY_BITS[bit];
    if (!securityClass) fail('invalid security class requested');
    requestedSecurityClasses.push(securityClass);
  }

  const groups: string[] = [];
  let offset = 12;
  for (let group = 0; group < 8; group++) {
    groups.push(String(readUInt16(code, offset)).padStart(5, '0'));
    offset += 5;
  }

  let fields: BlockFields = {};
  const extraBlocks: ZWaveQrExtraBlock[] = [];
  let hasProductType = false;
  let hasProductId = false;
  let ended = false;

  while (offset + 4 <= code.length) {
    const typeCritical = readLevel(code, offset);
    const length = readLevel(code, offset + 2);
    if (offset + 4 + length > code.length) {
      if (findEnd) break;
      fail('incomplete TLV block');
    }
    const type = typeCritical >>> 1;
    const critical = (typeCritical & 1) === 1;
    const data = code.slice(offset + 4, offset + 4 + length);
    offset += 4 + length;

    let parsed: BlockFields | null = null;
    try {
      parsed = parseBlock(type, data);
    } catch (e) {
      // A malformed optional block is kept raw; required or critical ones are fatal.
      if (critical || type === QR_TLV.PRODUCT_TYPE || type === QR_TLV.PRODUCT_ID) throw e;
    }
    if (parsed) {
      fields = { ...fields, ...parsed };
    } else {
      if (critical) fail('unsupported critical TLV block');
      extraBlocks.push({ type, value: data });
    }
    if (type === QR_TLV.PRODUCT_TYPE) hasProductType = true;
    if (type === QR_TLV.PRODUCT_ID) hasProductId = true;

    if (findEnd && hasProductType && hasProductId && checksum(code, offset) === expected) {
      ended = true;
      break;
    }
  }

  if (!hasProductType || !hasProductId) fail('missing required fields');
  if (findEnd ? !ended : offset !== code.length) fail(findEnd ? 'invalid checksum' : 'trailing data');

  return {
    genericDeviceClass: 0,
    specificDeviceClass: 0,
    installerIconType: 0,
    manufacturerId: 0,
    productType: 0,
    productId: 0,
    applicationVersion: '0.0',
    ...fields,
    version,
    requestedSecurityClasses,
    dsk: groups.join('-'),
    pin: groups[0],
    extraBlocks,
    code: code.slice(0, offset),
  };
}

/**
 * Parse the text decoded from a Z-Wave QR code. Whitespace anywhere is
 * ignored, and if the whole text isn't a valid code, the first valid code
 * inside it is used. Throws ZWaveQrError if there is none.
 */
export function parseZWaveQrCode(text: string): ZWaveQrCode {
  const normalized = text.replace(/\s/g, '');
  try {
    return parseExact(normalized, false);
  } catch (e) {
    if (!(e instanceof ZWaveQrError)) throw e;
  }

  const pattern = new RegExp(CANDIDATE_PATTERN);
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(normalized)) !== null) {
    try {
      return parseExact(match[0], true);
    } catch (e) {
      if (!(e instanceof ZWaveQrError)) throw e;
      // A valid code may start inside this candidate.
      pattern.lastIndex = match.index + 2;
    }
  }
  return fail('no valid QR code found');
}

/** Like parseZWaveQrCode, but returns null instead of throwing. */
export function tryParseZWaveQrCode(text: string): ZWaveQrCode | null {
  try {
    return parseZWaveQrCode(text);
  } catch (e) {
    if (e instanceof ZWaveQrError) return null;
    throw e;
  }
}
