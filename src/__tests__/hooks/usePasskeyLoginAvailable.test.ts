import { renderHook } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import { usePasskeyLoginAvailable } from '@/hooks/usePasskeyLoginAvailable';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockIsPasskeyLoginSupported = jest.fn<boolean, []>();

jest.mock('@arcus/core/passkey', () => ({
  isPasskeyLoginSupported: () => mockIsPasskeyLoginSupported(),
}));

// ── Helpers ───────────────────────────────────────────────────────────

function Probe() {
  return createElement('span', null, String(usePasskeyLoginAvailable()));
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.NEXT_PUBLIC_ENABLE_PASSKEYS = '1';
  mockIsPasskeyLoginSupported.mockReturnValue(true);
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_ENABLE_PASSKEYS;
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('usePasskeyLoginAvailable', () => {
  it('is true when passkeys are enabled and the browser supports them', () => {
    const { result } = renderHook(() => usePasskeyLoginAvailable());

    expect(result.current).toBe(true);
  });

  it.each([undefined, '0', 'true'])('is false when NEXT_PUBLIC_ENABLE_PASSKEYS is %p', (value) => {
    if (value === undefined) delete process.env.NEXT_PUBLIC_ENABLE_PASSKEYS;
    else process.env.NEXT_PUBLIC_ENABLE_PASSKEYS = value;

    const { result } = renderHook(() => usePasskeyLoginAvailable());

    expect(result.current).toBe(false);
  });

  it('is false when the browser does not support passkey login', () => {
    mockIsPasskeyLoginSupported.mockReturnValue(false);

    const { result } = renderHook(() => usePasskeyLoginAvailable());

    expect(result.current).toBe(false);
  });

  it('is false while prerendering, without checking the browser', () => {
    expect(renderToString(createElement(Probe))).toBe('<span>false</span>');
    expect(mockIsPasskeyLoginSupported).not.toHaveBeenCalled();
  });
});
