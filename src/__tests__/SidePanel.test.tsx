import { use, useState, type ReactNode } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SidePanelProvider, useSidePanel } from '@/components/SidePanel';

// ── Mocks ─────────────────────────────────────────────────────────────

let mockPathname = '/devices';

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

// ── Helpers ───────────────────────────────────────────────────────────

interface HarnessProps {
  side: 'left' | 'right';
  content: ReactNode;
  title?: string;
  label?: string;
  panelKey?: string;
}

/** Opens `content` in a panel when its button is clicked. */
function Opener({ side, content, title, label = `open-${side}`, panelKey = label }: HarnessProps) {
  const { openLeft, openRight } = useSidePanel();
  const open = side === 'left' ? openLeft : openRight;
  return <button onClick={() => open(content, { title, key: panelKey })}>{label}</button>;
}

function renderProvider(openers: ReactNode) {
  return render(<SidePanelProvider>{openers}</SidePanelProvider>);
}

const open = (label: string) => fireEvent.click(screen.getByRole('button', { name: label }));

function Suspends({ promise }: { promise: Promise<string> }) {
  return <p>{use(promise)}</p>;
}

/** Panel with local state, to tell a remount from a reused instance. */
function Counter({ name }: { name: string }) {
  const [count, setCount] = useState(0);
  return (
    <button onClick={() => setCount((c) => c + 1)}>
      {name}: {count}
    </button>
  );
}

function Throws(): never {
  throw new Error('broken panel');
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPathname = '/devices';
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('SidePanel', () => {
  it('matches snapshot', () => {
    const { asFragment } = renderProvider(<Opener side="right" content={<p>Body</p>} title="Device Details" />);
    open('open-right');
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders nothing inside the panels when closed', () => {
    renderProvider(<Opener side="right" content={<p>Body</p>} />);
    expect(screen.queryByTestId('side-panel-right')).not.toBeInTheDocument();
    expect(screen.queryByTestId('side-panel-right-close')).not.toBeInTheDocument();
  });

  it('shows the title, the content and exactly one close button', () => {
    renderProvider(<Opener side="right" content={<p>Body</p>} title="Device Details" />);
    open('open-right');
    expect(screen.getByTestId('side-panel-right-title')).toHaveTextContent('Device Details');
    expect(screen.getByTestId('side-panel-right')).toHaveTextContent('Body');
    expect(screen.getAllByRole('button', { name: 'Close panel' })).toHaveLength(1);
  });

  it('omits the title when none is given', () => {
    renderProvider(<Opener side="right" content={<p>Body</p>} />);
    open('open-right');
    expect(screen.queryByTestId('side-panel-right-title')).not.toBeInTheDocument();
    expect(screen.getByTestId('side-panel-right-close')).toBeInTheDocument();
  });

  it('replaces the title when other content is opened', () => {
    renderProvider(
      <>
        <Opener side="right" content={<p>One</p>} title="First" label="one" />
        <Opener side="right" content={<p>Two</p>} label="two" />
      </>,
    );
    open('one');
    open('two');
    expect(screen.queryByTestId('side-panel-right-title')).not.toBeInTheDocument();
    expect(screen.getByTestId('side-panel-right')).toHaveTextContent('Two');
  });

  it('closes the right panel from its close button', () => {
    renderProvider(<Opener side="right" content={<p>Body</p>} title="Device Details" />);
    open('open-right');
    fireEvent.click(screen.getByTestId('side-panel-right-close'));
    expect(screen.queryByTestId('side-panel-right')).not.toBeInTheDocument();
    expect(screen.queryByTestId('side-panel-right-title')).not.toBeInTheDocument();
  });

  it('opens and closes the left panel', () => {
    renderProvider(<Opener side="left" content={<p>Left</p>} title="Menu" />);
    open('open-left');
    expect(screen.getByTestId('side-panel-left-title')).toHaveTextContent('Menu');
    fireEvent.click(screen.getByTestId('side-panel-left-close'));
    expect(screen.queryByTestId('side-panel-left')).not.toBeInTheDocument();
  });

  it('shows the loading fallback under the title while content suspends', async () => {
    let resolve!: (value: string) => void;
    const promise = new Promise<string>((r) => {
      resolve = r;
    });
    renderProvider(<Opener side="right" content={<Suspends promise={promise} />} title="Scene" />);
    // Awaited so React flushes the suspended render and its retry inside act.
    await act(async () => open('open-right'));

    expect(screen.getByTestId('side-panel-right-loading')).toBeInTheDocument();
    expect(screen.getByTestId('side-panel-right-title')).toHaveTextContent('Scene');
    expect(screen.getByTestId('side-panel-right-close')).toBeInTheDocument();

    await act(async () => resolve('Loaded'));
    expect(await screen.findByText('Loaded')).toBeInTheDocument();
    expect(screen.queryByTestId('side-panel-right-loading')).not.toBeInTheDocument();
  });

  it('shows an error under the header when the content throws, and recovers on the next open', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    renderProvider(
      <>
        <Opener side="right" content={<Throws />} title="Broken" label="broken" />
        <Opener side="right" content={<p>Working</p>} title="Fine" label="fine" />
      </>,
    );

    open('broken');
    expect(screen.getByTestId('side-panel-right-error')).toHaveTextContent('Something went wrong loading this panel.');
    expect(screen.getByTestId('side-panel-right-title')).toHaveTextContent('Broken');
    expect(screen.getByTestId('side-panel-right-close')).toBeInTheDocument();

    open('fine');
    expect(screen.queryByTestId('side-panel-right-error')).not.toBeInTheDocument();
    expect(screen.getByTestId('side-panel-right')).toHaveTextContent('Working');
    consoleError.mockRestore();
  });

  it('shows the error when a suspended promise rejects', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const rejected = Promise.reject(new Error('load failed'));
    rejected.catch(() => {});
    renderProvider(<Opener side="right" content={<Suspends promise={rejected} />} title="Scene" />);
    await act(async () => open('open-right'));
    expect(screen.getByTestId('side-panel-right-error')).toBeInTheDocument();
    consoleError.mockRestore();
  });

  it('remounts the content when a panel with another key is opened', () => {
    renderProvider(
      <>
        <Opener side="right" content={<Counter name="A" />} label="a" panelKey="device-details:A" />
        <Opener side="right" content={<Counter name="B" />} label="b" panelKey="device-details:B" />
      </>,
    );
    open('a');
    fireEvent.click(screen.getByRole('button', { name: 'A: 0' }));
    expect(screen.getByRole('button', { name: 'A: 1' })).toBeInTheDocument();

    open('b');
    expect(screen.getByRole('button', { name: 'B: 0' })).toBeInTheDocument();
  });

  it('keeps the content mounted when the same key is opened again', () => {
    renderProvider(
      <>
        <Opener side="right" content={<Counter name="A" />} label="first" panelKey="change-password" />
        <Opener side="right" content={<Counter name="A" />} label="again" panelKey="change-password" />
      </>,
    );
    open('first');
    fireEvent.click(screen.getByRole('button', { name: 'A: 0' }));
    open('again');
    expect(screen.getByRole('button', { name: 'A: 1' })).toBeInTheDocument();
  });

  it('remounts the content after the panel is closed and reopened with the same key', () => {
    renderProvider(<Opener side="right" content={<Counter name="A" />} panelKey="change-password" />);
    open('open-right');
    fireEvent.click(screen.getByRole('button', { name: 'A: 0' }));
    fireEvent.click(screen.getByTestId('side-panel-right-close'));
    open('open-right');
    expect(screen.getByRole('button', { name: 'A: 0' })).toBeInTheDocument();
  });

  it('shows the loading fallback again when a new key replaces loaded content', async () => {
    let resolve!: (value: string) => void;
    const pending = new Promise<string>((r) => {
      resolve = r;
    });
    renderProvider(
      <>
        <Opener side="right" content={<p>Scene A</p>} label="a" panelKey="scene:A" />
        <Opener side="right" content={<Suspends promise={pending} />} label="b" panelKey="scene:B" />
      </>,
    );
    open('a');
    await act(async () => open('b'));

    expect(screen.getByTestId('side-panel-right-loading')).toBeInTheDocument();
    expect(screen.queryByText('Scene A')).not.toBeInTheDocument();

    await act(async () => resolve('Scene B'));
    expect(await screen.findByText('Scene B')).toBeInTheDocument();
  });

  it('closes both panels when the route changes', () => {
    const openers = (
      <>
        <Opener side="left" content={<p>Left</p>} title="Menu" />
        <Opener side="right" content={<p>Right</p>} title="Details" />
      </>
    );
    const { rerender } = renderProvider(openers);
    open('open-left');
    open('open-right');
    mockPathname = '/scenes';
    rerender(<SidePanelProvider>{openers}</SidePanelProvider>);
    expect(screen.queryByTestId('side-panel-left')).not.toBeInTheDocument();
    expect(screen.queryByTestId('side-panel-right')).not.toBeInTheDocument();
  });
});
