import { Base, Product } from '@arcus/core';
import {
  OAUTH_MESSAGE,
  buildOAuthPopupUrl,
  formValuesForSearch,
  initialFormValues,
  isFormValid,
  isOAuthPopupMessage,
  isOAuthProduct,
  oauthOrigin,
  supportUrl,
  validateFormInput,
} from '@/lib/cloudPairing';
import type { PairingInput } from '@/arcus/types';
import type { PairingProduct } from '@/store/entityTypes';

const product = (overrides: Partial<PairingProduct> = {}): PairingProduct => ({
  [Base.ATTR_ADDRESS]: 'SERV:product:p1',
  [Product.ATTR_NAME]: 'Thermostat',
  [Product.ATTR_VENDOR]: 'Nest',
  [Product.ATTR_HUBREQUIRED]: false,
  [Product.ATTR_ID]: 'p1',
  ...overrides,
});

describe('isOAuthProduct', () => {
  it('is true for OAuth products', () => {
    expect(isOAuthProduct(product({ [Product.ATTR_PAIRINGMODE]: Product.PAIRINGMODE_OAUTH }))).toBe(true);
  });

  it('is true for Lutron bridged devices, ignoring case', () => {
    expect(isOAuthProduct(product({
      [Product.ATTR_PAIRINGMODE]: 'bridged_device',
      [Product.ATTR_PROTOFAMILY]: 'Lutron',
    }))).toBe(true);
  });

  it('is false for other bridged devices', () => {
    expect(isOAuthProduct(product({
      [Product.ATTR_PAIRINGMODE]: Product.PAIRINGMODE_BRIDGED_DEVICE,
      [Product.ATTR_PROTOFAMILY]: 'Hue',
    }))).toBe(false);
  });

  it('is false for hub products, missing modes and no product', () => {
    expect(isOAuthProduct(product({ [Product.ATTR_PAIRINGMODE]: Product.PAIRINGMODE_HUB }))).toBe(false);
    expect(isOAuthProduct(product())).toBe(false);
    expect(isOAuthProduct(null)).toBe(false);
  });
});

describe('buildOAuthPopupUrl', () => {
  it('appends the web template to a URL with a query', () => {
    expect(buildOAuthPopupUrl('https://o.example.com/a?b=1')).toBe('https://o.example.com/a?b=1&template=v2-web');
  });

  it('starts a query when the URL has none', () => {
    expect(buildOAuthPopupUrl('https://o.example.com/a')).toBe('https://o.example.com/a?template=v2-web');
  });
});

describe('oauthOrigin', () => {
  it('returns the URL origin', () => {
    expect(oauthOrigin('https://o.example.com:8443/a?b=1')).toBe('https://o.example.com:8443');
  });

  it('returns null for an invalid URL', () => {
    expect(oauthOrigin('not a url')).toBeNull();
  });
});

describe('isOAuthPopupMessage', () => {
  it('accepts known message types', () => {
    expect(isOAuthPopupMessage({ type: OAUTH_MESSAGE.COMPLETE })).toBe(true);
    expect(isOAuthPopupMessage({ type: OAUTH_MESSAGE.EXIT_TO_SUPPORT })).toBe(true);
  });

  it('rejects other data', () => {
    expect(isOAuthPopupMessage(null)).toBe(false);
    expect(isOAuthPopupMessage(undefined)).toBe(false);
    expect(isOAuthPopupMessage({ type: 'something-else' } as never)).toBe(false);
  });
});

describe('supportUrl', () => {
  it('appends /support to the redirect base URL', () => {
    expect(supportUrl('https://r.example.com')).toBe('https://r.example.com/support');
    expect(supportUrl('https://r.example.com/')).toBe('https://r.example.com/support');
  });

  it('returns null without a base URL', () => {
    expect(supportUrl(undefined)).toBeNull();
    expect(supportUrl('')).toBeNull();
  });
});

describe('pairing form helpers', () => {
  const form: PairingInput[] = [
    { type: 'TEXT', name: 'sn', label: 'Serial', required: true, minlen: 3, maxlen: 5 },
    { type: 'TEXT', name: 'note', label: 'Note' },
    { type: 'HIDDEN', name: 'model', label: 'Model', value: 'X1' },
  ];

  it('initialFormValues uses preset values or empty strings', () => {
    expect(initialFormValues(form)).toEqual({ sn: '', note: '', model: 'X1' });
  });

  it('validateFormInput checks required and length rules', () => {
    expect(validateFormInput(form[0], '')).toBe('Serial is required');
    expect(validateFormInput(form[0], '  ')).toBe('Serial is required');
    expect(validateFormInput(form[0], 'ab')).toBe('Serial must be at least 3 characters');
    expect(validateFormInput(form[0], 'abcdef')).toBe('Serial must be at most 5 characters');
    expect(validateFormInput(form[0], 'abc')).toBeNull();
  });

  it('validateFormInput allows empty optional and hidden inputs', () => {
    expect(validateFormInput(form[1], '')).toBeNull();
    expect(validateFormInput({ type: 'HIDDEN', name: 'h', label: 'H', required: true }, '')).toBeNull();
  });

  it('isFormValid checks every input', () => {
    expect(isFormValid(form, { sn: 'abc' })).toBe(true);
    expect(isFormValid(form, { sn: '' })).toBe(false);
    expect(isFormValid([], {})).toBe(true);
  });

  it('formValuesForSearch trims every value and fills missing ones', () => {
    expect(formValuesForSearch(form, { sn: ' abc ', model: 'X1' })).toEqual({ sn: 'abc', note: '', model: 'X1' });
  });
});
