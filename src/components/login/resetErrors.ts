/** Readable messages for a failed `person:ResetPassword`. */

/** The shape of a rejected platform request: a platform error with a code, or an `Error`. */
interface PlatformError {
  code?: string;
  message?: string;
}

const INVALID_CODE = 'That code is invalid or has expired. Check the code, or request a new one.';

/**
 * What `person:ResetPassword` can reject with (arcusplatform `personservice.xml`).
 *
 * `person.not_found` reads the same as a bad code on purpose: saying no account exists would let
 * anyone check whether an email is registered. The platform's send-code step hides this too.
 */
const RESET_ERROR_MESSAGES: Record<string, string> = {
  'person.reset.token_failed': INVALID_CODE,
  'person.not_found': INVALID_CODE,
  'person.reset.failed': 'Your password could not be reset. Please try again.',
};

const GENERIC_RESET_ERROR = 'An error occurred. Please try again.';

/** A readable message for a failed reset; platform codes and raw error text are never shown. */
export function resetErrorMessage(error: unknown): string {
  const code = (error as PlatformError | null | undefined)?.code;
  return (code && RESET_ERROR_MESSAGES[code]) || GENERIC_RESET_ERROR;
}
