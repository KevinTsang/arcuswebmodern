/**
 * Exponential backoff algorithm.
 * Tries to invoke `callback` after `initial` ms, doubling the time until reaching `max`.
 * Adds ±20% jitter to prevent thundering herd.
 *
 * Ported from src/cornea/backoff.js — removed System.isEnv dependency.
 */

export interface BackoffOptions {
  initial?: number;
  max?: number;
  callback?: () => void;
}

const DEFAULTS: Required<BackoffOptions> = {
  initial: 100,
  max: 30 * 1000, // 30 seconds
  callback: () => {},
};

export class Backoff {
  private options: Required<BackoffOptions>;
  private timeout: ReturnType<typeof setTimeout> | null = null;
  private cancelled = false;
  private delay: number | null = null;
  private debug: boolean;

  constructor(options: BackoffOptions = {}, debug = false) {
    this.options = { ...DEFAULTS, ...options };
    this.debug = debug;
  }

  private log(...args: unknown[]): void {
    if (this.debug) {
      console.log('Cornea Backoff:', ...args);
    }
  }

  start(): void {
    this.log('Starting');
    this.cancelled = false;
    this.continue();
  }

  cancel(): void {
    this.log('Cancelling');
    this.cancelled = true;
    this.reset();
  }

  reset(): void {
    this.delay = null;
    if (this.timeout !== null) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }

  getDelay(): number {
    const newDelay = this.delay ? this.delay * 2 : this.options.initial;
    this.delay = newDelay < this.options.max ? newDelay : this.options.max;
    return this.delay;
  }

  continue(): void {
    if (this.cancelled) {
      return;
    }

    const cb = this.options.callback;
    const baseDelay = this.getDelay();
    const offset = baseDelay * 0.2;

    // Set the delay to the base backed-off delay time ± 20%
    const delay =
      Math.random() * (baseDelay + offset - (baseDelay - offset)) +
      (baseDelay - offset);

    this.log('Invoking callback in', delay, 'ms');
    this.timeout = setTimeout(() => {
      cb();
    }, delay);
  }
}
