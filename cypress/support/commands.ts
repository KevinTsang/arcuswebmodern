/**
 * Custom Cypress commands for the Arcus E2E suite.
 *
 * All specs run against the in-browser fake platform (`platform`): the app's
 * WebSocket is routed to it from `window:before:load`, and its REST bridge is
 * answered by the `cy.intercept` installed in `e2e.ts`.
 */

import { MockPlatform } from './platform/MockPlatform';
import type { Attrs, LoggedRequest } from './platform/types';

/** The single fake platform instance shared by every test in a spec file. */
export const platform = new MockPlatform();

export interface SignInOptions {
  /** Route to land on after the session is restored (default `/home`). */
  path?: string;
  /** Mutate fixture data before the app loads (add devices, pending invitations, …). */
  customize?: (platform: MockPlatform) => void;
}

declare global {
  namespace Cypress {
    interface Chainable {
      /** Restore a platform session (as if the auth cookie were present) and open `path`. */
      signIn(options?: SignInOptions): Chainable<void>;
      /** Access the fake platform engine inside the command queue. */
      platform(): Chainable<MockPlatform>;
      /** Wait until the platform has seen a request of `type` (optionally matching `predicate`). */
      expectRequest(type: string, predicate?: (request: LoggedRequest) => boolean): Chainable<LoggedRequest>;
      /** Assert the last request of `type` carried these attributes (deep-includes). */
      expectRequestAttrs(type: string, attrs: Attrs): Chainable<LoggedRequest>;
      /** Set an `<input type="range">` value in a way React picks up. */
      setRange(value: number): Chainable<JQuery<HTMLElement>>;
      /** Wait for a toast with this text. */
      toast(text: string | RegExp): Chainable<JQuery<HTMLElement>>;
      /** Remove everything the current test created on the platform. */
      cleanupPlatform(): Chainable<string[]>;
    }
  }
}

Cypress.Commands.add('platform', () => cy.wrap(platform, { log: false }));

Cypress.Commands.add('signIn', (options: SignInOptions = {}) => {
  platform.authenticated = true;
  options.customize?.(platform);
  cy.visit(options.path ?? '/home');
  // The authenticated layout gates children until the place data has loaded.
  cy.get('header', { timeout: 20000 }).should('exist');
  cy.contains('Loading place data', { timeout: 20000 }).should('not.exist');
});

Cypress.Commands.add('expectRequest', (type: string, predicate?: (request: LoggedRequest) => boolean) => {
  return cy.wrap(null, { log: false }).should(() => {
    const match = platform.requestsOf(type).find((r) => (predicate ? predicate(r) : true));
    expect(match, `platform request ${type}`).to.exist;
  }).then(() => {
    const match = platform.requestsOf(type).find((r) => (predicate ? predicate(r) : true))!;
    Cypress.log({ name: 'request', message: `${type} → ${match.destination}` });
    return cy.wrap(match, { log: false });
  });
});

Cypress.Commands.add('expectRequestAttrs', (type: string, attrs: Attrs) => {
  return cy.wrap(null, { log: false }).should(() => {
    const last = platform.lastRequestOf(type);
    expect(last, `platform request ${type}`).to.exist;
    expect(last!.attributes).to.deep.include(attrs);
  }).then(() => cy.wrap(platform.lastRequestOf(type)!, { log: false }));
});

Cypress.Commands.add('setRange', { prevSubject: 'element' }, (subject: JQuery<HTMLElement>, value: number) => {
  const input = subject[0] as HTMLInputElement;
  const view = input.ownerDocument.defaultView as Window & typeof globalThis;
  // React tracks the value property; bypass its instrumentation via the native setter.
  const setter = Object.getOwnPropertyDescriptor(view.HTMLInputElement.prototype, 'value')!.set!;
  setter.call(input, String(value));
  input.dispatchEvent(new view.Event('input', { bubbles: true }));
  input.dispatchEvent(new view.Event('change', { bubbles: true }));
  return cy.wrap(subject, { log: false });
});

Cypress.Commands.add('toast', (text: string | RegExp) => {
  return cy.get('[role="alert"]', { timeout: 10000 }).contains(text);
});

Cypress.Commands.add('cleanupPlatform', () => {
  const removed = platform.cleanupCreated();
  if (removed.length > 0) {
    Cypress.log({ name: 'cleanup', message: `removed ${removed.length}: ${removed.join(', ')}` });
  }
  return cy.wrap(removed, { log: false });
});
