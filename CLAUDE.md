# Arcus Web Modern — Development Guidelines

## Arcus Web Modern - Claude instructions
The project has the following key documents:
- [PRD](PRD.md): The goal of the project and the planned features

Always start by reading PRD.md to understand the scope of work remaining. Update the PRD after a feature is complete.

## Project Overview

Next.js 16 + React 19 smart-home web client. Uses Redux Toolkit for state, Tailwind CSS v4 for styling, Jest 30 + React Testing Library for unit tests, and Cypress for E2E tests.

## Architecture

- **`src/components/`** — React components organized by domain (`home/`, `devices/`, `scenes/`, `rules/`, `settings/`, `shared/`, etc.)
- **`src/store/`** — Redux Toolkit store with typed hooks (`useAppDispatch`, `useAppSelector`) in `src/store/hooks.ts`
- **`src/store/slices/`** — Feature slices (devices, scenes, rules, people, etc.)
- **`packages/arcus-core/`** — Shared core library: capability constants, Bridge WebSocket client
- **`src/__tests__/`** — Unit tests mirroring source structure (`devices/`, `scenes/`, `shared/`, `store/slices/`, `hooks/`, `pages/`, etc.)
- **`src__tests__/helpers/factories.ts`** - Store entity creation helper methods for testing purposes
- **`cypress/`** — E2E tests

### Path Aliases

- `@/*` → `./src/*`
- `@arcus/core` → `./packages/arcus-core/src/index.ts`
- `@arcus/core/*` → `./packages/arcus-core/src/*`

### Bridge Pattern

All platform communication goes through `Bridge.request(command, address, attributes)`. Commands and attribute keys use capability constants from `@arcus/core` (e.g., `Scene.CMD_FIRE`, `Base.CMD_SETATTRIBUTES`, `Switch.ATTR_STATE`).

## React Components

### One Function Per File

Each component function lives in its own file. Do not define multiple exported components in a single file.

### Component Style

- Use `'use client'` directive for components with state, effects, or event handlers.
- Use named exports: `export function ComponentName()`.
- Keep components concise and focused on a single responsibility.
- Use TypeScript interfaces for props; define inline or in a shared `types.ts` when reused.

### Styling

- Tailwind CSS v4 utility classes only. No CSS modules or styled-components.
- Project uses custom color tokens: `crane` (background), `swift` (text), `grouse` (muted text), `coot` (secondary text), `heron` (borders), `pigeon` (subtle bg), `peacock` (primary/accent), `lovebird` (success/active).
- Border radius: `rounded-[var(--border-radius-base)]`.
- Do not add `@import "tailwindcss"` or Tailwind directives in component files.

### Redux Integration

- Use `useAppDispatch` and `useAppSelector` from `@/store/hooks` — never raw `useDispatch`/`useSelector`.
- Dispatch notification toasts via `addNotification({ type, message })` from `@/store/slices/uiSlice`.

## Testing

### Framework & Config

- Jest 30 with jsdom environment, ts-jest transform.
- React Testing Library (`@testing-library/react`) + `@testing-library/jest-dom` matchers.
- Tests live in `src/__tests__/<domain>/ComponentName.test.tsx`.
- Run tests: `npm test` (all), `npm run test:watch` (watch mode).

### Test Structure

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

### Required Test Coverage

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

### Mocking Patterns

- **Bridge**: `jest.mock('@arcus/core/bridge', () => ({ __esModule: true, default: { request: (...args: any[]) => mockBridgeRequest(...args) } }));`
- **Redux dispatch**: `jest.mock('@/store/hooks', () => ({ useAppDispatch: () => mockDispatch }));`
- **Notifications**: `jest.mock('@/store/slices/uiSlice', () => ({ addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }) }));`
- **Device hooks**: `jest.mock('@/hooks/useDeviceCapability', () => ({ useDevice: () => mockDevice }));`
- Use `waitFor()` for assertions on async operations (Bridge calls, dispatches after promises).

### Snapshot Best Practices

- One snapshot per component for the default/primary render state.
- Additional snapshots for significantly different visual states (disabled, loading, error, empty).
- Keep snapshots focused — snapshot `container.firstChild` not the full container.
- Review snapshot changes carefully on update; they are a safety net against unintended visual regressions.

## Commands

```bash
npm test                  # Run all unit tests
npm run test:watch        # Run tests in watch mode
npm run dev               # Start dev server (HTTPS on port 8443)
npm run build             # Production build
npm run lint              # ESLint
npm run test:e2e          # Cypress E2E (headless)
npm run test:e2e:open     # Cypress E2E (interactive)
```

## Feature Parity

See [`PRD.md`](./PRD.md) for a detailed comparison of this project against the legacy client (`~/arcusweb`). It catalogs every feature area with **Done** / **Partial** / **Missing** status and a prioritized list of remaining gaps.

## Code Conventions

- Prefer capability constants from `@arcus/core` over raw strings for attribute keys, command names, and state values — in both source and test files. Use computed property syntax in object literals (e.g., `{ [Base.ATTR_ADDRESS]: addr }` not `{ 'base:address': addr }`). Use command constants in Bridge calls (e.g., `Bridge.request(Scene.CMD_FIRE, ...)` not `Bridge.request('scene:Fire', ...)`).
- Use `useCallback` for event handlers passed to child components or used in dependency arrays.
- Avoid `unknown` and `Record<string, unknown>` types. Define typed interfaces for data structures (props, API responses, platform objects) instead of passing untyped records. When interfacing with platform models, create interfaces that describe the expected attributes.
- Error handling: wrap Bridge calls in try/catch, dispatch error notifications on failure.
