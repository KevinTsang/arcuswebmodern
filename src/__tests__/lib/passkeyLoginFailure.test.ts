import { SocketOpenError } from '@arcus/core/auth';
import { PasskeyRequestError } from '@arcus/core/passkey';
import {
  classifyPasskeyLoginError,
  isPasskeyLoginFailure,
  passkeyLoginErrorMessage,
} from '@/lib/passkeyLoginFailure';

// ── Tests ─────────────────────────────────────────────────────────────

describe('classifyPasskeyLoginError', () => {
  it.each([
    ['AbortError', 'cancelled'],
    ['NotAllowedError', 'no-passkey'],
    ['SecurityError', 'unavailable'],
    ['InvalidStateError', 'unknown'],
  ])('classifies a %s from the browser prompt as %s', (name, failure) => {
    expect(classifyPasskeyLoginError(new DOMException('prompt', name))).toBe(failure);
  });

  it.each([
    [0, 'network'],
    [404, 'unavailable'],
    [429, 'rate-limited'],
    [400, 'rejected'],
    [401, 'rejected'],
    [500, 'server'],
    [503, 'server'],
  ])('classifies a passkey request failing with %i as %s', (status, failure) => {
    expect(classifyPasskeyLoginError(new PasskeyRequestError(status))).toBe(failure);
  });

  it('classifies a socket that would not open as connection', () => {
    expect(classifyPasskeyLoginError(new SocketOpenError(new Event('error')))).toBe('connection');
  });

  it('does not take any TypeError for an unreachable platform', () => {
    expect(classifyPasskeyLoginError(new TypeError('credential.toJSON is not a function'))).toBe('unknown');
  });

  it('only trusts the name of a real DOMException', () => {
    expect(classifyPasskeyLoginError({ name: 'NotAllowedError' })).toBe('unknown');
  });

  it.each([null, undefined, 'a string', 42, new Error('boom')])('classifies %p as unknown', (error) => {
    expect(classifyPasskeyLoginError(error)).toBe('unknown');
  });
});

describe('isPasskeyLoginFailure', () => {
  it.each(['cancelled', 'no-passkey', 'connection', 'unknown'])('accepts %s', (failure) => {
    expect(isPasskeyLoginFailure(failure)).toBe(true);
  });

  it.each(['toString', 'hasOwnProperty', '', 'Error', null, { name: 'Error' }])('rejects %p', (value) => {
    expect(isPasskeyLoginFailure(value)).toBe(false);
  });
});

describe('passkeyLoginErrorMessage', () => {
  it('says nothing when the prompt was cancelled', () => {
    expect(passkeyLoginErrorMessage('cancelled')).toBeNull();
  });

  it.each([
    ['no-passkey', 'No passkey was used. Please try again, or log in with your password.'],
    ['unavailable', 'Passkeys are not available right now. Please log in with your password.'],
    ['rate-limited', 'Too many attempts. Please wait a few minutes and try again.'],
    ['rejected', 'That passkey could not be used to log in. Please log in with your password.'],
    ['server', 'A server error occurred. Please try again later.'],
    ['network', 'Unable to reach the server. Please check your connection and try again.'],
    ['connection', 'Unable to connect to Arcus. Please try again later.'],
    ['unknown', 'Something went wrong while signing in. Please try again.'],
  ] as const)('explains %s', (failure, message) => {
    expect(passkeyLoginErrorMessage(failure)).toBe(message);
  });
});
