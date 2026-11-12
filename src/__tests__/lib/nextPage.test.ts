import { saveNextPage, takeNextPage } from '@/lib/nextPage';

beforeEach(() => {
  sessionStorage.clear();
  jest.restoreAllMocks();
});

describe('nextPage', () => {
  it('returns the saved page and forgets it', () => {
    saveNextPage('/devices?device=DRIV:dev:1');
    expect(takeNextPage()).toBe('/devices?device=DRIV:dev:1');
    expect(takeNextPage()).toBe('/');
  });

  it('returns the home page when nothing was saved', () => {
    expect(takeNextPage()).toBe('/');
  });

  it('keeps only the most recent page', () => {
    saveNextPage('/scenes');
    saveNextPage('/rules');
    expect(takeNextPage()).toBe('/rules');
  });

  it('ignores storage errors when saving', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => saveNextPage('/scenes')).not.toThrow();
  });

  it('falls back to the home page when storage throws', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(takeNextPage()).toBe('/');
  });
});
