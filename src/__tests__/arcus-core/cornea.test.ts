import { Cornea, type CorneaMessage } from '@arcus/core/cornea';

// ── Mocks ─────────────────────────────────────────────────────────────

jest.mock('uuid', () => {
  let n = 0;
  return { v1: () => `uuid-${++n}` };
});

// A controllable stand-in for partysocket's ReconnectingWebSocket.
jest.mock('partysocket', () => {
  class MockSocket {
    static OPEN = 1;
    static instances: MockSocket[] = [];
    readyState = 0;
    sent: string[] = [];
    onopen: (() => void) | null = null;
    onerror: ((ev: unknown) => void) | null = null;
    onclose: ((ev: unknown) => void) | null = null;
    onmessage: ((ev: { data: string }) => void) | null = null;
    close = jest.fn();
    constructor(readonly url: string) {
      MockSocket.instances.push(this);
    }
    send(data: string) {
      this.sent.push(data);
    }
    open() {
      this.readyState = 1;
      this.onopen?.();
    }
  }
  return { WebSocket: MockSocket };
});

interface TestSocket {
  sent: string[];
  onclose: ((ev: unknown) => void) | null;
  onmessage: ((ev: { data: string }) => void) | null;
  onopen: (() => void) | null;
  close: jest.Mock;
  open: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────

const sockets = (): TestSocket[] => jest.requireMock('partysocket').WebSocket.instances;
const lastSocket = (): TestSocket => sockets()[sockets().length - 1];

function request(): CorneaMessage {
  return {
    type: 'base:GetAttributes',
    headers: { destination: 'SERV:person:p1' },
    payload: { messageType: 'base:GetAttributes', attributes: {} },
  };
}

async function connected(cornea: Cornea): Promise<TestSocket> {
  const opened = cornea.initialize('wss://platform.test/websocket');
  const socket = lastSocket();
  socket.open();
  await opened;
  return socket;
}

const CLOSED = { type: 'Error', message: 'The connection to the platform was closed.' };

beforeEach(() => {
  jest.useFakeTimers();
  sockets().length = 0;
});

afterEach(() => {
  jest.useRealTimers();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('Cornea – cleanup', () => {
  it('rejects in-flight requests and clears their timers', async () => {
    const cornea = new Cornea();
    await connected(cornea);
    const pending = cornea.send(request());

    cornea.cleanup();

    await expect(pending).rejects.toEqual(CLOSED);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('detaches handlers before closing, so the deliberate close emits nothing', async () => {
    const cornea = new Cornea();
    const socket = await connected(cornea);
    const onClosed = jest.fn();
    cornea.on('WebSocketClosed', onClosed);

    cornea.cleanup();

    expect(socket.close).toHaveBeenCalled();
    expect(socket.onclose).toBeNull();
    expect(socket.onmessage).toBeNull();
    expect(onClosed).not.toHaveBeenCalled();
  });

  it('rejects a connection that has not opened yet', async () => {
    const cornea = new Cornea();
    const opening = cornea.initialize('wss://platform.test/websocket');

    cornea.cleanup();

    await expect(opening).rejects.toThrow('Connection closed before it opened');
  });

  it('replaces an earlier connection when initialized again', async () => {
    const cornea = new Cornea();
    const first = cornea.initialize('wss://platform.test/websocket');
    const firstSocket = lastSocket();

    const second = cornea.initialize('wss://platform.test/websocket');
    lastSocket().open();

    await expect(first).rejects.toThrow('Connection closed before it opened');
    await expect(second).resolves.toBeUndefined();
    expect(firstSocket.close).toHaveBeenCalled();
    expect(firstSocket.onclose).toBeNull();
  });
});

describe('Cornea – closes', () => {
  it("reports partysocket's synthetic error close as abnormal and keeps reconnecting", async () => {
    const cornea = new Cornea();
    const socket = await connected(cornea);
    const onClosed = jest.fn();
    cornea.on('WebSocketClosed', onClosed);
    // partysocket's own Event subclass, sent with code 1000 after a connection error.
    const synthetic = Object.assign(new Event('close'), { code: 1000, reason: '' });

    socket.onclose?.(synthetic);

    expect(onClosed).toHaveBeenCalledWith(expect.objectContaining({ code: 1006, wasClean: false }));
    expect(socket.close).not.toHaveBeenCalled();
    expect(cornea.socket).not.toBeNull();
  });

  it('stops reconnecting on a clean close from the server', async () => {
    const cornea = new Cornea();
    const socket = await connected(cornea);
    const onClosed = jest.fn();
    cornea.on('WebSocketClosed', onClosed);
    const close = new CloseEvent('close', { code: 1000 });

    socket.onclose?.(close);

    expect(onClosed).toHaveBeenCalledWith(close);
    expect(socket.close).toHaveBeenCalled();
    expect(cornea.socket).toBeNull();
  });

  it('stops reconnecting and reports unauthorized on a 4001 close', async () => {
    const cornea = new Cornea();
    const socket = await connected(cornea);
    const onUnauthorized = jest.fn();
    cornea.on('sess unauthorized', onUnauthorized);

    socket.onclose?.(new CloseEvent('close', { code: 4001 }));

    expect(onUnauthorized).toHaveBeenCalled();
    expect(cornea.socket).toBeNull();
  });
});

describe('Cornea – requests', () => {
  it('rejects requests sent on a connection that closes', async () => {
    const cornea = new Cornea();
    const socket = await connected(cornea);
    const onClosed = jest.fn();
    cornea.on('WebSocketClosed', onClosed);
    const pending = cornea.send(request());
    const close = new CloseEvent('close', { code: 1006 });

    socket.onclose?.(close);

    await expect(pending).rejects.toEqual(CLOSED);
    expect(onClosed).toHaveBeenCalledWith(close);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('clears the request timer when the platform answers with an Error', async () => {
    const cornea = new Cornea();
    const socket = await connected(cornea);
    const pending = cornea.send(request());
    const { correlationId } = JSON.parse(socket.sent[0]).headers;

    socket.onmessage?.({
      data: JSON.stringify({
        type: 'Error',
        headers: { correlationId },
        payload: { messageType: 'Error', attributes: { message: 'Not allowed' } },
      }),
    });

    await expect(pending).rejects.toEqual({ message: 'Not allowed' });
    expect(jest.getTimerCount()).toBe(0);
  });

  it('times out a request that gets no answer on an open connection', async () => {
    const cornea = new Cornea();
    await connected(cornea);
    const pending = cornea.send(request());

    jest.advanceTimersByTime(cornea.timeout);

    await expect(pending).rejects.toEqual({
      type: 'Error',
      message: 'Oops, there seems to be a problem connecting right now.',
    });
  });

  it('resolves a request with the response attributes', async () => {
    const cornea = new Cornea();
    const socket = await connected(cornea);
    const pending = cornea.send(request());
    const { correlationId } = JSON.parse(socket.sent[0]).headers;

    socket.onmessage?.({
      data: JSON.stringify({
        type: 'base:GetAttributesResponse',
        headers: { correlationId },
        payload: { messageType: 'base:GetAttributesResponse', attributes: { 'person:firstName': 'Alex' } },
      }),
    });

    await expect(pending).resolves.toEqual({ 'person:firstName': 'Alex' });
    expect(jest.getTimerCount()).toBe(0);
  });
});
