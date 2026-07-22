# Testing

## Framework & Config

- Jest 30 with jsdom environment, ts-jest transform.
- React Testing Library (`@testing-library/react`) + `@testing-library/jest-dom` matchers.
- Tests live in `src/__tests__/<domain>/ComponentName.test.tsx`.
- Run tests: `npm test` (all), `npm run test:watch` (watch mode).

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
