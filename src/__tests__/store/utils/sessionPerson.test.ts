import { Base, Person } from '@arcus/core';
import Bridge from '@arcus/core/bridge';
import { fetchSessionPerson, withSessionPerson } from '@/store/utils/sessionPerson';
import type { SessionCreatedEvent } from '@/arcus/types';
import type { PersonData } from '@/store/entityTypes';

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: jest.fn() },
}));

const mockRequest = Bridge.request as jest.Mock;

const SESSION = { personId: 'p1', places: [] } as unknown as SessionCreatedEvent;
const PERSON = {
  [Base.ATTR_ADDRESS]: 'SERV:person:p1',
  [Person.ATTR_FIRSTNAME]: 'Alex',
  [Person.ATTR_EMAIL]: 'alex@example.com',
} as PersonData;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('fetchSessionPerson', () => {
  it('reads the person\'s attributes', async () => {
    mockRequest.mockResolvedValue(PERSON);
    await expect(fetchSessionPerson('p1')).resolves.toEqual(PERSON);
    expect(mockRequest).toHaveBeenCalledWith(Base.CMD_GETATTRIBUTES, 'SERV:person:p1', {});
  });

  it('resolves to null instead of rejecting when the request fails', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockRequest.mockRejectedValue(new Error('not yet'));
    await expect(fetchSessionPerson('p1')).resolves.toBeNull();
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});

describe('withSessionPerson', () => {
  it('merges the person over the session payload', () => {
    expect(withSessionPerson(SESSION, PERSON)).toEqual({ ...SESSION, ...PERSON });
  });

  it('keeps the session payload when there is no person', () => {
    expect(withSessionPerson(SESSION, null)).toBe(SESSION);
    expect(withSessionPerson(SESSION, undefined)).toBe(SESSION);
  });
});
