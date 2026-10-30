/**
 * Authentication singleton for the Arcus platform.
 *
 * Ported from src/models/auth.js — replaced jQuery AJAX with fetch,
 * removed CanJS dependencies.
 */

import cornea from './cornea';
import { getConfig } from './config';

type AuthEvent =
  | 'authentication:success'
  | 'authentication:fail'
  | 'authentication:logout'
  | 'connection:lost';

type AuthListener = (data?: any) => void;

function attachOnce(event: string, listener: (...args: any[]) => void): void {
  const listeners = cornea.listeners(event);
  if (!listeners.includes(listener)) {
    cornea.on(event, listener);
  }
}

class Auth {
  authenticated = false;
  active: {
    auth: boolean;
    promise?: Promise<void>;
    user?: Record<string, any>;
  } = { auth: false };

  private _listeners: Map<AuthEvent, AuthListener[]> = new Map();

  constructor() {
    this.onSessionCreated = this.onSessionCreated.bind(this);
    this.onWebSocketClosed = this.onWebSocketClosed.bind(this);

    this.on('authentication:logout', () => {
      this.authenticated = false;
      this.active = { auth: false };
    });
    this.on('authentication:fail', () => {
      this.active = { auth: false };
      this.authenticated = false;
    });
    this.on('authentication:success', () => {
      this.authenticated = true;
    });
  }

  on(event: AuthEvent, listener: AuthListener): this {
    const list = this._listeners.get(event) ?? [];
    list.push(listener);
    this._listeners.set(event, list);
    return this;
  }

  off(event: AuthEvent, listener: AuthListener): this {
    const list = this._listeners.get(event);
    if (list) {
      this._listeners.set(event, list.filter((l) => l !== listener));
    }
    return this;
  }

  emit(event: AuthEvent, data?: any): void {
    const list = this._listeners.get(event);
    if (list) {
      for (const listener of [...list]) {
        listener(data);
      }
    }
  }

  async login(
    username: string,
    password: string,
    isPublic: boolean,
  ): Promise<void> {
    // Start from a clean slate: logging in again makes the platform end any
    // existing session, and that socket's close must not reach this attempt.
    this.reset();
    attachOnce('SessionCreated', this.onSessionCreated);
    attachOnce('WebSocketClosed', this.onWebSocketClosed);

    const config = getConfig();
    const url = `${config.apiUrl.replace(/\/+$/, '')}/login`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Client-Version': config.version,
      },
      credentials: 'include',
      body: new URLSearchParams({
        user: username,
        password,
        public: isPublic ? 'true' : 'false',
      }),
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.status}`);
    }

    const promise = this.startCornea();
    this.active = { auth: true, promise };
    return promise;
  }

  /**
   * Drop the socket and auth state without contacting the platform.
   * Called when a login or session restore fails, so an abandoned socket
   * can't keep reconnecting or deliver events into a later attempt.
   */
  reset(): void {
    this.authenticated = false;
    this.active = { auth: false };
    this.cleanupCornea();
  }

  emitLogout(): void {
    this.emit('authentication:logout');
    this.cleanupCornea();
  }

  async logout(makeRequest = true): Promise<void> {
    if (makeRequest) {
      const config = getConfig();
      const url = `${config.apiUrl.replace(/\/+$/, '')}/logout`;
      try {
        await fetch(url, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'X-Client-Version': config.version,
          },
        });
      } catch {
        // Logout request failed, emit logout anyway
      }
      this.emitLogout();
      return;
    }
    this.emitLogout();
  }

  authenticate(): Promise<void> {
    if (this.active.auth) {
      return this.active.promise!;
    }
    this.active.auth = true;

    attachOnce('SessionCreated', this.onSessionCreated);
    attachOnce('WebSocketClosed', this.onWebSocketClosed);

    const promise = this.startCornea();
    this.active.promise = promise;
    return promise;
  }

  startCornea(): Promise<void> {
    const config = getConfig();
    return cornea.initialize(`${config.wsUrl}/websocket?v=${config.version}`);
  }

  cleanupCornea(): void {
    cornea.cleanup();
  }

  private onSessionCreated(user: Record<string, any>): void {
    this.emit('authentication:success', user);
    this.active.user = user;
  }

  private onWebSocketClosed(ev: CloseEvent): void {
    if (this.authenticated && ev.code === 1000) {
      // closed due to logout
      this.logout();
    } else if (this.authenticated && ev.code === 4001) {
      // session ended elsewhere; the app handles the expiry
      this.cleanupCornea();
    } else if (this.authenticated) {
      // network failure while authenticated — partysocket reconnects and the
      // session is still valid, so don't treat it as an auth failure
      this.emit('connection:lost');
    } else {
      // not authenticated and the connection failed — a real auth failure.
      // Tear the socket down so partysocket stops retrying a rejected upgrade.
      this.reset();
      this.emit('authentication:fail');
    }
  }
}

const auth = new Auth();
export default auth;
