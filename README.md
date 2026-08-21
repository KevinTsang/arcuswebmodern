# Arcus Web Modern

A ground-up rebuild of the Arcus smart-home web client — migrating from the legacy
DoneJS/CanJS application (arcusweb) to a modern Next.js 16 + React 19 stack.

For the feature-by-feature parity tracking
against the legacy client, see [`PRD.md`](./PRD.md). For test conventions and the
containerized test setup, see [`testing.md`](./testing.md).

---

## Why migrate

The legacy client (arcusweb) is built on DoneJS/CanJS, a framework with a small
remaining ecosystem, no modern SSR/streaming story, and an aging test/build
toolchain. This project re-implements the same product surface — device control,
scenes, rules, alarms, care, scheduling, pairing, people/places management, etc. —
on a stack with an active ecosystem, strong typing, and better testability, while
talking to the **same Arcus platform** over the same Bridge/WebSocket protocol.

The migration is incremental and tracked feature-by-feature rather than as a single
cutover. [`PRD.md`](./PRD.md) is the living source of truth for what's **Done**,
**Partial**, or **Missing** relative to the legacy client.

## Stack comparison

| | Legacy (`arcusweb`) | Modern (`arcuswebmodern`) |
|---|---|---|
| Framework | DoneJS / CanJS | Next.js 16 (App Router) / React 19 |
| State management | CanJS observables | Redux Toolkit |
| Styling | Custom SCSS | Tailwind CSS v4 (utility classes, custom color tokens) |
| Language | JavaScript | TypeScript |
| Unit testing | QUnit | Jest 30 + React Testing Library |
| E2E testing | — | Cypress |
| Platform transport | Bridge over WebSocket | Bridge over WebSocket (same protocol) |
| Deployment | — | Docker (multi-stage `standalone` build) + Caddy TLS proxy |

## What carried over vs. what changed

**Carried over as-is:**
- The **Bridge pattern** for platform communication — `Bridge.request(command, address, attributes)` against capability constants (`Scene.CMD_FIRE`, `Switch.ATTR_STATE`, etc.), mirroring the legacy client's command/attribute vocabulary so both clients speak the same platform language.
- Cookie-based WebSocket auth (`irisAuthToken`, same-site, HTTPS) — inherited directly from the legacy client's session model. This is why local dev runs on `https://localdev.myDevUrl.com:8443` instead of `localhost`: the auth cookie is silently withheld cross-site, which would otherwise bounce every request to `/login`. See [`testing.md`](./testing.md#authentication) for the full explanation.
- Route structure for the Services section mirrors legacy's `/services/<subsystem>/<action>` path shape.

**Rebuilt / changed:**
- All UI is new — one React component per file, Tailwind v4 utilities instead of SCSS, typed props throughout.
- State moved from CanJS observables to Redux Toolkit slices (`src/store/slices/`), with typed hooks (`useAppDispatch`/`useAppSelector`) replacing direct store access.
- A new shared core package, `packages/arcus-core`, centralizes the Bridge client, capability constants, and auth/config logic so they aren't duplicated across the app (`@arcus/core` path alias).
- Testing moved from QUnit to Jest + React Testing Library with enforced coverage conventions (snapshot + rendering + interaction + edge-case tests per component — see [`testing.md`](./testing.md)), plus Cypress for E2E, replacing whatever the legacy suite used.
- New deployment path: a Dockerized production build behind a Caddy TLS proxy, versus however the legacy client was previously hosted.
- One capability with **no legacy equivalent**: API key generation with role-based permissions, added for `arcus-mqtt-server` integration.

## Architecture

```
src/
  app/                  Next.js App Router pages (route segments mirror legacy nav)
    (authenticated)/    devices, scenes, rules, services, history, settings, ...
    create-account/ invite/ login/
  components/           One exported component per file, grouped by domain
    devices/ scenes/ rules/ services/ subsystems/ schedules/ settings/ shared/ ...
  store/
    slices/             Redux Toolkit feature slices (devices, scenes, rules, ...)
    middleware/         Cornea (platform event) bridging into Redux
    thunks/             Async flows (login, logout, session handling)
  hooks/                Shared hooks (e.g. device capability access)
  lib/                  Cross-cutting utilities (favorites, config)
  __tests__/            Mirrors src/ structure; see testing.md
packages/arcus-core/
  src/
    bridge.ts           Bridge WebSocket client
    capabilities/        Capability/attribute/command constants
    cornea.ts            Platform event stream handling
    auth.ts config.ts    Auth + runtime config
cypress/                E2E tests
```

Path aliases: `@/*` → `src/*`, `@arcus/core` → `packages/arcus-core/src/index.ts`.

## Migration status

Tracked in detail in [`PRD.md`](./PRD.md), which catalogs ~25 feature areas
(auth, dashboard, devices, scenes, rules, scheduling, alarms, care, climate,
cameras, people/places, settings, hub management, pairing, history, pro
monitoring, product catalog, and more) as **Done**, **Partial**, **Missing**, or
**Broken** relative to the legacy client, plus a prioritized gap list.

At a glance:
- **At or near parity:** authentication, dashboard, core device control, scenes, alarms/security, people & places, pairing, product catalog, professional monitoring.
- **Largest open gap:** camera streaming, recording, and clip management — entirely unbuilt in the modern client.
- **Other notable gaps:** thermostat scheduling, billing/subscription management, care behavior CRUD, lock access/PIN management, hub WiFi/firmware configuration, irrigation scheduling, and several niche device types (water heaters/softeners, shades, keypads, pet doors, Halo devices, weather radios).

See PRD.md's **Priority Summary** for the full tiered breakdown of remaining work.

## Running locally

```bash
npm run dev          # HTTPS dev server on localhost.myDevUrl.com:8443
npm test             # Jest unit tests
npm run test:e2e     # Cypress E2E (headless)
npm run build         # Production build
npm run lint          # ESLint
```

Requires an `/etc/hosts` entry for `localhost.myDevUrl.com:8443` and local TLS certs
— see [`testing.md`](./testing.md) for setup, containerized (Docker + Caddy)
testing, and pointing the client at a different backend.
