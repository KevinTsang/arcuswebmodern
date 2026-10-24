/**
 * WebSocket library for communicating with the Arcus platform.
 * Uses partysocket for automatic reconnection with exponential backoff.
 * Implements a simple EventEmitter pattern for application-level events.
 *
 * Ported from src/cornea/cornea.js — replaced native WebSocket + custom
 * backoff with partysocket's ReconnectingWebSocket.
 */

import { WebSocket as ReconnectingWebSocket } from 'partysocket';
import { v1 as uuidv1 } from 'uuid';

// ── Minimal EventEmitter ──────────────────────────────────────────────

type Listener = (...args: any[]) => void;

class EventEmitter {
  private _listeners: Map<string, Listener[]> = new Map();
  private _maxListeners = 50;

  setMaxListeners(n: number): void {
    this._maxListeners = n;
  }

  on(event: string, listener: Listener): this {
    const list = this._listeners.get(event) ?? [];
    list.push(listener);
    this._listeners.set(event, list);
    return this;
  }

  off(event: string, listener: Listener): this {
    const list = this._listeners.get(event);
    if (list) {
      this._listeners.set(
        event,
        list.filter((l) => l !== listener),
      );
    }
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    const list = this._listeners.get(event);
    if (!list || list.length === 0) return false;
    for (const listener of [...list]) {
      listener(...args);
    }
    return true;
  }

  listeners(event: string): Listener[] {
    return [...(this._listeners.get(event) ?? [])];
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this._listeners.delete(event);
    } else {
      this._listeners.clear();
    }
    return this;
  }
}

// ── Types ─────────────────────────────────────────────────────────────

export interface CorneaMessage {
  type: string;
  headers: {
    isRequest?: boolean;
    destination?: string;
    correlationId?: string;
    source?: string;
  };
  payload: {
    messageType: string;
    attributes: Record<string, any>;
    code?: string;
  };
}

interface PendingRequest {
  resolve: (value: Record<string, any>) => void;
  reject: (reason: any) => void;
  timeout: ReturnType<typeof setTimeout>;
}

export interface EventSubject {
  id: string;
  namespace: string;
  address: string;
}

// ── Cornea Class ──────────────────────────────────────────────────────

export class Cornea extends EventEmitter {
  id: string | null = null;
  socket: ReconnectingWebSocket | null = null;
  requests: Record<string, PendingRequest> = {};
  timeout = 50 * 1000;
  url = '';
  debug: boolean;

  constructor(debug = false) {
    super();
    this.setMaxListeners(50);
    this.debug = debug;
  }

  private log(type: string, ...args: unknown[]): void {
    if (this.debug) {
      console.log(`Cornea ${type}`, ...args);
    }
  }

  /**
   * Open a WebSocket connection to the given URL.
   * Returns a promise that resolves once the first connection succeeds.
   * Reconnection after abnormal closures is handled automatically by
   * partysocket; close codes 1000 and 4001 stop reconnection.
   */
  initialize(url: string): Promise<void> {
    if (typeof url !== 'string') {
      throw new Error('URL must be defined to establish a web socket connection');
    }

    // Clean up any existing connection before starting a new one.
    // Detach handlers first so the old socket's async close event
    // doesn't emit WebSocketClosed / authentication:fail into the
    // new connection's listeners.
    if (this.socket) {
      this.socket.onclose = null;
      this.socket.onerror = null;
      this.socket.onmessage = null;
      this.socket.onopen = null;
      this.cleanup();
    }

    this.url = url;

    return new Promise<void>((resolve, reject) => {
      let settled = false;

      this.socket = new ReconnectingWebSocket(url, undefined, {
        maxReconnectionDelay: 30000,
        minReconnectionDelay: 100,
        reconnectionDelayGrowFactor: 2,
        connectionTimeout: 4000,
        debug: this.debug,
      });

      this.socket.onopen = () => {
        this.id = uuidv1();
        this.log('Connected');
        if (!settled) {
          settled = true;
          resolve();
        }
      };

      this.socket.onerror = (ev) => {
        this.log('Error', ev);
        if (!settled) {
          settled = true;
          reject(ev);
        }
      };

      this.socket.onclose = (ev) => this.onClose(ev as CloseEvent);
      this.socket.onmessage = (ev) => this.onMessage(ev);
    });
  }

  send(msg: CorneaMessage): Promise<Record<string, any>> {
    return new Promise((resolve, reject) => {
      const socket = this.socket;
      if (!socket || socket.readyState !== ReconnectingWebSocket.OPEN) {
        const errorMessage = this.getErrorMessage(
          "Wait a moment... we're getting things ready for you.",
          msg,
        );
        reject(errorMessage.payload.attributes);
        return;
      }

      const uuid = uuidv1();
      const currentId = this.id;
      msg.headers.correlationId = uuid;

      this.requests[uuid] = {
        resolve,
        reject,
        timeout: setTimeout(() => {
          if (this.id === currentId) {
            const timeoutMessage = this.getErrorMessage(
              'Oops, there seems to be a problem connecting right now.',
              msg,
            );
            reject(timeoutMessage.payload.attributes);
          }
        }, this.timeout),
      };

      this.log(`--> ${msg.type}`, msg);
      this.emit('traffic', { direction: 'out', message: msg, timestamp: Date.now() });

      try {
        socket.send(JSON.stringify(msg));
      } catch (e) {
        this.log('Error', e);
        reject(e);
      }
    });
  }

  getEventSubject(source: string | undefined): EventSubject | null {
    if (!source) return null;
    const parts = source.split(':');

    // Hub has structure SERV:LWF-5229:hub
    if (parts[0] === 'SERV' && parts[2] === 'hub') {
      return { id: parts[1], namespace: parts[2], address: source };
    }

    // Subsystem namespace normalization
    if (parts[1].indexOf('sub') === 0 || parts[1] === 'cellbackup') {
      parts[1] = 'sub';
    }

    return { id: parts[2], namespace: parts[1], address: source };
  }

  cleanup(): void {
    if (this.socket) {
      this.socket.close(); // stops partysocket reconnection
      this.socket = null;
    }
    this.id = null;
    this.requests = {};
  }

  private onMessage(ev: MessageEvent): void {
    if (!this.socket) return;

    const data = ev.data as string;
    const message: CorneaMessage =
      data[0] === '{' || data[0] === '[' ? JSON.parse(data) : data;

    this.log(`<-- ${message.type}`, message);
    this.emit('traffic', { direction: 'in', message, timestamp: Date.now() });

    const eventType = message.type;
    const subject = this.getEventSubject(message.headers.source);
    const uuid = message.headers.correlationId;
    const request = uuid ? this.requests[uuid] : undefined;

    if (request) {
      if (eventType === 'Error') {
        if (message.payload.code === 'error.unauthorized') {
          this.emit('sess unauthorized', {});
        }
        request.reject(message.payload.attributes);
      } else {
        clearTimeout(request.timeout);
        request.resolve(message.payload.attributes);
      }
      if (uuid) delete this.requests[uuid];
    }

    if (subject) {
      this.emit(
        `${subject.namespace} ${eventType}`,
        { 'base:address': subject.address, ...message.payload.attributes },
      );
    } else {
      this.emit(eventType, message.payload.attributes);
    }
  }

  private getErrorMessage(errorMessage: string, originalMessage: CorneaMessage): CorneaMessage {
    return {
      type: 'Error',
      headers: {
        isRequest: false,
        destination: originalMessage.headers.destination,
      },
      payload: {
        messageType: 'Error',
        attributes: {
          type: 'Error',
          message: errorMessage,
        },
      },
    };
  }

  private onClose(ev: CloseEvent): void {
    this.log('Connection Closed', ev);
    this.emit('WebSocketClosed', ev);

    // 1000 = clean logout, 4001 = session ended — stop reconnecting
    if ([1000, 4001].includes(ev.code)) {
      this.cleanup();
      if (ev.code === 4001) {
        this.emit('sess unauthorized');
      }
    }
    // For any other close code, partysocket reconnects automatically
  }
}

// Default singleton instance
const cornea = new Cornea(process.env.NODE_ENV !== 'production');
export default cornea;
