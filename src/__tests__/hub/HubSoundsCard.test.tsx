import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Base, Hub, HubSounds, HubVolume } from '@arcus/core';
import { HubSoundsCard, TEST_TONE_DURATION_SEC } from '@/components/hub/HubSoundsCard';
import type { HubAdvancedAttributes } from '@/components/hub/hubAdvancedTypes';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockDispatch = jest.fn();
const mockBridgeRequest = jest.fn();

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: any[]) => mockBridgeRequest(...args) },
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

// ── Helpers ───────────────────────────────────────────────────────────

const HUB_ADDRESS = 'SERV:LWF-1234:hub';

function makeHub(overrides: Partial<HubAdvancedAttributes> = {}): HubAdvancedAttributes {
  return {
    [Base.ATTR_ADDRESS]: HUB_ADDRESS,
    [Hub.ATTR_STATE]: Hub.STATE_NORMAL,
    [HubVolume.ATTR_VOLUME]: HubVolume.VOLUME_MID,
    [HubSounds.ATTR_PLAYING]: false,
    ...overrides,
  };
}

function errorNotification(message: string) {
  return { type: 'ui/addNotification', payload: { type: 'error', message } };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockBridgeRequest.mockResolvedValue({});
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('HubSoundsCard', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<HubSoundsCard hub={makeHub()} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('rendering', () => {
    it('marks the current volume as selected', () => {
      render(<HubSoundsCard hub={makeHub()} />);
      expect(screen.getByTestId('hub-volume-mid')).toHaveAttribute('data-selected', 'true');
      expect(screen.getByTestId('hub-volume-high')).toHaveAttribute('data-selected', 'false');
      expect(screen.getByRole('radio', { name: 'Medium' })).toHaveAttribute('aria-checked', 'true');
    });

    it('shows Stop Sound only while the hub is playing', () => {
      const { rerender } = render(<HubSoundsCard hub={makeHub()} />);
      expect(screen.queryByTestId('hub-sounds-quiet')).not.toBeInTheDocument();
      rerender(<HubSoundsCard hub={makeHub({ [HubSounds.ATTR_PLAYING]: true })} />);
      expect(screen.getByTestId('hub-sounds-quiet')).toBeInTheDocument();
    });
  });

  describe('volume', () => {
    it('sets hubvol:volume on the hub', async () => {
      render(<HubSoundsCard hub={makeHub()} />);
      fireEvent.click(screen.getByTestId('hub-volume-low'));
      await waitFor(() => expect(mockBridgeRequest).toHaveBeenCalledWith(
        Base.CMD_SETATTRIBUTES, HUB_ADDRESS, { [HubVolume.ATTR_VOLUME]: HubVolume.VOLUME_LOW },
      ));
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('shows the requested level while the change is saving', async () => {
      mockBridgeRequest.mockReturnValueOnce(new Promise(() => {}));
      render(<HubSoundsCard hub={makeHub()} />);
      fireEvent.click(screen.getByTestId('hub-volume-off'));
      await waitFor(() => expect(screen.getByTestId('hub-volume-off')).toHaveAttribute('data-selected', 'true'));
      expect(screen.getByTestId('hub-volume-high')).toBeDisabled();
    });

    it('keeps showing the requested level until the hub reports it', async () => {
      const hub = makeHub();
      const { rerender } = render(<HubSoundsCard hub={hub} />);
      fireEvent.click(screen.getByTestId('hub-volume-high'));
      await act(() => mockBridgeRequest.mock.results[0].value);
      expect(screen.getByTestId('hub-volume-high')).toHaveAttribute('data-selected', 'true');
      expect(screen.getByTestId('hub-volume-high')).not.toBeDisabled();

      // Another client then turns it off: the hub's report wins.
      rerender(<HubSoundsCard hub={makeHub({ [HubVolume.ATTR_VOLUME]: HubVolume.VOLUME_OFF })} />);
      expect(screen.getByTestId('hub-volume-off')).toHaveAttribute('data-selected', 'true');
    });

    it('reverts and shows an error when the change fails', async () => {
      mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
      render(<HubSoundsCard hub={makeHub()} />);
      fireEvent.click(screen.getByTestId('hub-volume-low'));
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(errorNotification('Failed to change hub volume')));
      expect(screen.getByTestId('hub-volume-mid')).toHaveAttribute('data-selected', 'true');
    });

    it('does nothing when the selected level is clicked', () => {
      render(<HubSoundsCard hub={makeHub()} />);
      fireEvent.click(screen.getByTestId('hub-volume-mid'));
      expect(mockBridgeRequest).not.toHaveBeenCalled();
    });
  });

  describe('test sound', () => {
    it('plays a tone on the hub', async () => {
      render(<HubSoundsCard hub={makeHub()} />);
      fireEvent.click(screen.getByTestId('hub-sounds-test'));
      await waitFor(() => expect(mockBridgeRequest).toHaveBeenCalledWith(
        HubSounds.CMD_PLAYTONE, HUB_ADDRESS, { tone: HubSounds.TONE_SUCCESS_SINGLE, durationSec: TEST_TONE_DURATION_SEC },
      ));
    });

    it('shows an error when the tone fails', async () => {
      mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
      render(<HubSoundsCard hub={makeHub()} />);
      fireEvent.click(screen.getByTestId('hub-sounds-test'));
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(errorNotification('Failed to play a sound on the hub')));
      expect(screen.getByTestId('hub-sounds-test')).not.toBeDisabled();
    });

    it('stops a playing sound', async () => {
      render(<HubSoundsCard hub={makeHub({ [HubSounds.ATTR_PLAYING]: true })} />);
      fireEvent.click(screen.getByTestId('hub-sounds-quiet'));
      await waitFor(() => expect(mockBridgeRequest).toHaveBeenCalledWith(HubSounds.CMD_QUIET, HUB_ADDRESS, {}));
    });

    it('shows an error when stopping fails', async () => {
      mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
      render(<HubSoundsCard hub={makeHub({ [HubSounds.ATTR_PLAYING]: true })} />);
      fireEvent.click(screen.getByTestId('hub-sounds-quiet'));
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(errorNotification('Failed to stop the hub sound')));
    });
  });

  describe('edge cases', () => {
    it('disables the controls while the hub is offline', () => {
      render(<HubSoundsCard hub={makeHub({ [Hub.ATTR_STATE]: Hub.STATE_DOWN })} />);
      expect(screen.getByTestId('hub-sounds-offline')).toBeInTheDocument();
      expect(screen.getByTestId('hub-volume-low')).toBeDisabled();
      expect(screen.getByTestId('hub-sounds-test')).toBeDisabled();
    });

    it('explains when the hub reports no volume', () => {
      render(<HubSoundsCard hub={makeHub({ [HubVolume.ATTR_VOLUME]: undefined })} />);
      expect(screen.getByTestId('hub-sounds-unsupported')).toBeInTheDocument();
      expect(screen.queryByTestId('hub-sounds-test')).not.toBeInTheDocument();
    });
  });
});
