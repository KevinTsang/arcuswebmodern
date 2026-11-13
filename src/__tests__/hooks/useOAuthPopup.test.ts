import { act, renderHook } from '@testing-library/react';
import { useOAuthPopup, POPUP_CLOSED_POLL_MS, OAUTH_POPUP_NAME } from '@/hooks/useOAuthPopup';
import { OAUTH_MESSAGE } from '@/lib/cloudPairing';

// ── Helpers ───────────────────────────────────────────────────────────

const OAUTH_URL = 'https://oauth.example.com/start?p=1';
const ORIGIN = 'https://oauth.example.com';

interface FakePopup {
  closed: boolean;
  close: jest.Mock;
  focus: jest.Mock;
}

const callbacks = {
  onClosed: jest.fn(),
  onComplete: jest.fn(),
  onExitToCatalog: jest.fn(),
  onExitToSupport: jest.fn(),
};

let popup: FakePopup;
let openSpy: jest.SpyInstance;

const post = (type: string, origin = ORIGIN) => {
  act(() => {
    window.dispatchEvent(new MessageEvent('message', { origin, data: { type } }));
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  popup = { closed: false, close: jest.fn(), focus: jest.fn() };
  popup.close.mockImplementation(() => { popup.closed = true; });
  openSpy = jest.spyOn(window, 'open').mockReturnValue(popup as unknown as Window);
});

afterEach(() => {
  openSpy.mockRestore();
  jest.useRealTimers();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('useOAuthPopup', () => {
  it('opens and focuses a centred popup at the OAuth URL with the web template', () => {
    const { result } = renderHook(() => useOAuthPopup(callbacks));
    let opened = false;
    act(() => { opened = result.current.open(OAUTH_URL); });

    expect(opened).toBe(true);
    expect(openSpy).toHaveBeenCalledWith(
      `${OAUTH_URL}&template=v2-web`,
      OAUTH_POPUP_NAME,
      expect.stringMatching(/width=400,height=600/),
    );
    expect(popup.focus).toHaveBeenCalled();
  });

  it('returns false when the browser blocks the popup', () => {
    openSpy.mockReturnValue(null);
    const { result } = renderHook(() => useOAuthPopup(callbacks));
    let opened = true;
    act(() => { opened = result.current.open(OAUTH_URL); });
    expect(opened).toBe(false);
  });

  it('reports the user closing the popup once', () => {
    const { result } = renderHook(() => useOAuthPopup(callbacks));
    act(() => { result.current.open(OAUTH_URL); });

    act(() => { jest.advanceTimersByTime(POPUP_CLOSED_POLL_MS); });
    expect(callbacks.onClosed).not.toHaveBeenCalled();

    popup.closed = true;
    act(() => { jest.advanceTimersByTime(POPUP_CLOSED_POLL_MS * 3); });
    expect(callbacks.onClosed).toHaveBeenCalledTimes(1);
  });

  it('does not report a close it made itself', () => {
    const { result } = renderHook(() => useOAuthPopup(callbacks));
    act(() => { result.current.open(OAUTH_URL); });
    act(() => { result.current.close(); });
    act(() => { jest.advanceTimersByTime(POPUP_CLOSED_POLL_MS * 3); });

    expect(popup.close).toHaveBeenCalled();
    expect(callbacks.onClosed).not.toHaveBeenCalled();
  });

  it('focuses the open popup', () => {
    const { result } = renderHook(() => useOAuthPopup(callbacks));
    act(() => { result.current.open(OAUTH_URL); });
    popup.focus.mockClear();
    act(() => { result.current.focus(); });
    expect(popup.focus).toHaveBeenCalledTimes(1);
  });

  it('closes the popup and reports completion', () => {
    const { result } = renderHook(() => useOAuthPopup(callbacks));
    act(() => { result.current.open(OAUTH_URL); });

    post(OAUTH_MESSAGE.COMPLETE);

    expect(popup.close).toHaveBeenCalled();
    expect(callbacks.onComplete).toHaveBeenCalledTimes(1);
    act(() => { jest.advanceTimersByTime(POPUP_CLOSED_POLL_MS * 3); });
    expect(callbacks.onClosed).not.toHaveBeenCalled();
  });

  it('reports exit to catalog and exit to support', () => {
    const { result } = renderHook(() => useOAuthPopup(callbacks));
    act(() => { result.current.open(OAUTH_URL); });

    post(OAUTH_MESSAGE.EXIT_TO_CATALOG);
    expect(callbacks.onExitToCatalog).toHaveBeenCalledTimes(1);

    post(OAUTH_MESSAGE.EXIT_TO_SUPPORT);
    expect(callbacks.onExitToSupport).toHaveBeenCalledTimes(1);
  });

  it('ignores messages from other origins, unknown types, and before opening', () => {
    const { result } = renderHook(() => useOAuthPopup(callbacks));
    post(OAUTH_MESSAGE.COMPLETE);
    expect(callbacks.onComplete).not.toHaveBeenCalled();

    act(() => { result.current.open(OAUTH_URL); });
    post(OAUTH_MESSAGE.COMPLETE, 'https://evil.example.com');
    post('unrelated-message');

    expect(callbacks.onComplete).not.toHaveBeenCalled();
    expect(popup.close).not.toHaveBeenCalled();
  });

  it('uses the latest callbacks', () => {
    const onComplete = jest.fn();
    const { result, rerender } = renderHook((props) => useOAuthPopup(props), { initialProps: callbacks });
    act(() => { result.current.open(OAUTH_URL); });
    rerender({ ...callbacks, onComplete });

    post(OAUTH_MESSAGE.COMPLETE);

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(callbacks.onComplete).not.toHaveBeenCalled();
  });

  it('closes the popup on unmount', () => {
    const { result, unmount } = renderHook(() => useOAuthPopup(callbacks));
    act(() => { result.current.open(OAUTH_URL); });
    unmount();
    expect(popup.close).toHaveBeenCalled();
  });

  it('closes a previous popup when reopening', () => {
    const { result } = renderHook(() => useOAuthPopup(callbacks));
    act(() => { result.current.open(OAUTH_URL); });
    const first = popup;
    popup = { closed: false, close: jest.fn(), focus: jest.fn() };
    openSpy.mockReturnValue(popup as unknown as Window);
    act(() => { result.current.open(OAUTH_URL); });
    expect(first.close).toHaveBeenCalled();
  });

  it('does nothing when closing or focusing without a popup', () => {
    const { result } = renderHook(() => useOAuthPopup(callbacks));
    expect(() => act(() => {
      result.current.close();
      result.current.focus();
    })).not.toThrow();
  });
});
