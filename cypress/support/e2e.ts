// Global Cypress support file — loaded before every spec.
//
// Wires the app to the in-browser fake platform:
//   - `window:before:load` routes the app's platform WebSocket to the engine
//   - a `cy.intercept` answers the REST bridge (`/login`, `/logout`, `/<ns>/<Command>`)
//   - every test starts from a pristine fixture and removes what it created afterwards

import './commands';
import { platform } from './commands';
import type { RequestEnvelope } from './platform/types';

// The app logs (and in dev, overlays) errors from the platform connection being
// torn down mid-flight (e.g. a close during logout); none of those should fail a spec.
Cypress.on('uncaught:exception', () => false);

Cypress.on('window:before:load', (win) => {
  platform.install(win);
});

beforeEach(() => {
  platform.reset();

  cy.intercept('POST', '**', (req) => {
    const path = new URL(req.url).pathname;
    const body: unknown = req.body;

    // Platform login/logout endpoints (form-encoded user/password).
    if (path.endsWith('/login') && typeof body === 'string' && body.includes('user=')) {
      const params = new URLSearchParams(body);
      const ok = platform.login(params.get('user') ?? '', params.get('password') ?? '');
      req.reply({ statusCode: ok ? 200 : 401, body: ok ? { status: 'success' } : { status: 'error' } });
      return;
    }
    if (path.endsWith('/logout') && !isNextRequest(req.headers)) {
      platform.logout();
      req.reply({ statusCode: 200, body: {} });
      return;
    }

    // REST bridge: a JSON envelope posted to /<namespace>/<Command>.
    if (isEnvelope(body)) {
      const result = platform.restRequest(body);
      req.reply({ statusCode: result.status, body: result.body });
      return;
    }

    req.continue();
  }).as('platformRest');
});

afterEach(() => {
  // data-testids must be unique on the page — repeated components key theirs
  // by the item they render (see testing.md → data-testid conventions).
  cy.document({ log: false }).then((doc) => {
    const seen = new Map<string, number>();
    doc.querySelectorAll('[data-testid]').forEach((el) => {
      const id = el.getAttribute('data-testid')!;
      seen.set(id, (seen.get(id) ?? 0) + 1);
    });
    const duplicates = [...seen].filter(([, n]) => n > 1).map(([id, n]) => `${id} ×${n}`);
    expect(duplicates, 'duplicate data-testids on the page').to.be.empty;
  });

  cy.cleanupPlatform().then((removed) => {
    expect(platform.created.size, `leftover platform objects: ${removed.join(', ')}`).to.eq(0);
  });
});

function isEnvelope(body: unknown): body is RequestEnvelope {
  return !!body && typeof body === 'object'
    && typeof (body as RequestEnvelope).type === 'string'
    && typeof (body as RequestEnvelope).payload === 'object';
}

function isNextRequest(headers: Record<string, string | string[]>): boolean {
  return 'next-action' in headers || 'rsc' in headers;
}
