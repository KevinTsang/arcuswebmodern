import auth from '@arcus/core/auth';
import cornea from '@arcus/core/cornea';

// ── Mocks ─────────────────────────────────────────────────────────────

// A minimal Cornea: an event emitter plus spies for the socket lifecycle.
jest.mock('@arcus/core/cornea', () => {
  const listeners = new Map<string, ((...args: unknown[]) => void)[]>();
  return {
    __esModule: true,
    default: {
      on: (event: string, fn: (...args: unknown[]) => void) => {
        listeners.set(event, [...(listeners.get(event) ?? []), fn]);
      },
      off: (event: string, fn: (...args: unknown[]) => void) => {
        listeners.set(event, (listeners.get(event) ?? []).filter((l) => l !== fn));
      },
      listeners: (event: string) => [...(listeners.get(event) ?? [])],
      emit: (event: string, ...args: unknown[]) => {
        for (const fn of [...(listeners.get(event) ?? [])]) fn(...args);
      },
      initialize: jest.fn(() => Promise.resolve()),
      cleanup: jest.fn(),
    },
  };
});

jest.mock('@arcus/core/config', () => ({
  getConfig: () => ({ apiUrl: 'https://platform.test', wsUrl: 'wss://platform.test', version: '1.0' }),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const mockCornea = cornea as unknown as {
  emit: (event: string, ...args: unknown[]) => void;
  listeners: (event: string) => unknown[];
  initialize: jest.Mock;
  cleanup: jest.Mock;
};

// ── Helpers ───────────────────────────────────────────────────────────

type Event = Parameters<typeof auth.on>[0];
const attached: [Event, jest.Mock][] = [];

function listen(event: Event): jest.Mock {
  const fn = jest.fn();
  auth.on(event, fn);
  attached.push([event, fn]);
  return fn;
}

const SESSION = { personId: 'p1', places: [] };

async function signIn(): Promise<void> {
  await auth.login('alex@example.com', 'secret', false);
  mockCornea.emit('SessionCreated', SESSION);
}

beforeEach(() => {
  auth.reset();
  jest.clearAllMocks();
  mockFetch.mockResolvedValue({ ok: true, status: 200 });
});

afterEach(() => {
  for (const [event, fn] of attached.splice(0)) auth.off(event, fn);
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('auth.login', () => {
  it('tears down any existing socket before posting credentials', async () => {
    await auth.login('alex@example.com', 'secret', false);

    expect(mockCornea.cleanup).toHaveBeenCalled();
    expect(mockCornea.cleanup.mock.invocationCallOrder[0])
      .toBeLessThan(mockFetch.mock.invocationCallOrder[0]);
    expect(mockFetch).toHaveBeenCalledWith('https://platform.test/login', expect.objectContaining({ method: 'POST' }));
    expect(mockCornea.initialize).toHaveBeenCalledWith('wss://platform.test/websocket?v=1.0');
  });

  it('attaches the session handlers itself', async () => {
    const onSuccess = listen('authentication:success');

    await signIn();

    expect(mockCornea.listeners('SessionCreated')).toHaveLength(1);
    expect(mockCornea.listeners('WebSocketClosed')).toHaveLength(1);
    expect(onSuccess).toHaveBeenCalledWith(SESSION);
    expect(auth.authenticated).toBe(true);
  });

  it('rejects on a non-OK response without opening a socket', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401 });

    await expect(auth.login('alex@example.com', 'wrong', false)).rejects.toThrow('Login failed: 401');
    expect(mockCornea.initialize).not.toHaveBeenCalled();
  });
});

describe('auth.reset', () => {
  it('clears auth state and the socket', async () => {
    await signIn();
    mockCornea.cleanup.mockClear();

    auth.reset();

    expect(auth.authenticated).toBe(false);
    expect(auth.active).toEqual({ auth: false });
    expect(mockCornea.cleanup).toHaveBeenCalled();
  });

  it('lets authenticate() start a new connection instead of reusing the old one', async () => {
    await auth.authenticate();
    auth.reset();
    await auth.authenticate();

    expect(mockCornea.initialize).toHaveBeenCalledTimes(2);
  });
});

describe('auth – socket closes', () => {
  it('emits connection:lost, not authentication:fail, for a network drop while signed in', async () => {
    await signIn();
    const onLost = listen('connection:lost');
    const onFail = listen('authentication:fail');
    mockCornea.cleanup.mockClear();

    mockCornea.emit('WebSocketClosed', { code: 1006 });

    expect(onLost).toHaveBeenCalled();
    expect(onFail).not.toHaveBeenCalled();
    expect(auth.authenticated).toBe(true);
    expect(mockCornea.cleanup).not.toHaveBeenCalled();
  });

  it('tears the socket down and fails when the connection is rejected before signing in', async () => {
    await auth.authenticate();
    const onFail = listen('authentication:fail');
    mockCornea.cleanup.mockClear();

    mockCornea.emit('WebSocketClosed', { code: 1006 });

    expect(mockCornea.cleanup).toHaveBeenCalled();
    expect(onFail).toHaveBeenCalled();
    expect(auth.active).toEqual({ auth: false });
  });

  it('cleans up without failing when the platform ends the session (4001)', async () => {
    await signIn();
    const onFail = listen('authentication:fail');
    mockCornea.cleanup.mockClear();

    mockCornea.emit('WebSocketClosed', { code: 4001 });

    expect(mockCornea.cleanup).toHaveBeenCalled();
    expect(onFail).not.toHaveBeenCalled();
  });

  it('logs out on a clean close (1000) while signed in', async () => {
    await signIn();
    const onLogout = listen('authentication:logout');
    mockFetch.mockClear();

    mockCornea.emit('WebSocketClosed', { code: 1000 });
    await Promise.resolve();
    await Promise.resolve();

    expect(mockFetch).toHaveBeenCalledWith('https://platform.test/logout', expect.objectContaining({ method: 'POST' }));
    expect(onLogout).toHaveBeenCalled();
  });
});
