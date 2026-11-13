import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Base } from '@arcus/core';
import { FavoriteToggle } from '@/components/shared/FavoriteToggle';
import { FAVORITE_TAG } from '@/lib/favorites';
import type { ArcusEntity } from '@/store/entityTypes';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockDispatch = jest.fn();
const mockBridgeRequest = jest.fn();

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: unknown[]) => mockBridgeRequest(...args) },
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

// ── Helpers ───────────────────────────────────────────────────────────

const ADDRESS = 'SERV:scene:s1';

function entity(tags?: string[]): ArcusEntity {
  return { id: ADDRESS, [Base.ATTR_ADDRESS]: ADDRESS, [Base.ATTR_TAGS]: tags };
}

function renderToggle(tags?: string[]) {
  return render(<FavoriteToggle entity={entity(tags)} name="Good Morning" testId="fav" />);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockBridgeRequest.mockResolvedValue({});
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('FavoriteToggle', () => {
  it('matches snapshot when not a favorite', () => {
    const { asFragment } = renderToggle();
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches snapshot when a favorite', () => {
    const { asFragment } = renderToggle([FAVORITE_TAG]);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('rendering', () => {
    it('shows an unpressed "add" button when the FAVORITE tag is absent', () => {
      renderToggle(['OTHER']);
      const button = screen.getByRole('button', { name: 'Add Good Morning to favorites' });
      expect(button).toHaveAttribute('aria-pressed', 'false');
      expect(button).toHaveAttribute('data-favorite', 'false');
      expect(button).toHaveAttribute('title', 'Add to favorites');
    });

    it('shows a pressed "remove" button when tagged FAVORITE', () => {
      renderToggle([FAVORITE_TAG]);
      const button = screen.getByRole('button', { name: 'Remove Good Morning from favorites' });
      expect(button).toHaveAttribute('aria-pressed', 'true');
      expect(button).toHaveAttribute('data-favorite', 'true');
      expect(button).toHaveAttribute('title', 'Remove from favorites');
    });

    it('treats missing tags as not a favorite', () => {
      renderToggle(undefined);
      expect(screen.getByTestId('fav')).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('interaction', () => {
    it('adds the FAVORITE tag when not a favorite', async () => {
      renderToggle();
      fireEvent.click(screen.getByTestId('fav'));
      await waitFor(() => {
        expect(mockBridgeRequest).toHaveBeenCalledWith(Base.CMD_ADDTAGS, ADDRESS, { tags: [FAVORITE_TAG] });
      });
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('removes the FAVORITE tag when already a favorite', async () => {
      renderToggle([FAVORITE_TAG]);
      fireEvent.click(screen.getByTestId('fav'));
      await waitFor(() => {
        expect(mockBridgeRequest).toHaveBeenCalledWith(Base.CMD_REMOVETAGS, ADDRESS, { tags: [FAVORITE_TAG] });
      });
    });

    it('dispatches an error when adding fails and re-enables the button', async () => {
      mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
      renderToggle();
      fireEvent.click(screen.getByTestId('fav'));
      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'ui/addNotification',
          payload: { type: 'error', message: 'Failed to add Good Morning to favorites' },
        });
      });
      expect(screen.getByTestId('fav')).not.toBeDisabled();
    });

    it('dispatches an error when removing fails', async () => {
      mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
      renderToggle([FAVORITE_TAG]);
      fireEvent.click(screen.getByTestId('fav'));
      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'ui/addNotification',
          payload: { type: 'error', message: 'Failed to remove Good Morning from favorites' },
        });
      });
    });

    it('disables the button while the request is in flight', async () => {
      let resolve: (value: object) => void = () => {};
      mockBridgeRequest.mockReturnValueOnce(new Promise((r) => { resolve = r; }));
      renderToggle();
      fireEvent.click(screen.getByTestId('fav'));
      expect(screen.getByTestId('fav')).toBeDisabled();
      fireEvent.click(screen.getByTestId('fav'));
      expect(mockBridgeRequest).toHaveBeenCalledTimes(1);
      resolve({});
      await waitFor(() => expect(screen.getByTestId('fav')).not.toBeDisabled());
    });
  });
});
