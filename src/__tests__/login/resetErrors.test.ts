import { resetErrorMessage } from '@/components/login/resetErrors';

describe('resetErrorMessage', () => {
  it.each([
    ['person.reset.token_failed', 'That code is invalid or has expired. Check the code, or request a new one.'],
    ['person.not_found', 'We couldn’t find an account with that email address.'],
    ['person.reset.failed', 'Your password could not be reset. Please try again.'],
  ])('maps %s to a readable message', (code, message) => {
    expect(resetErrorMessage({ code, message: 'raw platform text' })).toBe(message);
  });

  it('falls back to a generic message for unknown codes, plain errors and missing errors', () => {
    const generic = 'An error occurred. Please try again.';
    expect(resetErrorMessage({ code: 'request.param.invalid', message: 'New password is too long.' })).toBe(generic);
    expect(resetErrorMessage(new Error('Request failed: 500 Internal Server Error'))).toBe(generic);
    expect(resetErrorMessage(undefined)).toBe(generic);
    expect(resetErrorMessage(null)).toBe(generic);
  });
});
