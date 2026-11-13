import { useEffect } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Base, PairingSubsystem } from '@arcus/core';
import { S2PinPrompt } from '@/components/pairing/S2PinPrompt';
import type { SubsystemEntity } from '@/store/entityTypes';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockDispatch = jest.fn();
const mockBridgeRequest = jest.fn();
let mockSubsystems: Record<string, SubsystemEntity> = {};
let mockCameraBlocked: string | null = null;

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: any[]) => mockBridgeRequest(...args) },
}));

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) => sel({ subsystems: { entities: mockSubsystems, ids: Object.keys(mockSubsystems) } }),
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

jest.mock('@/lib/qrDecoder', () => ({
  cameraUnavailableReason: () => mockCameraBlocked,
}));

interface ScannerProps {
  onDetected: (text: string) => void;
  onUnavailable: (message: string) => void;
  hint?: string | null;
}
let scannerProps: ScannerProps | null = null;
const mockScannerUnmount = jest.fn();

jest.mock('@/components/pairing/QrScanner', () => ({
  QrScanner: (props: ScannerProps) => {
    scannerProps = props;
    useEffect(() => () => mockScannerUnmount(), []);
    return <div data-testid="qr-scanner-mock">{props.hint}</div>;
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────

const SUB = 'SERV:subpairing:place-1';
const REQUEST_ID = 'req-1';
const HUB_DSK = '00000-35455-41424-34445-31323-33435-21222-32425';
const NOW = new Date('2026-01-01T00:00:00Z').getTime();
const EXPIRES = NOW + 195_000;
// Acme Light Dimmer example from the Z-Wave QR spec: PIN 51525, groups 2–8 match HUB_DSK.
const ACME_QR = '900132782003515253545541424344453132333435212223242500100435301537022065520001000000300578';

function setRequestId(requestId: string | undefined) {
  mockSubsystems = {
    [SUB]: {
      id: SUB,
      [Base.ATTR_ADDRESS]: SUB,
      ...(requestId === undefined ? {} : { [PairingSubsystem.ATTR_S2PINREQUESTID]: requestId }),
    },
  };
}

/** Route Bridge requests by command; anything not listed resolves `{}`. */
function mockPlatform(responses: Partial<Record<string, () => Promise<object>>> = {}) {
  mockBridgeRequest.mockImplementation((command: string) => {
    const respond = responses[command];
    if (respond) return respond();
    if (command === PairingSubsystem.CMD_GETS2PINREQUEST) {
      return Promise.resolve({ requestId: REQUEST_ID, dsk: HUB_DSK, expires: EXPIRES });
    }
    return Promise.resolve({});
  });
}

function callsOf(command: string) {
  return mockBridgeRequest.mock.calls.filter(([c]) => c === command);
}

function notifications() {
  return mockDispatch.mock.calls.map(([action]) => action).filter((a) => a.type === 'ui/addNotification');
}

async function renderOpen() {
  setRequestId(REQUEST_ID);
  const view = render(<S2PinPrompt pairingSubsystem={SUB} />);
  await waitFor(() => expect(screen.getByTestId('s2-pin-prompt')).toHaveAttribute('data-phase', 'entry'));
  return view;
}

function rerenderWith(view: ReturnType<typeof render>, requestId: string | undefined) {
  setRequestId(requestId);
  view.rerender(<S2PinPrompt pairingSubsystem={SUB} />);
}

function typePin(pin: string) {
  fireEvent.change(screen.getByTestId('s2-pin-input'), { target: { value: pin } });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
  mockCameraBlocked = null;
  scannerProps = null;
  setRequestId(undefined);
  mockPlatform();
});

afterEach(() => {
  jest.useRealTimers();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('S2PinPrompt – opening', () => {
  it('renders nothing before any request', () => {
    const { container } = render(<S2PinPrompt pairingSubsystem={SUB} />);
    expect(container).toBeEmptyDOMElement();
    expect(mockBridgeRequest).not.toHaveBeenCalled();
  });

  it('renders nothing for an empty request ID', () => {
    setRequestId('');
    const { container } = render(<S2PinPrompt pairingSubsystem={SUB} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('matches snapshot while loading the DSK', () => {
    mockPlatform({ [PairingSubsystem.CMD_GETS2PINREQUEST]: () => new Promise(() => {}) });
    setRequestId(REQUEST_ID);
    const { asFragment } = render(<S2PinPrompt pairingSubsystem={SUB} />);
    expect(screen.getByTestId('s2-pin-loading')).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
  });

  it('reads the request from the pairing subsystem', async () => {
    await renderOpen();
    expect(mockBridgeRequest).toHaveBeenCalledWith(PairingSubsystem.CMD_GETS2PINREQUEST, SUB, {});
  });

  it('matches snapshot when asking for the PIN', async () => {
    const { asFragment } = await renderOpen();
    expect(asFragment()).toMatchSnapshot();
  });

  it('shows DSK groups 2–8 and the time left', async () => {
    await renderOpen();
    expect(screen.getByRole('dialog', { name: 'Secure this Z-Wave device' })).toBeInTheDocument();
    expect(screen.getByTestId('s2-dsk-group-2')).toHaveTextContent('35455');
    expect(screen.getByTestId('s2-dsk-group-8')).toHaveTextContent('32425');
    expect(screen.getByTestId('s2-pin-countdown')).toHaveTextContent('3:15');
  });

  it('counts down to expires', async () => {
    await renderOpen();
    act(() => { jest.advanceTimersByTime(10_000); });
    expect(screen.getByTestId('s2-pin-countdown')).toHaveTextContent('3:05');
  });

  it('reports a failure to read the request and stays closed', async () => {
    mockPlatform({ [PairingSubsystem.CMD_GETS2PINREQUEST]: () => Promise.reject(new Error('offline')) });
    setRequestId(REQUEST_ID);
    render(<S2PinPrompt pairingSubsystem={SUB} />);
    await waitFor(() => expect(notifications()).toEqual([
      { type: 'ui/addNotification', payload: { type: 'error', message: "Couldn't load the device's security key for S2 pairing." } },
    ]));
    expect(screen.queryByTestId('s2-pin-prompt')).not.toBeInTheDocument();
  });

  it('closes quietly when the request has already ended', async () => {
    mockPlatform({
      [PairingSubsystem.CMD_GETS2PINREQUEST]: () => Promise.reject({ code: 'request.state.invalid' }),
    });
    setRequestId(REQUEST_ID);
    render(<S2PinPrompt pairingSubsystem={SUB} />);
    await waitFor(() => expect(screen.queryByTestId('s2-pin-prompt')).not.toBeInTheDocument());
    expect(notifications()).toEqual([]);
  });

  it('refuses a malformed DSK', async () => {
    mockPlatform({
      [PairingSubsystem.CMD_GETS2PINREQUEST]: () => Promise.resolve({ requestId: REQUEST_ID, dsk: 'garbage', expires: EXPIRES }),
    });
    setRequestId(REQUEST_ID);
    render(<S2PinPrompt pairingSubsystem={SUB} />);
    await waitFor(() => expect(notifications()).toHaveLength(1));
    expect(screen.queryByTestId('s2-pin-prompt')).not.toBeInTheDocument();
  });

  it('ignores a response for a different request', async () => {
    mockPlatform({
      [PairingSubsystem.CMD_GETS2PINREQUEST]: () => Promise.resolve({ requestId: 'req-2', dsk: HUB_DSK, expires: EXPIRES }),
    });
    setRequestId(REQUEST_ID);
    render(<S2PinPrompt pairingSubsystem={SUB} />);
    await act(() => mockBridgeRequest.mock.results[0].value);
    expect(screen.getByTestId('s2-pin-prompt')).toHaveAttribute('data-phase', 'loading');
  });

  it('switches to a new request that replaces the open one', async () => {
    const view = await renderOpen();
    typePin('123');
    mockPlatform({
      [PairingSubsystem.CMD_GETS2PINREQUEST]: () => Promise.resolve({ requestId: 'req-2', dsk: HUB_DSK, expires: EXPIRES }),
    });
    rerenderWith(view, 'req-2');
    await waitFor(() => expect(screen.getByTestId('s2-pin-prompt')).toHaveAttribute('data-phase', 'entry'));
    expect(callsOf(PairingSubsystem.CMD_GETS2PINREQUEST)).toHaveLength(2);
    expect(screen.getByTestId('s2-pin-input')).toHaveValue('');
  });
});

describe('S2PinPrompt – typing the PIN', () => {
  it('sends the PIN once and closes', async () => {
    const view = await renderOpen();
    typePin('51525');
    fireEvent.click(screen.getByTestId('s2-pin-submit'));
    await waitFor(() => expect(screen.queryByTestId('s2-pin-prompt')).not.toBeInTheDocument());
    expect(callsOf(PairingSubsystem.CMD_SUBMITS2PIN)).toEqual([
      [PairingSubsystem.CMD_SUBMITS2PIN, SUB, { requestId: REQUEST_ID, pin: '51525' }],
    ]);
    expect(notifications()[0].payload.type).toBe('success');

    // The ID clears a moment later; the same ID must not reopen the prompt meanwhile.
    rerenderWith(view, REQUEST_ID);
    expect(screen.queryByTestId('s2-pin-prompt')).not.toBeInTheDocument();
    expect(callsOf(PairingSubsystem.CMD_GETS2PINREQUEST)).toHaveLength(1);
  });

  it('stays open while the PIN is in flight, even after the ID clears', async () => {
    mockPlatform({ [PairingSubsystem.CMD_SUBMITS2PIN]: () => new Promise(() => {}) });
    const view = await renderOpen();
    typePin('51525');
    fireEvent.click(screen.getByTestId('s2-pin-submit'));
    expect(await screen.findByTestId('s2-pin-submitting')).toBeInTheDocument();
    rerenderWith(view, '');
    expect(screen.getByTestId('s2-pin-submitting')).toBeInTheDocument();
    expect(screen.queryByTestId('s2-pin-countdown')).not.toBeInTheDocument();
  });

  it('checks the PIN range before sending', async () => {
    await renderOpen();
    typePin('65536');
    fireEvent.click(screen.getByTestId('s2-pin-submit'));
    expect(screen.getByTestId('s2-pin-error')).toHaveTextContent('from 00000 to 65535');
    expect(callsOf(PairingSubsystem.CMD_SUBMITS2PIN)).toHaveLength(0);
  });

  it('clears the error as the user edits the PIN', async () => {
    await renderOpen();
    typePin('99999');
    fireEvent.click(screen.getByTestId('s2-pin-submit'));
    typePin('1234');
    expect(screen.queryByTestId('s2-pin-error')).not.toBeInTheDocument();
  });

  it('lets the user correct a PIN the platform calls malformed', async () => {
    mockBridgeRequest.mockImplementationOnce(() => Promise.resolve({ requestId: REQUEST_ID, dsk: HUB_DSK, expires: EXPIRES }));
    mockBridgeRequest.mockImplementationOnce(() => Promise.reject({ code: 'request.param.invalid' }));
    await renderOpen();
    typePin('00001');
    fireEvent.click(screen.getByTestId('s2-pin-submit'));
    expect(await screen.findByTestId('s2-pin-error')).toHaveTextContent("didn't accept that PIN");

    typePin('51525');
    fireEvent.click(screen.getByTestId('s2-pin-submit'));
    await waitFor(() => expect(screen.queryByTestId('s2-pin-prompt')).not.toBeInTheDocument());
    expect(callsOf(PairingSubsystem.CMD_SUBMITS2PIN).map(([, , attrs]) => attrs.pin)).toEqual(['00001', '51525']);
  });

  it('treats a hub error as the spent attempt', async () => {
    mockPlatform({ [PairingSubsystem.CMD_SUBMITS2PIN]: () => Promise.reject({ code: 'hub.offline' }) });
    const view = await renderOpen();
    typePin('51525');
    fireEvent.click(screen.getByTestId('s2-pin-submit'));
    expect(await screen.findByTestId('s2-pin-spent')).toHaveTextContent("The hub didn't take the PIN.");
    expect(notifications()).toEqual([
      { type: 'ui/addNotification', payload: { type: 'error', message: 'Failed to send the S2 PIN.' } },
    ]);

    // Still shown after the ID clears, until the user closes it.
    rerenderWith(view, '');
    expect(screen.getByTestId('s2-pin-spent')).toBeInTheDocument();
    expect(screen.queryByTestId('s2-pin-input')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('s2-pin-close'));
    expect(screen.queryByTestId('s2-pin-prompt')).not.toBeInTheDocument();
    expect(callsOf(PairingSubsystem.CMD_SUBMITS2PIN)).toHaveLength(1);
  });

  it('matches snapshot when the attempt is spent', async () => {
    mockPlatform({ [PairingSubsystem.CMD_SUBMITS2PIN]: () => Promise.reject({ code: 'hub.offline' }) });
    const { asFragment } = await renderOpen();
    typePin('51525');
    fireEvent.click(screen.getByTestId('s2-pin-submit'));
    await screen.findByTestId('s2-pin-spent');
    expect(asFragment()).toMatchSnapshot();
  });

  it('explains a request that ended before the PIN arrived', async () => {
    mockPlatform({ [PairingSubsystem.CMD_SUBMITS2PIN]: () => Promise.reject({ code: 'request.state.invalid' }) });
    await renderOpen();
    typePin('51525');
    fireEvent.click(screen.getByTestId('s2-pin-submit'));
    expect(await screen.findByTestId('s2-pin-spent')).toHaveTextContent('had already ended');
  });
});

describe('S2PinPrompt – declining', () => {
  it('asks before declining, then cancels the request', async () => {
    await renderOpen();
    fireEvent.click(screen.getByTestId('s2-pin-decline'));
    expect(screen.getByTestId('s2-pin-confirm-decline')).toHaveTextContent('Decline secure pairing?');
    expect(callsOf(PairingSubsystem.CMD_CANCELS2PIN)).toHaveLength(0);

    fireEvent.click(screen.getByTestId('s2-pin-decline-confirm'));
    await waitFor(() => expect(screen.queryByTestId('s2-pin-prompt')).not.toBeInTheDocument());
    expect(callsOf(PairingSubsystem.CMD_CANCELS2PIN)).toEqual([
      [PairingSubsystem.CMD_CANCELS2PIN, SUB, { requestId: REQUEST_ID }],
    ]);
    expect(notifications()[0].payload.type).toBe('info');
    expect(callsOf(PairingSubsystem.CMD_SUBMITS2PIN)).toHaveLength(0);
  });

  it('goes back from the decline question', async () => {
    await renderOpen();
    fireEvent.click(screen.getByTestId('s2-pin-decline'));
    fireEvent.click(screen.getByTestId('s2-pin-decline-back'));
    expect(screen.getByTestId('s2-pin-input')).toBeInTheDocument();
  });

  it('reports a failed decline and lets the user answer again', async () => {
    mockPlatform({ [PairingSubsystem.CMD_CANCELS2PIN]: () => Promise.reject(new Error('timeout')) });
    await renderOpen();
    fireEvent.click(screen.getByTestId('s2-pin-decline'));
    fireEvent.click(screen.getByTestId('s2-pin-decline-confirm'));
    expect(await screen.findByTestId('s2-pin-input')).toBeInTheDocument();
    expect(notifications()).toEqual([
      { type: 'ui/addNotification', payload: { type: 'error', message: 'Failed to decline the S2 PIN request.' } },
    ]);
  });

  it('closes quietly if the request had already ended', async () => {
    mockPlatform({ [PairingSubsystem.CMD_CANCELS2PIN]: () => Promise.reject({ code: 'request.state.invalid' }) });
    await renderOpen();
    fireEvent.click(screen.getByTestId('s2-pin-decline'));
    fireEvent.click(screen.getByTestId('s2-pin-decline-confirm'));
    await waitFor(() => expect(screen.queryByTestId('s2-pin-prompt')).not.toBeInTheDocument());
    expect(notifications()).toEqual([]);
  });
});

describe('S2PinPrompt – ending', () => {
  it('closes when the request ID goes empty', async () => {
    const view = await renderOpen();
    rerenderWith(view, '');
    expect(screen.queryByTestId('s2-pin-prompt')).not.toBeInTheDocument();
  });

  it('shows the time is up at expires and stops scanning', async () => {
    await renderOpen();
    fireEvent.click(screen.getByTestId('s2-pin-scan'));
    expect(screen.getByTestId('qr-scanner-mock')).toBeInTheDocument();
    act(() => { jest.advanceTimersByTime(196_000); });
    expect(screen.getByTestId('s2-pin-prompt')).toHaveAttribute('data-phase', 'expired');
    expect(screen.getByTestId('s2-pin-expired')).toHaveTextContent("Time's up");
    expect(screen.queryByTestId('qr-scanner-mock')).not.toBeInTheDocument();
    expect(mockScannerUnmount).toHaveBeenCalled();
    expect(screen.queryByTestId('s2-pin-input')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('s2-pin-close'));
    expect(screen.queryByTestId('s2-pin-prompt')).not.toBeInTheDocument();
  });

  it('stops scanning when the request ends', async () => {
    const view = await renderOpen();
    fireEvent.click(screen.getByTestId('s2-pin-scan'));
    rerenderWith(view, '');
    expect(mockScannerUnmount).toHaveBeenCalled();
  });

  it('stops scanning on unmount', async () => {
    const view = await renderOpen();
    fireEvent.click(screen.getByTestId('s2-pin-scan'));
    view.unmount();
    expect(mockScannerUnmount).toHaveBeenCalled();
  });
});

describe('S2PinPrompt – QR code', () => {
  async function scan(text: string) {
    fireEvent.click(screen.getByTestId('s2-pin-scan'));
    act(() => scannerProps!.onDetected(text));
  }

  it('matches snapshot while scanning', async () => {
    const { asFragment } = await renderOpen();
    fireEvent.click(screen.getByTestId('s2-pin-scan'));
    expect(asFragment()).toMatchSnapshot();
  });

  it('sends group 1 after the user confirms a matching code', async () => {
    await renderOpen();
    await scan(ACME_QR);
    expect(screen.getByTestId('s2-qr-match')).toBeInTheDocument();
    expect(screen.getByTestId('s2-qr-pin')).toHaveTextContent('51525');
    expect(screen.queryByTestId('qr-scanner-mock')).not.toBeInTheDocument();
    expect(callsOf(PairingSubsystem.CMD_SUBMITS2PIN)).toHaveLength(0);

    fireEvent.click(screen.getByTestId('s2-qr-submit'));
    await waitFor(() => expect(screen.queryByTestId('s2-pin-prompt')).not.toBeInTheDocument());
    expect(callsOf(PairingSubsystem.CMD_SUBMITS2PIN)).toEqual([
      [PairingSubsystem.CMD_SUBMITS2PIN, SUB, { requestId: REQUEST_ID, pin: '51525' }],
    ]);
  });

  it('warns about a code for another device and offers to decline', async () => {
    mockPlatform({
      [PairingSubsystem.CMD_GETS2PINREQUEST]: () => Promise.resolve({
        requestId: REQUEST_ID,
        dsk: '00000-11111-41424-34445-31323-33435-21222-32425',
        expires: EXPIRES,
      }),
    });
    await renderOpen();
    await scan(ACME_QR);
    expect(screen.getByTestId('s2-qr-mismatch')).toHaveTextContent("doesn't match");
    fireEvent.click(screen.getByTestId('s2-qr-decline'));
    await waitFor(() => expect(callsOf(PairingSubsystem.CMD_CANCELS2PIN)).toHaveLength(1));
    expect(callsOf(PairingSubsystem.CMD_SUBMITS2PIN)).toHaveLength(0);
  });

  it('can scan again or go back to typing from a mismatch', async () => {
    mockPlatform({
      [PairingSubsystem.CMD_GETS2PINREQUEST]: () => Promise.resolve({
        requestId: REQUEST_ID,
        dsk: '00000-11111-41424-34445-31323-33435-21222-32425',
        expires: EXPIRES,
      }),
    });
    await renderOpen();
    await scan(ACME_QR);
    fireEvent.click(screen.getByTestId('s2-qr-scan-again'));
    expect(screen.getByTestId('qr-scanner-mock')).toBeInTheDocument();
    act(() => scannerProps!.onDetected(ACME_QR));
    fireEvent.click(screen.getByTestId('s2-qr-manual'));
    expect(screen.getByTestId('s2-pin-input')).toBeInTheDocument();
  });

  it('keeps scanning past a QR code that is not a Z-Wave code', async () => {
    await renderOpen();
    await scan('https://example.com');
    expect(screen.getByTestId('qr-scanner-mock')).toHaveTextContent("That isn't a Z-Wave QR code");
  });

  it('falls back to typing when the camera is unavailable', async () => {
    await renderOpen();
    fireEvent.click(screen.getByTestId('s2-pin-scan'));
    act(() => scannerProps!.onUnavailable('Camera access was denied.'));
    expect(screen.getByTestId('s2-pin-notice')).toHaveTextContent('Camera access was denied. Type the PIN from the label instead.');
    expect(screen.getByTestId('s2-pin-input')).toBeInTheDocument();
  });

  it('lets the user leave the scanner to type', async () => {
    await renderOpen();
    fireEvent.click(screen.getByTestId('s2-pin-scan'));
    fireEvent.click(screen.getByTestId('s2-pin-scan-cancel'));
    expect(screen.getByTestId('s2-pin-input')).toBeInTheDocument();
    expect(mockScannerUnmount).toHaveBeenCalled();
  });

  it('hides scanning on an insecure origin', async () => {
    mockCameraBlocked = 'The camera needs a secure (HTTPS) connection.';
    await renderOpen();
    expect(screen.queryByTestId('s2-pin-scan')).not.toBeInTheDocument();
    expect(screen.getByTestId('s2-pin-scan-unavailable')).toHaveTextContent('secure (HTTPS)');
  });
});
