/** `/login?view=reset-confirmation` — forgot password step 3: the password was reset. */

import Link from 'next/link';

export function ResetConfirmation() {
  return (
    <div data-testid="reset-confirmation" className="w-full max-w-sm">
      <h3 className="text-xl font-semibold text-swift mb-2">Password Reset</h3>
      <p className="text-coot mb-6">Your password has successfully been reset.</p>
      <Link
        href="/login"
        className="inline-block bg-peacock text-crane px-6 py-2.5 rounded-[var(--border-radius-base)] hover:opacity-90 transition-opacity"
      >
        Back to login
      </Link>
    </div>
  );
}
