/**
 * Tests for logoutThunk.
 */

import { logout } from '@/store/slices/authSlice';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockLogout = jest.fn();

jest.mock('@arcus/core/auth', () => ({
  __esModule: true,
  default: { logout: (...args: any[]) => mockLogout(...args) },
}));

const dispatched: any[] = [];
const dispatch = Object.assign(
  (action: any) => {
    dispatched.push(typeof action === 'function' ? action : { ...action });
    return action;
  },
  { getState: () => ({}), extra: undefined, requestId: 'test', signal: new AbortController().signal, abort: jest.fn(), condition: jest.fn() },
);

// ── Tests ─────────────────────────────────────────────────────────────

let logoutThunk: typeof import('@/store/thunks/logoutThunk').logoutThunk;

beforeAll(async () => {
  logoutThunk = (await import('@/store/thunks/logoutThunk')).logoutThunk;
});

beforeEach(() => {
  jest.clearAllMocks();
  dispatched.length = 0;
  mockLogout.mockResolvedValue(undefined);
});

describe('logoutThunk', () => {
  it('calls auth.logout()', async () => {
    await logoutThunk()(dispatch, () => ({}), undefined);

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('dispatches logout action', async () => {
    await logoutThunk()(dispatch, () => ({}), undefined);

    expect(dispatched).toContainEqual(logout());
  });

  it('dispatches logout even when auth.logout() rejects', async () => {
    mockLogout.mockRejectedValue(new Error('Network error'));

    await logoutThunk()(dispatch, () => ({}), undefined);

    expect(dispatched).toContainEqual(logout());
  });
});
