import { act, render, screen, waitFor } from '@testing-library/react';
import { QR_SCAN_INTERVAL, QrScanner } from '@/components/pairing/QrScanner';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockDetect = jest.fn();
const mockCreateQrDecoder = jest.fn();
let mockUnavailable: string | null = null;

jest.mock('@/lib/qrDecoder', () => ({
  ...jest.requireActual('@/lib/qrDecoder'),
  createQrDecoder: () => mockCreateQrDecoder(),
  cameraUnavailableReason: () => mockUnavailable,
}));

const mockGetUserMedia = jest.fn();
const stopTrack = jest.fn();

// ── Helpers ───────────────────────────────────────────────────────────

const onDetected = jest.fn();
const onUnavailable = jest.fn();

function fakeStream(): MediaStream {
  return { getTracks: () => [{ stop: stopTrack }, { stop: stopTrack }] } as unknown as MediaStream;
}

/** Let the camera start: getUserMedia, play and the decoder resolve. */
async function cameraStarted() {
  await waitFor(() => expect(screen.getByTestId('qr-scanner-status')).toHaveTextContent('Point the camera'));
}

async function nextScan() {
  await act(() => jest.advanceTimersByTimeAsync(QR_SCAN_INTERVAL));
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  mockUnavailable = null;
  mockGetUserMedia.mockResolvedValue(fakeStream());
  mockCreateQrDecoder.mockResolvedValue({ kind: 'native', detect: mockDetect });
  mockDetect.mockResolvedValue(null);
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia: mockGetUserMedia },
    configurable: true,
  });
  jest.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  Object.defineProperty(HTMLMediaElement.prototype, 'readyState', { value: 4, configurable: true });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  delete (HTMLMediaElement.prototype as { readyState?: number }).readyState;
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('QrScanner', () => {
  it('matches snapshot while starting', () => {
    mockGetUserMedia.mockReturnValueOnce(new Promise(() => {}));
    const { asFragment } = render(<QrScanner onDetected={onDetected} onUnavailable={onUnavailable} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('asks for the rear camera', async () => {
    render(<QrScanner onDetected={onDetected} onUnavailable={onUnavailable} />);
    await cameraStarted();
    expect(mockGetUserMedia).toHaveBeenCalledWith({ video: { facingMode: 'environment' } });
    expect(screen.getByLabelText('Camera view')).toBeInTheDocument();
  });

  it('reports a QR code it reads, once per code', async () => {
    mockDetect.mockResolvedValue('900132…');
    render(<QrScanner onDetected={onDetected} onUnavailable={onUnavailable} />);
    await cameraStarted();
    await nextScan();
    await nextScan();
    expect(onDetected).toHaveBeenCalledTimes(1);
    expect(onDetected).toHaveBeenCalledWith('900132…');
  });

  it('reports a different code after the first', async () => {
    mockDetect.mockResolvedValueOnce('first').mockResolvedValueOnce(null).mockResolvedValue('second');
    render(<QrScanner onDetected={onDetected} onUnavailable={onUnavailable} />);
    await cameraStarted();
    await nextScan();
    await nextScan();
    await nextScan();
    expect(onDetected.mock.calls).toEqual([['first'], ['second']]);
  });

  it('skips a frame the decoder cannot read', async () => {
    mockDetect.mockRejectedValueOnce(new Error('bad frame')).mockResolvedValue('code');
    render(<QrScanner onDetected={onDetected} onUnavailable={onUnavailable} />);
    await cameraStarted();
    await nextScan();
    expect(onDetected).not.toHaveBeenCalled();
    await nextScan();
    expect(onDetected).toHaveBeenCalledWith('code');
  });

  it('shows a hint from the parent', async () => {
    render(<QrScanner onDetected={onDetected} onUnavailable={onUnavailable} hint="Not a Z-Wave code" />);
    await act(() => jest.advanceTimersByTimeAsync(0));
    expect(screen.getByTestId('qr-scanner-status')).toHaveTextContent('Not a Z-Wave code');
  });

  it('stops every track and scanning on unmount', async () => {
    mockDetect.mockResolvedValue('code');
    const { unmount } = render(<QrScanner onDetected={onDetected} onUnavailable={onUnavailable} />);
    await cameraStarted();
    unmount();
    expect(stopTrack).toHaveBeenCalledTimes(2);
    expect(jest.getTimerCount()).toBe(0);
    await nextScan();
    expect(onDetected).not.toHaveBeenCalled();
  });

  it('stops a camera that starts after unmount', async () => {
    let resolveMedia: (stream: MediaStream) => void = () => {};
    mockGetUserMedia.mockReturnValueOnce(new Promise((resolve) => { resolveMedia = resolve; }));
    const { unmount } = render(<QrScanner onDetected={onDetected} onUnavailable={onUnavailable} />);
    unmount();
    await act(async () => resolveMedia(fakeStream()));
    expect(stopTrack).toHaveBeenCalledTimes(2);
    expect(mockCreateQrDecoder).not.toHaveBeenCalled();
  });

  it('reports a denied camera', async () => {
    mockGetUserMedia.mockRejectedValueOnce({ name: 'NotAllowedError' });
    render(<QrScanner onDetected={onDetected} onUnavailable={onUnavailable} />);
    await waitFor(() => expect(onUnavailable).toHaveBeenCalledWith('Camera access was denied.'));
  });

  it('reports a missing camera', async () => {
    mockGetUserMedia.mockRejectedValueOnce({ name: 'NotFoundError' });
    render(<QrScanner onDetected={onDetected} onUnavailable={onUnavailable} />);
    await waitFor(() => expect(onUnavailable).toHaveBeenCalledWith('No camera was found.'));
  });

  it('stops the camera when the decoder fails to load', async () => {
    mockCreateQrDecoder.mockRejectedValueOnce(new Error('chunk failed'));
    render(<QrScanner onDetected={onDetected} onUnavailable={onUnavailable} />);
    await waitFor(() => expect(onUnavailable).toHaveBeenCalledWith("The camera couldn't be started."));
    expect(stopTrack).toHaveBeenCalledTimes(2);
  });

  it('does not ask for the camera where it is unavailable', () => {
    mockUnavailable = 'The camera needs a secure (HTTPS) connection.';
    render(<QrScanner onDetected={onDetected} onUnavailable={onUnavailable} />);
    expect(onUnavailable).toHaveBeenCalledWith('The camera needs a secure (HTTPS) connection.');
    expect(mockGetUserMedia).not.toHaveBeenCalled();
  });
});
