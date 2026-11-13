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

1. **Snapshot test** — Verify visual rendering with `toMatchSnapshot()` on `asFragment()`:
   ```tsx
   it('matches snapshot', () => {
     const { asFragment } = render(<Component {...defaultProps} />);
     expect(asFragment()).toMatchSnapshot();
   });
   ```
   `asFragment()` records every element the component rendered, without the wrapper `<div>`
   React Testing Library adds, and copies the DOM at the moment it is called.

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
  See [Testing Promises and Timers](#testing-promises-and-timers) for stubbing results, waiting on a
  specific promise, and fake timers.

## Testing Promises and Timers

Async code waits on promises, on timers, or on both. Jest controls each one: mocked calls
decide when a promise settles, and fake timers decide when the clock moves. The test drives
both, so nothing waits on real time or a real network.

### Stubbing async results

Use `mockResolvedValue` and `mockRejectedValue` instead of writing
`mockImplementation(() => Promise.resolve(...))` by hand. Set the success value in
`beforeEach` so every test starts on the happy path, and override a single call with the
`…Once` variants in the tests that need something else.

```tsx
const mockBridgeRequest = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockBridgeRequest.mockResolvedValue({ [Place.ATTR_NAME]: 'Beach House' });
});

it('shows an error when saving fails', async () => {
  mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
  // ...render, click Save...
  await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(SAVE_ERROR));
});
```

- **Prefer `…Once` for failures.** A test that only fails the first call leaves later calls
  (a retry, a second load) on the default success value, which is usually what a retry test
  wants.
- **Reject with an `Error`** unless the code under test reads a platform error shape. Then
  reject with that shape, such as `{ code: 'error.unsupported' }`, so the test exercises the
  same branch the platform would.
- `mockRejectedValue` builds a new rejected promise on each call, so setting it without
  calling the mock does not cause an unhandled rejection.

### Asserting on a promise

Use `.resolves` and `.rejects` when the test holds the promise itself — a helper, a thunk's
`unwrap()`, or a service call. **Always `await` them** (or `return` them).

```tsx
await expect(fetchPlaces(placeId)).resolves.toEqual([newPlace]);
await expect(fetchPlaces('missing')).rejects.toThrow('not found');
await expect(fetchPlaces('legacy')).rejects.toMatchObject({ code: 'error.unsupported' });
```

Without the `await`, the test finishes before the promise settles. A passing assertion is
never checked. A failing one surfaces afterwards as an unhandled rejection that crashes the
whole Jest run instead of failing its own test.

For assertions on what a *component* does with a promise (a toast, a closed panel, a
re-enabled button), wait on the UI with `waitFor` or `findBy…`, not on the promise.

### Waiting for a mocked promise to settle

When a test has to let a mocked call finish before asserting, wait on that call's own
promise. `mock.results` holds what each call returned:

```tsx
fireEvent.click(screen.getByTestId('contact-save'));
await act(() => mockBridgeRequest.mock.results[0].value);
expect(mockCloseRight).toHaveBeenCalled();
```

- **Mounted component:** wrap the wait in `act`, because the component's handler resumes and
  updates state once the promise settles.
- **Already unmounted (after `cleanup()`):** `act` is not needed. Await the promise directly,
  for example with `await expect(mock.mock.results[0].value).resolves.toBe(...)`.
- **Avoid** `await act(async () => {})` and `await new Promise(process.nextTick)`. Both flush
  only the promises already queued, so they break silently if the code gains another `await`.
  Jest's fake timers also replace `process.nextTick` by default, so that version hangs under
  `jest.useFakeTimers()`.

### Asserting on the in-between state

Verify in-flight states ("still saving", "Stopping…", a disabled button) with `waitFor` or
`screen.findByTestId`, while the request is held open with `new Promise(() => {})`. A held
request never settles, so the in-flight state stays on screen for as long as the query needs
to find it:

```tsx
mockBridgeRequest.mockReturnValueOnce(new Promise(() => {}));

fireEvent.click(screen.getByTestId('contact-save'));
await waitFor(() => expect(screen.getByTestId('contact-save')).toBeDisabled());
expect(await screen.findByTestId('contact-save')).toHaveTextContent('Saving…');
```

- **Hold the request open.** With a resolved mock, the request can finish before the query
  looks. `await screen.findByTestId(...)` then hands back an element that has already left the
  page, and a state set after an earlier `await` is never seen at all.
- **Pick the query by what the assertion needs.** `screen.findByTestId` waits for an element to
  appear and returns it, so it suits an element that only exists in flight, such as a spinner.
  `waitFor` retries an assertion until it passes, so it suits a change to an element that is
  already there, such as a button becoming disabled.
- **Test what happens after the request settles separately.** A held request never finishes, so
  give the settled case its own test with `mockResolvedValueOnce` or `mockRejectedValueOnce`, and
  wait for the result with `waitFor`:

  ```tsx
  mockBridgeRequest.mockResolvedValueOnce({});
  fireEvent.click(screen.getByTestId('contact-save'));
  await waitFor(() => expect(mockCloseRight).toHaveBeenCalled());
  ```

- **Wait on the call itself when nothing visible changes.** If the settled result is that
  nothing happens (no second close, no extra request), `waitFor` passes before the request even
  settles. Wait on the call's own promise instead, as in
  [Waiting for a mocked promise to settle](#waiting-for-a-mocked-promise-to-settle), then assert.

- **Wait on a rejection with `.rejects`.** `await act(() => expect(promise).rejects.toThrow('timeout'))`
  lets a `mockRejectedValueOnce` call fail without an unhandled rejection.
- **Override with `…Once`.** `mockReturnValue` and `mockImplementation` apply to every later
  call, and `jest.clearAllMocks()` does not reset them, so a one-test override leaks into the
  tests that follow.
- **Hold the call open for timeouts too.** A test that lets a timeout fire while the request is
  still pending also uses `new Promise(() => {})` (see
  [Promises that haven't settled yet](#promises-that-havent-settled-yet)).

### Setting up fake timers

Use `jest.useFakeTimers()` when the code under test waits on `setTimeout` or `setInterval`,
such as a countdown, an auto-dismissing toast, or a request timeout. The test then moves the
clock itself instead of waiting for real time to pass.

Switch to fake timers before the code schedules anything, and always switch back in
`afterEach`. The fake clock otherwise stays on for every later test in the file.

```tsx
afterEach(() => {
  jest.useRealTimers();
});

it('ticks down once a second', () => {
  jest.useFakeTimers();
  render(<Countdown durationSeconds={5} />);

  act(() => { jest.advanceTimersByTime(2000); });
  expect(screen.getByText('0:03')).toBeInTheDocument();
});
```

- **Call it before `render`.** A timer scheduled while real timers were active stays real, and
  advancing the fake clock won't fire it.
- **Turn it on per test** when only a few tests need it, or in `beforeEach` when the whole file
  does. Either way, restore real timers in `afterEach` rather than at the end of the test, so a
  failing assertion can't skip the cleanup.

### Advancing the clock

- **Wrap advances in `act`** when a timer updates React state:
  `act(() => { jest.advanceTimersByTime(1000); })`. Without it, React warns that an update was
  not wrapped in `act`. Plain modules such as the Bridge client need no `act`.
- **For intervals, advance by whole periods.** Advancing by three intervals fires the callback
  three times. `jest.runOnlyPendingTimers()` fires only the timers already queued. Avoid
  `jest.runAllTimers()` while an interval is running: the interval keeps rescheduling itself, so
  Jest fires 100,000 timers and then throws.

### Promises that haven't settled yet

Fake timers only move when the test moves them, so a promise that waits on a timer stays
pending until the test advances the clock.

- **Start the promise, advance the clock, then await it.** Awaiting first never returns: the
  promise waits on the clock, and the clock waits on the test, so the test hangs until Jest's
  timeout fails it.

  ```ts
  const pending = cornea.send(request());
  jest.advanceTimersByTime(cornea.timeout);
  await expect(pending).rejects.toEqual({ type: 'Error', message: TIMEOUT_MESSAGE });
  ```

- **Let a timeout fire while a request is still pending** by holding the call open with
  `new Promise(() => {})`. Check the in-flight state first, then advance past the deadline:

  ```tsx
  mockBridgeRequest.mockReturnValueOnce(new Promise(() => {}));
  fireEvent.click(screen.getByTestId('contact-save'));
  await waitFor(() => expect(screen.getByTestId('contact-save')).toBeDisabled());

  await act(() => jest.advanceTimersByTimeAsync(REQUEST_TIMEOUT));
  expect(mockDispatch).toHaveBeenCalledWith(TIMEOUT_ERROR);
  ```

- **Use `advanceTimersByTimeAsync` when promises and timers interleave.** That covers a timer
  callback that awaits a promise, and code that awaits a request before it schedules a timer.
  `advanceTimersByTime` runs synchronously, so it fires nothing that is scheduled after an
  `await`, and it returns before an awaited callback finishes. The async variant settles the
  pending promises between timers. Wrap it in an async `act` when it updates React state:
  `await act(() => jest.advanceTimersByTimeAsync(1000))`.

### What else fake timers change

- **`Date` is faked too.** Advancing the clock moves `Date.now()`. Use
  `jest.setSystemTime(new Date('2026-01-01T00:00:00Z'))` for code that formats or compares
  timestamps.
- **`process.nextTick` is faked**, so `await new Promise(process.nextTick)` never resolves.
  Promises are not faked: `mockResolvedValue` mocks still settle, and waiting on
  `mock.results[0].value` works as described in
  [Waiting for a mocked promise to settle](#waiting-for-a-mocked-promise-to-settle).
- **`waitFor` and `findBy…` still work.** React Testing Library advances Jest's fake clock while
  it polls.
- **`userEvent` needs the clock passed in**:
  `userEvent.setup({ advanceTimers: jest.advanceTimersByTime })`. Without it, its built-in
  delays never elapse and the test hangs until it times out.

### Checking that timers are cleaned up

`jest.getTimerCount()` returns how many fake timers are still pending. Check it after an
unmount, or after a request settles, to catch a timer that was never cleared:

```tsx
const { unmount } = render(<Countdown durationSeconds={5} />);
unmount();
expect(jest.getTimerCount()).toBe(0);
```

## Snapshot Best Practices

- One snapshot per component for the default/primary render state.
- Additional snapshots for significantly different visual states (disabled, loading, error, empty).
- Snapshot `asFragment()`, not `container` or `container.firstChild`. The full container adds the
  wrapper `<div>`, and `firstChild` silently drops every root after the first when a component
  renders a fragment with several siblings.
- Review snapshot changes carefully on update; they are a safety net against unintended visual regressions.

## Containerized Testing

Runs the production images (see [README → Docker images](./README.md#docker-images)) in
Docker against the dev platform, mirroring `npm run dev`'s hostname/HTTPS setup so the
platform session cookie keeps working.

### Prerequisites

- A container engine with a `docker` + `docker compose` CLI. **Rancher Desktop**
  (dockerd/moby backend) works; so does Docker Engine. Rancher installs its CLI to
  `~/.rd/bin` and adds it to your shell PATH.
- An `/etc/hosts` entry so the same-site hostname resolves locally:

  ```
  127.0.0.1  localdev.example.com
  ```

- TLS certs at `certs/cert.pem` / `certs/key.pem` covering `localdev.example.com`
  (the same certs `npm run dev` uses; gitignored, kept locally).

`example.com` stands for your platform's domain: replace it here and in `package.json`'s
`dev` script, `Caddyfile` and `docker-compose.yml`. The page must be same-site with the
platform, or its auth cookie isn't sent (see [Authentication](#authentication)).

### Run it

```bash
docker compose up --build -d     # build the image + start app (ui) and TLS proxy (proxy)
docker compose logs -f           # tail all services
docker compose down              # stop and remove containers
```

Then open **https://localdev.example.com:8443** (accept the self-signed cert once)
and sign in on **/login**.

### How it fits together

| Piece | Role |
|-------|------|
| `docker/ui-server/` | Static export of the app served by nginx on HTTP `:8096` |
| `docker-compose.yml` | `ui` + `proxy` (Caddy) on one network |
| `Caddyfile` | Terminates HTTPS at `localdev.example.com:8443`, reverse-proxies to `ui:8096` |

The browser loads the app over HTTPS from the same-site hostname; platform API/WebSocket
traffic goes **directly** from the browser to `client.dev.example.com` (there are no
rewrites in `next.config.ts`), so Caddy only serves the app itself.

### Authentication

The client talks to the platform over a **browser WebSocket**, which can't carry a custom
auth header — the only credential it can send is the `irisAuthToken` cookie. That cookie is
scoped to `.example.com` and `SameSite`, so it is attached to the WebSocket handshake
**only** when the page is loaded over HTTPS from a same-site host. That is why both
`npm run dev` and this container serve from `localdev.example.com` rather than
`localhost` — loading from `localhost` (e.g. the `ui` container on its own) is cross-site and the cookie
is silently withheld, bouncing you to `/login`.

To authenticate, use the **/login** page: it POSTs credentials to the platform, which sets
`irisAuthToken` for you. (You can also paste a still-valid token onto the `.example.com`
domain in DevTools, but scripted login is more robust.)

### Sharing a session with the deployed dev client

The browser stores `irisAuthToken` against the **platform** host, not the page,
so every page that can send it (see above) uses the same session: other tabs, the
deployed dev client and a local `npm run dev` or container instance. Switching
between them needs no new sign-in when:

- both run in the **same browser profile**, and
- both pages are **same-site with the platform**: the local instance on
  `localdev.example.com` and the deployed client on any other `*.example.com` host.

Signing in again on any of them makes the platform end the previous session (4001
close or `sess:SessionExpired`) and stores the new token in that shared cookie. The
other clients then reconnect with that cookie (`resumeSessionThunk`) and reload their
place, rather than sending you to `/login?expired=1`. Signing out still signs out
everywhere, because the cookie is cleared.

A page that isn't same-site with the platform (`localhost`, a deployed client on
another domain) can't share the session from client code: the cookie is HttpOnly and
`SameSite`, so the page can't read it, and the browser won't send it. The options are:

1. **Serve it from the platform's site** (recommended): add a `localdev.<domain>`
   hosts entry, as above, and deploy the dev client under the same domain.
2. **Platform cookie config:** issue `irisAuthToken` with `SameSite=None; Secure`
   so it's sent cross-site. This is a platform change and loosens CSRF protection
   for every client, so it isn't recommended.
3. **Dev reverse proxy** in front of the platform, with `Set-Cookie` rewritten to the
   page's host. The proxied page gets a working session of its own, but it isn't
   shared with the deployed client.

A token copied from DevTools onto the page's URL or into page storage isn't offered:
that puts the session token where scripts and logs can read it.

### Pointing at a different backend

The image reads the platform URLs when the container starts, from the same `ARCUS_*`
variables as the legacy ui-server. Change them under `ui.environment` in
`docker-compose.yml` and recreate the container — no rebuild needed:

```bash
docker compose up -d ui
```

(`npm run dev` still takes its URLs from the `NEXT_PUBLIC_*` values in `.env.local`.)

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
`npm run dev` (HTTPS on `localdev.example.com`) is **not** used for E2E.

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
  request of that type fail; `platform.expireSession()` / `revokeSession()` /
  `dropConnections(code)` simulate the platform ending the session, and
  `replaceSession()` simulates signing in on another client that shares the cookie
  (this session's sockets close with 4001, the cookie stays valid).
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
| Label-derived ids via `testIdSlug()` (`src/lib/testId.ts`) when the component is generic | `setting-fan-shutoff-on-smoke`, `info-value-current-plan`, `field-first-name`, `accordion-lights-switches`, `card-doors-locks`, `status-value-open` |
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
