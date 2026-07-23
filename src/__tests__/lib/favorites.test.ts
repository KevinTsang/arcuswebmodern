import { Base } from '@arcus/core';
import type { ArcusEntity } from '@/store/entityTypes';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockBridgeRequest = jest.fn();

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: unknown[]) => mockBridgeRequest(...args) },
}));

import { isFavorite, setFavorite, FAVORITE_TAG } from '@/lib/favorites';

function entity(tags?: unknown): ArcusEntity {
  return { id: 'a', [Base.ATTR_ADDRESS]: 'DRIV:dev:a', [Base.ATTR_TAGS]: tags } as ArcusEntity;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockBridgeRequest.mockResolvedValue({});
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('isFavorite', () => {
  it('is true when base:tags contains FAVORITE', () => {
    expect(isFavorite(entity(['SOME_TAG', FAVORITE_TAG]))).toBe(true);
  });

  it('is false when base:tags lacks FAVORITE', () => {
    expect(isFavorite(entity(['SOME_TAG']))).toBe(false);
  });

  it('is false when base:tags is missing', () => {
    expect(isFavorite(entity(undefined))).toBe(false);
  });

  it('is false when base:tags is not an array', () => {
    expect(isFavorite(entity('FAVORITE'))).toBe(false);
  });
});

describe('setFavorite', () => {
  it('adds the FAVORITE tag via base:AddTags when favoriting', async () => {
    await setFavorite('DRIV:dev:a', true);
    expect(mockBridgeRequest).toHaveBeenCalledWith(
      Base.CMD_ADDTAGS,
      'DRIV:dev:a',
      { tags: [FAVORITE_TAG] },
    );
  });

  it('removes the FAVORITE tag via base:RemoveTags when unfavoriting', async () => {
    await setFavorite('DRIV:dev:a', false);
    expect(mockBridgeRequest).toHaveBeenCalledWith(
      Base.CMD_REMOVETAGS,
      'DRIV:dev:a',
      { tags: [FAVORITE_TAG] },
    );
  });

  it('propagates Bridge failures to the caller', async () => {
    mockBridgeRequest.mockRejectedValueOnce(new Error('boom'));
    await expect(setFavorite('DRIV:dev:a', true)).rejects.toThrow('boom');
  });
});
