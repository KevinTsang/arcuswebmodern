# Testing

## Framework & Config

- Jest 30 with jsdom environment, ts-jest transform.
- React Testing Library (`@testing-library/react`) + `@testing-library/jest-dom` matchers.
- Tests live in `src/__tests__/<domain>/ComponentName.test.tsx`.
- Run tests: `npm test` (all), `npm run test:watch` (watch mode).
- End-to-end tests use Cypress against an in-browser fake platform — see
  [End-to-End Tests](#end-to-end-tests) below.

## Test Structure

Every test file follows this structure:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ComponentName } from '@/components/domain/ComponentName';

// ── Mocks ─────────────────────────────────────────────────────────────

// Mock external dependencies (Bridge, hooks, slices)

// ── Helpers ───────────────────────────────────────────────────────────

// Factory functions for test data

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('ComponentName', () => {
  // tests grouped by concern
});
```

## Required Test Coverage

Every component test file must include:

1. **Snapshot test** — Verify visual rendering with `toMatchSnapshot()`:
   ```tsx
   it('matches snapshot', () => {
     const { container } = render(<Component {...defaultProps} />);
     expect(container.firstChild).toMatchSnapshot();
   });
   ```

2. **Rendering tests** — Verify key elements appear in the DOM (text, roles, attributes).

3. **Interaction tests** — For every user interaction (click, change, blur, keydown):
   - **Success path** — Verify the expected callback/dispatch/Bridge call is made with correct arguments.
   - **Failure path** — Verify error handling (e.g., error notification dispatched, UI reverts).

4. **Edge cases** — Missing data, disabled states, boundary values.

## Querying Elements

Prefer accessible, semantic queries — `getByRole`, `getByText`, `getByLabelText`. When a
test needs a *specific* element that has no accessible name (a link, a computed value, a
nav item), select it with a `data-testid` rather than reaching through the DOM.

- **Do not** use `container.querySelector`, `.closest(...)`, or `.parentElement` to walk the
  DOM. These couple tests to markup structure (wrapper `<div>`s, class names) and break on
  refactors that don't change behavior.
- **Do** add a stable `data-testid` to the component and query it with `screen.getByTestId(...)`.
- Derive test IDs from a stable identifier (title, label, slug) so repeated components stay
  distinguishable — e.g. `CardShell` renders `card-view-link-${slug}` and `StatusBadge`
  renders `status-value-${slug}`, letting a page with many cards target one without DOM walking.

```tsx
// ❌ Avoid — brittle, depends on markup structure
expect(screen.getByText('View →').closest('a')).toHaveAttribute('href', '/services/alarms/status');
const onValue = screen.getByText('On').closest('div')!.querySelector('p')!;

// ✅ Prefer — stable, intent-revealing
expect(screen.getByTestId('card-view-link-alarms')).toHaveAttribute('href', '/services/alarms/status');
expect(screen.getByTestId('status-value-on')).toHaveTextContent('2');
```

## Mocking Patterns

- **Bridge**: `jest.mock('@arcus/core/bridge', () => ({ __esModule: true, default: { request: (...args: any[]) => mockBridgeRequest(...args) } }));`
- **Redux dispatch**: `jest.mock('@/store/hooks', () => ({ useAppDispatch: () => mockDispatch }));`
- **Notifications**: `jest.mock('@/store/slices/uiSlice', () => ({ addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }) }));`
- **Device hooks**: `jest.mock('@/hooks/useDeviceCapability', () => ({ useDevice: () => mockDevice }));`
- Use `waitFor()` for assertions on async operations (Bridge calls, dispatches after promises).

## Snapshot Best Practices

- One snapshot per component for the default/primary render state.
- Additional snapshots for significantly different visual states (disabled, loading, error, empty).
- Keep snapshots focused — snapshot `container.firstChild` not the full container.
- Review snapshot changes carefully on update; they are a safety net against unintended visual regressions.

## Containerized Testing

Runs a production build of the app in Docker against the dev platform, mirroring
`npm run dev`'s hostname/HTTPS setup so the platform session cookie keeps working.

### Prerequisites

- A container engine with a `docker` + `docker compose` CLI. **Rancher Desktop**
  (dockerd/moby backend) works; so does Docker Engine. Rancher installs its CLI to
  `~/.rd/bin` and adds it to your shell PATH.
- An `/etc/hosts` entry so the same-site hostname resolves locally:

  ```
  127.0.0.1  localdev.myDevUrl.com
  ```

- TLS certs at `certs/cert.pem` / `certs/key.pem` covering `localdev.myDevUrl.com`
  (the same certs `npm run dev` uses; gitignored, kept locally).

### Run it

```bash
docker compose up --build -d     # build image + start app (web) and TLS proxy (proxy)
docker compose logs -f           # tail both services
docker compose down              # stop and remove containers
```

Then open **https://localdev.myDevUrl.com:8443** (accept the self-signed cert once)
and sign in on **/login**.

### How it fits together

| Piece | Role |
|-------|------|
| `Dockerfile` | Multi-stage build → Next.js `standalone` server on HTTP `:3000` |
| `docker-compose.yml` | `web` (the app) + `proxy` (Caddy) on one network |
| `Caddyfile` | Terminates HTTPS at `localdev.myDevUrl.com:8443`, reverse-proxies to `web:3000` |

The browser loads the app over HTTPS from the same-site hostname; platform API/WebSocket
traffic goes **directly** from the browser to `client.dev.myDevUrl.com` (there are no
rewrites in `next.config.ts`), so Caddy only serves the app itself.

### Authentication

The client talks to the platform over a **browser WebSocket**, which can't carry a custom
auth header — the only credential it can send is the `irisAuthToken` cookie. That cookie is
scoped to `.myDevUrl.com` and `SameSite`, so it is attached to the WebSocket handshake
**only** when the page is loaded over HTTPS from a same-site host. That is why both
`npm run dev` and this container serve from `localdev.myDevUrl.com` rather than
`localhost` — loading from `localhost` (e.g. plain `next start`) is cross-site and the cookie
is silently withheld, bouncing you to `/login`.

To authenticate, use the **/login** page: it POSTs credentials to the platform, which sets
`irisAuthToken` for you. (You can also paste a still-valid token onto the `.myDevUrl.com`
domain in DevTools, but scripted login is more robust.)

### Pointing at a different backend

`NEXT_PUBLIC_*` values are **inlined into the browser bundle at build time**, not read at
runtime — so `docker run -e ...` won't change them. Override them as build args and rebuild:

```bash
docker compose build \
  --build-arg NEXT_PUBLIC_API_URL=https://client.dev.myDevUrl.com \
  --build-arg NEXT_PUBLIC_WS_URL=wss://client.dev.myDevUrl.com \
  --build-arg NEXT_PUBLIC_REDIRECT_URL=https://client.dev.myDevUrl.com
docker compose up -d
```

Defaults are set in both `docker-compose.yml` (`web.build.args`) and the `Dockerfile`
(`ARG` lines). A plain `docker compose restart` will **not** pick up new URLs — you must rebuild.

## End-to-End Tests

Cypress specs in `cypress/e2e/` cover every feature area the PRD marks **Done**
(one spec per area: `auth`, `onboarding`, `dashboard`, `devices`, `scenes`,
`rules`, `alarms`, `subsystems`, `history`, `settings`, `api-keys`, `pairing`,
`promonitoring`, plus the public-page specs). They run against the real Next.js
app with the Arcus platform replaced by an in-browser fake, so no backend,
cookies or hardware are needed.

### Run them

```bash
npm run test:e2e:ci        # start the app on :3000, run every spec, stop the app
```

Or, while developing:

```bash
npm run dev:e2e            # plain-HTTP dev server on http://localhost:3000
npm run test:e2e           # headless run (all specs)
npm run test:e2e:open      # interactive runner
npx cypress run --spec cypress/e2e/scenes.cy.ts   # a single spec
```

`dev:e2e` points `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_WS_URL` at `localhost:3000`
so platform traffic stays same-origin and is fully intercepted; the normal
`npm run dev` (HTTPS on `localdev.arcus.wl-net.net`) is **not** used for E2E.

### How the fake platform works

| Piece | Role |
|-------|------|
| `cypress/support/platform/MockPlatform.ts` | The engine: entity store, request handlers, event emitter, request log, cleanup tracking |
| `cypress/support/platform/fixtures.ts` | The default household (hub, devices, subsystems, scenes, rules, schedule, places, people, products) and the `DEVICE` / `SCENE` / `RULE` address constants specs import |
| `cypress/support/platform/types.ts` | Message envelope and fixture types |
| `cypress/support/commands.ts` | `cy.signIn`, `cy.platform`, `cy.expectRequest`, `cy.expectRequestAttrs`, `cy.toast`, `cy.setRange`, `cy.cleanupPlatform` |
| `cypress/support/e2e.ts` | Wires it up: routes the app's `/websocket` to the engine, answers the REST bridge via `cy.intercept`, resets before and cleans up after every test |

- **WebSocket**: `window:before:load` swaps `window.WebSocket` for a router that
  hands the platform socket (`/websocket…`) to `MockSocket`; everything else
  (Next.js HMR) passes through. A connection is accepted only while
  `platform.authenticated` is true — `cy.signIn()` sets it (as if the auth cookie
  were present), `POST /login` sets it when the fixture credentials match.
- **REST bridge** (`/login`, `/logout`, `/<ns>/<Command>`): a single `cy.intercept`
  parses the envelope and routes it to the same handlers.
- **Handlers** implement the commands the client sends (`base:SetAttributes`,
  `scene:Fire`, `scenetmpl:Create`, `ruletmpl:CreateRule`, `subsecurity:Arm`,
  pairing, hub registration, API keys, invitations, …). State changes push the
  same `base:ValueChange` / `base:Added` / `base:Deleted` events the platform
  would, so specs can assert that the UI reacts to the round trip, not just that
  it sent a request.
- **Every request is logged** — assert on it with
  `cy.expectRequest(type, predicate)` or `cy.expectRequestAttrs(type, attrs)`.
- **Failure paths**: `platform.failRequest(type, code, message)` makes the next
  request of that type fail; `platform.expireSession()` / `dropConnections(code)`
  simulate the platform ending the session.
- **Server pushes**: `platform.updateEntity(address, attrs)`, `addEntity(entity)`,
  `removeEntity(address)` and `emit(source, type, attrs)` drive real-time updates
  from the test.

### Writing a spec

```ts
import { Base, Switch } from '../../packages/arcus-core/src/capabilities/capabilities';
import { DEVICE, DEVICE_NAME } from '../support/platform/fixtures';

it('turns a switch on', () => {
  cy.signIn({ path: '/devices' });                  // fixture session, place data loaded
  cy.contains('button', DEVICE_NAME.coffee).closest('[data-device-address]')
    .find('[role="switch"]').click();
  cy.expectRequest(Base.CMD_SETATTRIBUTES, (r) =>  // what the UI sent
    r.destination === DEVICE.coffee && r.attributes[Switch.ATTR_STATE] === Switch.STATE_ON);
  cy.contains('On').should('be.visible');           // and that the pushed ValueChange was applied
});
```

- Use `cy.signIn({ customize: (p) => { … } })` to alter the fixture *before* the
  app loads (remove the hub, add an incident, set a service level).
- Prefer capability constants from `packages/arcus-core` over raw strings, as in
  the unit tests.
- **Select with `data-testid`, then assert on its text.** Every element a spec
  clicks, types into or reads — including page and panel headings — carries a
  `data-testid`; check copy with `tid('scenes-title').should('have.text', 'Scenes')`
  rather than `cy.contains('h2', 'Scenes')`. `cy.contains` remains only for
  transient copy with no stable element of its own (toasts via `cy.toast`,
  inline confirmation prompts, Next.js's 404 page). Never walk the DOM
  (`.parent()`, `.siblings()`, `.closest(...)`) — add an id instead.

### `data-testid` conventions

Ids are kebab-case, prefixed by the component's domain, and derived from a
stable identifier when the element repeats — never from display text alone.

| Pattern | Examples |
|---------|----------|
| `<domain>-<thing>` for singletons | `add-scene`, `alarm-arm-on`, `history-refresh`, `apikey-create` |
| `<page>-title` / `<panel>-panel-title` for headings | `scenes-title`, `catalog-title`, `scene-panel-title`, `rule-panel-title`, `person-panel-title` |
| `<domain>-<thing>-<id>` for repeated items, keyed by platform address / id / slug | `device-row-DRIV:dev:lamp`, `scene-card-goodnight`, `rule-row-1`, `place-card-place-maple`, `product-acme-plug`, `calltree-entry-SERV:person:person-alex` |
| Children of a repeated item carry the item's key too — **every id is unique on the page** | `device-toggle-DRIV:dev:coffee`, `device-toggle-DRIV:dev:relay-relay2`, `scene-run-goodnight`, `rule-edit-1`, `exit-delay-on`, `apikey-revoke-key-1`, `history-entry-0` |
| Generic components read a scope from the nearest `TestIdScope` provider (`src/lib/testIdScope.ts`) — never a test-only prop | `status-value-<card>-<badge>` (`CardShell` provides the card slug), `<info card id>-value-<label>` (`InfoCard`), `<scope>-perm-<cat>-<r\|w\|x\|all>` (`KeyCard` / the create form provide `apikey-<id>` / `apikey-new`) |
| Label-derived ids via `testIdSlug()` (`src/lib/testId.ts`) when the component is generic | `setting-record-on-security-alarm`, `info-value-current-plan`, `field-first-name`, `accordion-lights-switches`, `card-doors-locks`, `status-value-open` |
| State the test must read goes in a `data-*` attribute next to the id | `data-enabled`, `data-position`, `data-state`, `data-favorite`, `data-current` |

A global `afterEach` in `cypress/support/e2e.ts` fails any test whose page ends
up with a duplicate `data-testid`. Use a prefix selector
(`[data-testid^="history-entry-"]`) when a test needs the whole list.

Generic components that render more than once on a page get their scope from
`TestIdScope` rather than a prop, so callers don't thread test-only values
through. Shared components take an optional `testId` prop (`ControlSwitch`,
`SettingToggle`, `PersonRow`) or derive one from their label (`InfoCard`,
`InfoRow`, `Field`, `AccordionPanel`, `StatusBadge`, `CardShell`). Unit tests
follow the same ids (`screen.getByTestId`), so one id serves both suites.

### Cleanup

Every test starts from a pristine copy of the fixture (`platform.reset()` in a
global `beforeEach`). Anything a test creates on the platform — scenes, rules,
places, people, paired devices, registered hubs, pairing records, schedule
commands, API keys, invitations — is tracked in `platform.created` by the
handlers, and a global `afterEach` calls `cy.cleanupPlatform()` to remove it
(emitting `base:Deleted` so the UI drops it too) and asserts nothing is left.
Objects deleted through the UI (e.g. "Delete Scene") untrack themselves; a spec
can assert `cy.platform().its('created.size').should('eq', 0)` to prove it.

### Known gaps the suite documents

- `history.cy.ts` has a skipped test for the device filter: the page sends
  `place:ListHistoryEntries` to a device address (the platform expects
  `dev:ListHistoryEntries`), matching the **Broken** status in PRD §20.
- `cypress/e2e/debug.cy.ts` exercises the local-only `/debug` page, which is
  gitignored (`src/app/debug/`); it only runs where that page exists.
