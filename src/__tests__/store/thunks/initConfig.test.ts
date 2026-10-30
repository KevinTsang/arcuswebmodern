/**
 * Tests for initializeCoreConfig — runtime server.json with build-time fallback.
 */

// ── Mocks ─────────────────────────────────────────────────────────────

const mockSetConfig = jest.fn();
const mockBridgeConfigure = jest.fn();

jest.mock('@arcus/core/config', () => ({ setConfig: (...args: any[]) => mockSetConfig(...args) }));
jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { configure: (...args: any[]) => mockBridgeConfigure(...args) },
}));

const mockFetch = jest.fn();

// ── Helpers ───────────────────────────────────────────────────────────

const ORIGINAL_ENV = process.env;
const ORIGINAL_FETCH = global.fetch;

const BUILD_ENV = {
  NEXT_PUBLIC_API_URL: 'https://build.example.com',
  NEXT_PUBLIC_WS_URL: 'wss://build.example.com',
  NEXT_PUBLIC_REDIRECT_URL: 'https://build-redirect.example.com',
  NEXT_PUBLIC_APP_VERSION: '2018.10.2',
};

function setEnv(env: Partial<NodeJS.ProcessEnv>) {
  process.env = { ...ORIGINAL_ENV, ...BUILD_ENV, ...env };
}

function jsonResponse(body: object, ok = true) {
  return { ok, json: () => Promise.resolve(body) };
}

async function loadInit() {
  return (await import('@/store/thunks/initConfig')).initializeCoreConfig;
}

beforeEach(() => {
  jest.clearAllMocks();
  // Fresh module per test so the cached server.json does not leak between tests.
  jest.resetModules();
  global.fetch = mockFetch;
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  global.fetch = ORIGINAL_FETCH;
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('initializeCoreConfig – outside production', () => {
  it('uses the build-time values without fetching server.json', async () => {
    setEnv({ NODE_ENV: 'test' });
    const initializeCoreConfig = await loadInit();

    await initializeCoreConfig();

    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockSetConfig).toHaveBeenCalledWith({
      apiUrl: 'https://build.example.com',
      wsUrl: 'wss://build.example.com',
      version: '2018.10.2',
      redirectUrl: 'https://build-redirect.example.com',
      isProduction: false,
    });
    expect(mockBridgeConfigure).toHaveBeenCalledWith({ apiUrl: 'https://build.example.com', version: '2018.10.2' });
  });

  it('defaults to empty URLs when nothing is configured', async () => {
    setEnv({ NODE_ENV: 'test', NEXT_PUBLIC_API_URL: undefined, NEXT_PUBLIC_WS_URL: undefined, NEXT_PUBLIC_REDIRECT_URL: undefined });
    const initializeCoreConfig = await loadInit();

    await initializeCoreConfig();

    expect(mockSetConfig).toHaveBeenCalledWith(expect.objectContaining({ apiUrl: '', wsUrl: '', redirectUrl: '' }));
  });
});

describe('initializeCoreConfig – production', () => {
  beforeEach(() => {
    setEnv({ NODE_ENV: 'production' });
  });

  it('prefers the URLs from server.json', async () => {
    mockFetch.mockResolvedValue(jsonResponse({
      apiUrl: 'https://client.example.com',
      wsUrl: 'wss://client.example.com',
      redirectUrl: 'https://example.com',
    }));
    const initializeCoreConfig = await loadInit();

    await initializeCoreConfig();

    expect(mockFetch).toHaveBeenCalledWith('/build/dist/config/server.json', { cache: 'no-store' });
    expect(mockSetConfig).toHaveBeenCalledWith({
      apiUrl: 'https://client.example.com',
      wsUrl: 'wss://client.example.com',
      version: '2018.10.2',
      redirectUrl: 'https://example.com',
      isProduction: true,
    });
    expect(mockBridgeConfigure).toHaveBeenCalledWith({ apiUrl: 'https://client.example.com', version: '2018.10.2' });
  });

  it('falls back to build-time values for keys server.json leaves empty', async () => {
    // run-nginx writes "" for unset ARCUS_* variables, e.g. ARCUS_REDIRECT_URI.
    mockFetch.mockResolvedValue(jsonResponse({ apiUrl: 'https://client.example.com', wsUrl: 'wss://client.example.com', redirectUrl: '' }));
    const initializeCoreConfig = await loadInit();

    await initializeCoreConfig();

    expect(mockSetConfig).toHaveBeenCalledWith(expect.objectContaining({
      apiUrl: 'https://client.example.com',
      redirectUrl: 'https://build-redirect.example.com',
    }));
  });

  it('strips trailing slashes from the configured URLs', async () => {
    mockFetch.mockResolvedValue(jsonResponse({
      apiUrl: 'https://client.example.com/',
      wsUrl: 'wss://client.example.com/',
      redirectUrl: 'https://example.com//',
    }));
    const initializeCoreConfig = await loadInit();

    await initializeCoreConfig();

    expect(mockSetConfig).toHaveBeenCalledWith(expect.objectContaining({
      apiUrl: 'https://client.example.com',
      wsUrl: 'wss://client.example.com',
      redirectUrl: 'https://example.com',
    }));
  });

  it('fetches server.json once and reuses it', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ apiUrl: 'https://client.example.com' }));
    const initializeCoreConfig = await loadInit();

    await initializeCoreConfig();
    await initializeCoreConfig();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockSetConfig).toHaveBeenLastCalledWith(expect.objectContaining({ apiUrl: 'https://client.example.com' }));
  });

  it('falls back to build-time values when server.json is missing, and retries next time', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({}, false))
      .mockResolvedValueOnce(jsonResponse({ apiUrl: 'https://client.example.com' }));
    const initializeCoreConfig = await loadInit();

    await initializeCoreConfig();
    expect(mockSetConfig).toHaveBeenLastCalledWith(expect.objectContaining({ apiUrl: 'https://build.example.com' }));

    await initializeCoreConfig();
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockSetConfig).toHaveBeenLastCalledWith(expect.objectContaining({ apiUrl: 'https://client.example.com' }));
  });

  it('falls back to build-time values when the request fails', async () => {
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));
    const initializeCoreConfig = await loadInit();

    await expect(initializeCoreConfig()).resolves.toBeUndefined();

    expect(mockSetConfig).toHaveBeenCalledWith(expect.objectContaining({ apiUrl: 'https://build.example.com' }));
  });

  it('falls back to build-time values when server.json is not valid JSON', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.reject(new SyntaxError('Unexpected token')) });
    const initializeCoreConfig = await loadInit();

    await initializeCoreConfig();

    expect(mockSetConfig).toHaveBeenCalledWith(expect.objectContaining({ wsUrl: 'wss://build.example.com' }));
  });
});
