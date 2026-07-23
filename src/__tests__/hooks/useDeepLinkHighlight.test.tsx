import { render, waitFor, act } from '@testing-library/react';
import { useDeepLinkHighlight } from '@/hooks/useDeepLinkHighlight';

// ── Mocks ─────────────────────────────────────────────────────────────

let mockParam: string | null = null;
const scrollIntoView = jest.fn();

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: (key: string) => (key === 'item' ? mockParam : null) }),
}));

beforeAll(() => {
  // jsdom does not implement scrollIntoView.
  window.HTMLElement.prototype.scrollIntoView = scrollIntoView;
});

beforeEach(() => {
  jest.clearAllMocks();
  mockParam = null;
});

// Harness that exercises the hook against a real list of DOM nodes.
function Harness({ items, ms }: { items: string[]; ms?: number }) {
  const { highlighted, registerItem } = useDeepLinkHighlight('item', items.length, ms);
  return (
    <ul>
      {items.map((key) => (
        <li
          key={key}
          ref={registerItem(key)}
          data-key={key}
          data-highlighted={highlighted === key ? 'true' : 'false'}
        >
          {key}
        </li>
      ))}
    </ul>
  );
}

function item(container: HTMLElement, key: string): HTMLElement | null {
  return container.querySelector(`[data-key="${key}"]`);
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('useDeepLinkHighlight', () => {
  it('scrolls to and highlights the item matching the param', async () => {
    mockParam = 'b';
    const { container } = render(<Harness items={['a', 'b', 'c']} />);

    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1));
    expect(item(container, 'b')?.dataset.highlighted).toBe('true');
    expect(item(container, 'a')?.dataset.highlighted).toBe('false');
  });

  it('does nothing when the param is absent', () => {
    render(<Harness items={['a', 'b']} />);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('does nothing when the param matches no item', () => {
    mockParam = 'missing';
    const { container } = render(<Harness items={['a', 'b']} />);
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(item(container, 'a')?.dataset.highlighted).toBe('false');
  });

  it('handles a target only once even as the list re-renders', async () => {
    mockParam = 'a';
    const { rerender } = render(<Harness items={['a']} />);
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1));

    // An unrelated update (same target, more items) must not re-scroll.
    rerender(<Harness items={['a', 'b']} />);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('retries once the target appears in a later render', async () => {
    mockParam = 'b';
    const { rerender } = render(<Harness items={['a']} />);
    expect(scrollIntoView).not.toHaveBeenCalled();

    rerender(<Harness items={['a', 'b']} />);
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1));
  });

  it('clears the highlight after the timeout', () => {
    jest.useFakeTimers();
    try {
      mockParam = 'a';
      const { container } = render(<Harness items={['a']} ms={1000} />);
      expect(item(container, 'a')?.dataset.highlighted).toBe('true');

      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(item(container, 'a')?.dataset.highlighted).toBe('false');
    } finally {
      jest.useRealTimers();
    }
  });
});
