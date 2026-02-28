/**
 * WebSocket library for communicating with the Arcus platform.
 * Actively tries to reconnect using exponential backoff if the connection
 * is not cleanly closed. Implements a simple EventEmitter pattern.
 *
 * Ported from src/cornea/cornea.js — removed jQuery queue workaround
 * and System.isEnv dependency.
 */

import { v1 as uuidv1 } from 'uuid';
import { Backoff } from './backoff';

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

interface ConnectionPromise {
  resolve: () => void;
  reject: (reason?: any) => void;
}

export interface EventSubject {
  id: string;
  namespace: string;
  address: string;
}

// ── Cornea Class ──────────────────────────────────────────────────────

export class Cornea extends EventEmitter {
  id: string | null = null;
  connected: Promise<void> | null = null;
  private connectionPromise: ConnectionPromise | null = null;
  socket: WebSocket | null = null;
  reconnecting = false;
  connecting = false;
  wasConnected = false;
  private backoff: Backoff | null = null;
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

  resetState(): void {
    this.id = null;
    this.connected = null;
    this.connectionPromise = null;
    this.socket = null;
    this.reconnecting = false;
    this.connecting = false;
    this.wasConnected = false;
    this.backoff = null;
    this.requests = {};
  }

  initialize(url: string): Promise<void> {
    if (typeof url !== 'string') {
      throw new Error('URL must be defined to establish a web socket connection');
    }

    if (typeof WebSocket === 'undefined') {
      throw new Error('WebSockets not supported in the current environment.');
    }

    if (!this.backoff) {
      this.backoff = new Backoff(
        {
          initial: 100,
          max: 30000,
          callback: () => this.connect(),
        },
        this.debug,
      );
    }

    this.url = url;

    if (!this.socket) {
      this.connect();
    }
    return this.connected!;
  }

  connect(): Promise<void> {
    this.log('Connecting...');
    this.connecting = true;

    if (!this.connected) {
      this.connected = new Promise<void>((resolve, reject) => {
        this.connectionPromise = { resolve, reject };
      });
    }

    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      this.connectionPromise!.resolve();
      this.onOpen();
    };

    this.socket.onerror = (ev) => {
      if (this.connectionPromise) {
        this.connectionPromise.reject(ev);
      }
      this.onError(ev);
    };

    this.socket.onclose = (ev) => this.onClose(ev);
    this.socket.onmessage = (ev) => this.onMessage(ev);

    return this.connected.then(() => this.onConnected());
  }

  private onConnected(): void {
    this.log('Connected!');
    this.connecting = false;
    this.stopReconnect();
  }

  private stopReconnect(): void {
    this.reconnecting = false;
    if (this.backoff) {
      this.backoff.cancel();
    }
  }

  reconnect(): void {
    if (this.reconnecting) return;
    this.reconnecting = true;
    this.log('Attempting to reconnect...');
    this.backoff!.start();
  }

  send(msg: CorneaMessage): Promise<Record<string, any>> {
    return new Promise((resolve, reject) => {
      const socket = this.socket;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        const errorMessage = this.getErrorMessage(
          "Wait a moment... we're getting things ready for you.",
          msg,
        );
        reject(errorMessage.payload.attributes);
        return;
      }

      this.connected!.then(() => {
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
        const payload = JSON.stringify(msg);

        try {
          socket.send(payload);
        } catch (e) {
          this.log('Error', e);
          reject(e);
        }
      }).catch((e) => reject(e));
    });
  }

  close(): void {
    this.log('Closing Connection');
    this.stopReconnect();
    if (!this.socket) return;
    this.socket.close();
  }

  private onOpen(): void {
    this.id = uuidv1();
    this.wasConnected = true;
    this.log('Connected');
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

  private onMessage(ev: MessageEvent): void {
    if (!this.socket) return;

    const data = ev.data as string;
    const message: CorneaMessage =
      data[0] === '{' || data[0] === '[' ? JSON.parse(data) : data;

    this.log(`<-- ${message.type}`, message);

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

  private onError(ev: Event): void {
    this.log('Error', ev);
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
    this.connected = null;

    if (![1000, 4001].includes(ev.code)) {
      if (this.reconnecting) {
        this.backoff!.continue();
      } else if (this.wasConnected) {
        this.reconnect();
      } else {
        this.cleanup();
      }
    } else {
      this.cleanup();
      if (ev.code === 4001) {
        this.emit('sess unauthorized');
      }
    }
  }

  cleanup(): void {
    this.close();
    this.resetState();
  }
}

// Default singleton instance
const cornea = new Cornea(process.env.NODE_ENV !== 'production');
export default cornea;
