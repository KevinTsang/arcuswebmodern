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
  | 'authentication:logout';

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
    isPublic?: string,
  ): Promise<void> {
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
        ...(isPublic ? { public: isPublic } : {}),
      }),
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.status}`);
    }

    return this.startCornea();
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
      this.logout();
    } else if (this.authenticated && ev.code === 4001) {
      this.cleanupCornea();
    } else {
      this.emit('authentication:fail');
    }
  }
}

const auth = new Auth();
export default auth;
