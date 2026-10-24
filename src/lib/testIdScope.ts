import { createContext, useContext } from 'react';

/**
 * Scope for `data-testid`s rendered by generic components.
 *
 * A container that renders a generic component more than once wraps each
 * instance in a provider: `CardShell` provides its card slug for
 * `StatusBadge`, `InfoCard` its card id for `InfoRow`, and each API key (and
 * the create form) its own id for `PermissionsTable`. The generic component
 * folds the scope into its ids, so they stay unique on the page without the
 * caller threading a test-only prop through. The innermost provider wins.
 */
export const TestIdScope = createContext<string | null>(null);

/** The enclosing test-id scope, or `null` outside any provider. */
export function useTestIdScope(): string | null {
  return useContext(TestIdScope);
}
