import { safeRedirectPath } from '@/lib/safeRedirect';

const ORIGIN = 'https://localdev.arcus.example:8443';

describe('safeRedirectPath', () => {
  it('allows same-origin paths, keeping query and hash', () => {
    expect(safeRedirectPath('/devices', ORIGIN)).toBe('/devices');
    expect(safeRedirectPath('/settings?tab=profile#pin', ORIGIN)).toBe('/settings?tab=profile#pin');
  });

  it('allows an absolute URL on the same origin', () => {
    expect(safeRedirectPath(`${ORIGIN}/rules`, ORIGIN)).toBe('/rules');
  });

  it.each([
    ['absolute URL', 'https://evil.example/login'],
    ['protocol-relative URL', '//evil.example/login'],
    ['backslash host', '/\\evil.example'],
    ['tab-injected host', '/\t/evil.example'],
    ['javascript: URL', 'javascript:alert(1)'],
  ])('rejects %s', (_, target) => {
    expect(safeRedirectPath(target, ORIGIN)).toBe('/');
  });

  it('returns the fallback for a missing target', () => {
    expect(safeRedirectPath(null, ORIGIN)).toBe('/');
    expect(safeRedirectPath('', ORIGIN, '/home')).toBe('/home');
  });

  it('defaults to the current window origin', () => {
    expect(safeRedirectPath('/scenes')).toBe('/scenes');
    expect(safeRedirectPath('https://evil.example/')).toBe('/');
  });
});
