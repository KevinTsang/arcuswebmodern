import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { CreatedKeyBanner } from '@/components/api-keys/CreatedKeyBanner';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockWriteText = jest.fn();

beforeAll(() => {
  Object.assign(navigator, { clipboard: { writeText: (text: string) => mockWriteText(text) } });
});

// ── Helpers ───────────────────────────────────────────────────────────

const TOKEN = 'arcus_sk_new_token';

function renderBanner(onDismiss = jest.fn()) {
  return render(<CreatedKeyBanner token={TOKEN} onDismiss={onDismiss} />);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockWriteText.mockResolvedValue(undefined);
});

afterEach(() => {
  jest.useRealTimers();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('CreatedKeyBanner', () => {
  it('matches snapshot', () => {
    const { asFragment } = renderBanner();
    expect(asFragment()).toMatchSnapshot();
  });

  it('shows the token and a one-time warning', () => {
    renderBanner();
    expect(screen.getByTestId('apikey-token')).toHaveTextContent(TOKEN);
    expect(screen.getByTestId('apikey-created')).toHaveTextContent('it will not be shown again');
  });

  it('copies the token and says so', async () => {
    renderBanner();
    fireEvent.click(screen.getByTestId('apikey-copy'));

    expect(mockWriteText).toHaveBeenCalledWith(TOKEN);
    await waitFor(() => expect(screen.getByTestId('apikey-copy')).toHaveTextContent('Copied'));
  });

  it('goes back to Copy two seconds after copying', async () => {
    jest.useFakeTimers();
    renderBanner();
    fireEvent.click(screen.getByTestId('apikey-copy'));
    await act(() => mockWriteText.mock.results[0].value);
    expect(screen.getByTestId('apikey-copy')).toHaveTextContent('Copied');

    act(() => { jest.advanceTimersByTime(2000); });
    expect(screen.getByTestId('apikey-copy')).toHaveTextContent('Copy');
  });

  it('calls onDismiss when Dismiss is clicked', () => {
    const onDismiss = jest.fn();
    renderBanner(onDismiss);
    fireEvent.click(screen.getByTestId('apikey-dismiss'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
