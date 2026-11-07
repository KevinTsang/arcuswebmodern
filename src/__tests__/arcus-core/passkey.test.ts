import { isPasskeyLoginSupported, passkeyLogin, PasskeyRequestError } from '@arcus/core/passkey';

// ── Mocks ─────────────────────────────────────────────────────────────

jest.mock('@arcus/core/config', () => ({
  getConfig: () => ({ apiUrl: 'https://platform.test/', version: '1.0' }),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// jsdom has no WebAuthn, so install the pieces passkeyLogin uses.
const mockParseRequestOptions = jest.fn();
const mockCredentialsGet = jest.fn();

function installWebAuthn(): void {
  Object.defineProperty(window, 'PublicKeyCredential', {
    configurable: true,
    writable: true,
    value: { parseRequestOptionsFromJSON: mockParseRequestOptions },
  });
  Object.defineProperty(navigator, 'credentials', {
    configurable: true,
    value: { get: mockCredentialsGet },
  });
}

function removeWebAuthn(): void {
  delete (window as { PublicKeyCredential?: unknown }).PublicKeyCredential;
  delete (navigator as { credentials?: unknown }).credentials;
}

// ── Helpers ───────────────────────────────────────────────────────────

const OPTIONS_JSON = { challenge: 'Y2hhbGxlbmdl', rpId: 'platform.test', userVerification: 'required' };
const PARSED_OPTIONS = { challenge: new ArrayBuffer(9) };
const CREDENTIAL_JSON = { id: 'cred-1', rawId: 'cred-1', type: 'public-key', response: {} };

function ok(body: object = {}) {
  return { ok: true, status: 200, json: () => Promise.resolve(body) };
}

function failed(status: number) {
  return { ok: false, status, json: () => Promise.resolve({ error: 'nope' }) };
}

/** The parsed JSON body of the nth fetch call. */
function body(call: number) {
  return JSON.parse(mockFetch.mock.calls[call][1].body);
}

beforeEach(() => {
  jest.clearAllMocks();
  installWebAuthn();
  mockFetch
    .mockResolvedValueOnce(ok({ requestId: 'req-1', publicKey: OPTIONS_JSON }))
    .mockResolvedValueOnce(ok());
  mockParseRequestOptions.mockReturnValue(PARSED_OPTIONS);
  mockCredentialsGet.mockResolvedValue({ toJSON: () => CREDENTIAL_JSON });
});

afterEach(() => {
  mockFetch.mockReset();
  removeWebAuthn();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('isPasskeyLoginSupported', () => {
  it('is true when the browser can parse JSON request options', () => {
    expect(isPasskeyLoginSupported()).toBe(true);
  });

  it('is false without WebAuthn', () => {
    removeWebAuthn();

    expect(isPasskeyLoginSupported()).toBe(false);
  });

  it('is false when the browser cannot parse JSON request options', () => {
    Object.defineProperty(window, 'PublicKeyCredential', { configurable: true, writable: true, value: {} });

    expect(isPasskeyLoginSupported()).toBe(false);
  });
});

describe('passkeyLogin', () => {
  it('asks the platform for login options with an empty JSON body', async () => {
    await passkeyLogin(false);

    expect(mockFetch).toHaveBeenNthCalledWith(1, 'https://platform.test/passkey/LoginOptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Client-Version': '1.0' },
      credentials: 'include',
      body: '{}',
    });
  });

  it('prompts for a passkey with the parsed options', async () => {
    await passkeyLogin(false);

    expect(mockParseRequestOptions).toHaveBeenCalledWith(OPTIONS_JSON);
    expect(mockCredentialsGet).toHaveBeenCalledWith({ publicKey: PARSED_OPTIONS });
  });

  it('logs in with the requestId and the credential as JSON', async () => {
    await passkeyLogin(false);

    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      'https://platform.test/passkey/Login',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
    expect(body(1)).toEqual({ requestId: 'req-1', credential: CREDENTIAL_JSON, public: false });
  });

  it('passes the public computer flag', async () => {
    await passkeyLogin(true);

    expect(body(1)).toMatchObject({ public: true });
  });

  it('rejects with the status when the options request fails, without prompting', async () => {
    mockFetch.mockReset().mockResolvedValueOnce(failed(404));

    const login = passkeyLogin(false);

    await expect(login).rejects.toBeInstanceOf(PasskeyRequestError);
    await expect(login).rejects.toMatchObject({ status: 404 });
    expect(mockCredentialsGet).not.toHaveBeenCalled();
  });

  it('rejects with the status when the platform refuses the passkey', async () => {
    mockFetch.mockReset()
      .mockResolvedValueOnce(ok({ requestId: 'req-1', publicKey: OPTIONS_JSON }))
      .mockResolvedValueOnce(failed(401));

    await expect(passkeyLogin(false)).rejects.toMatchObject({ name: 'PasskeyRequestError', status: 401 });
  });

  it('rejects with the browser error when the prompt fails, without logging in', async () => {
    mockCredentialsGet.mockRejectedValueOnce(new DOMException('closed', 'NotAllowedError'));

    await expect(passkeyLogin(false)).rejects.toMatchObject({ name: 'NotAllowedError' });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('rejects with NotAllowedError when the prompt ends without a credential', async () => {
    mockCredentialsGet.mockResolvedValueOnce(null);

    await expect(passkeyLogin(false)).rejects.toMatchObject({ name: 'NotAllowedError' });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('rejects with status 0 when the platform cannot be reached', async () => {
    mockFetch.mockReset().mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const login = passkeyLogin(false);

    await expect(login).rejects.toBeInstanceOf(PasskeyRequestError);
    await expect(login).rejects.toMatchObject({ status: 0, message: 'Passkey request could not reach the platform' });
    expect(mockCredentialsGet).not.toHaveBeenCalled();
  });

  it('rejects with status 0 when the platform cannot be reached to log in', async () => {
    mockFetch.mockReset()
      .mockResolvedValueOnce(ok({ requestId: 'req-1', publicKey: OPTIONS_JSON }))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(passkeyLogin(false)).rejects.toMatchObject({ name: 'PasskeyRequestError', status: 0 });
  });
});
