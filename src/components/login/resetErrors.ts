/** Readable messages for a failed `person:ResetPassword`. */

/** The shape of a rejected platform request: a platform error with a code, or an `Error`. */
interface PlatformError {
  code?: string;
  message?: string;
}

/** What `person:ResetPassword` can reject with (arcusplatform `personservice.xml`). */
const RESET_ERROR_MESSAGES: Record<string, string> = {
  'person.reset.token_failed': 'That code is invalid or has expired. Check the code, or request a new one.',
  'person.not_found': 'We couldn’t find an account with that email address.',
  'person.reset.failed': 'Your password could not be reset. Please try again.',
};

const GENERIC_RESET_ERROR = 'An error occurred. Please try again.';

/** A readable message for a failed reset; platform codes and raw error text are never shown. */
export function resetErrorMessage(error: unknown): string {
  const code = (error as PlatformError | null | undefined)?.code;
  return (code && RESET_ERROR_MESSAGES[code]) || GENERIC_RESET_ERROR;
}
