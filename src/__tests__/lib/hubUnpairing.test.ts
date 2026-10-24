import { Hub } from '@arcus/core';
import { stopHubUnpairing, UnpairingAction } from '@/lib/hubUnpairing';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockBridgeRequest = jest.fn();

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: unknown[]) => mockBridgeRequest(...args) },
}));

const HUB = 'SERV:hub-1:hub';

beforeEach(() => {
  jest.clearAllMocks();
  mockBridgeRequest.mockResolvedValue({});
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('stopHubUnpairing', () => {
  it('sends hub:UnpairingRequest STOP_UNPAIRING to the hub', async () => {
    await stopHubUnpairing(HUB);
    expect(mockBridgeRequest).toHaveBeenCalledWith(Hub.CMD_UNPAIRINGREQUEST, HUB, {
      actionType: UnpairingAction.STOP,
    });
    expect(UnpairingAction.STOP).toBe('STOP_UNPAIRING');
  });

  it('rejects when the request fails', async () => {
    mockBridgeRequest.mockRejectedValue(new Error('offline'));
    await expect(stopHubUnpairing(HUB)).rejects.toThrow('offline');
  });
});
