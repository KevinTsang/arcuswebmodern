import { Suspense, type ReactElement } from 'react';
import { render, act, type RenderResult } from '@testing-library/react';

const withSuspense = (ui: ReactElement) => (
  <Suspense fallback={<p data-testid="suspense-fallback" />}>{ui}</Suspense>
);

/**
 * Renders a component that reads a promise with `use()` inside a Suspense
 * boundary, the way the side panel frame does, and waits for the promises it
 * was given to settle. Pass already-settled promises (`Promise.resolve(...)`).
 * The fallback has the test ID `suspense-fallback`. The returned `rerender`
 * keeps the same boundary, so the component keeps its state.
 */
export async function renderSuspended(ui: ReactElement): Promise<RenderResult> {
  let result!: RenderResult;
  await act(async () => {
    result = render(withSuspense(ui));
  });
  return { ...result, rerender: (next: ReactElement) => result.rerender(withSuspense(next)) };
}
