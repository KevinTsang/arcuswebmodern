'use client';

/** `/login?view=reset-password` — forgot password step 2: enter the code and a new password. */

import { useState, useCallback, useMemo, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFormValidation, type ValidationConstraints } from '@/hooks/useFormValidation';
import { EMAIL_RULE, NEW_PASSWORD_RULE, confirmPasswordRule } from '@/lib/validationRules';
import { PersonService } from '@arcus/core/services';

/** The shape of a rejected platform request: an `Error` or a platform error with a message. */
interface PlatformError {
  message?: string;
}

function getResetPasswordConstraints(emailAddress: string): ValidationConstraints {
  return {
    emailAddress: EMAIL_RULE,
    code: {
      presence: true,
    },
    newPassword: {
      ...NEW_PASSWORD_RULE,
      exclusion: { within: [emailAddress], message: 'cannot be your email address' },
    },
    confirmPassword: confirmPasswordRule('newPassword'),
  };
}

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromSendCode = searchParams.get('fromSendCode') === '1';
  const prefillEmail = searchParams.get('email') ?? '';

  const [emailAddress, setEmailAddress] = useState(prefillEmail);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const constraints = getResetPasswordConstraints(emailAddress);
  const form = useFormValidation(constraints);

  const allValues = useMemo(
    () => ({ emailAddress, code, newPassword, confirmPassword }),
    [emailAddress, code, newPassword, confirmPassword],
  );

  const handleSubmit = useCallback(
    async (ev: FormEvent) => {
      ev.preventDefault();
      if (!form.formValidates(['emailAddress', 'code', 'newPassword', 'confirmPassword'], allValues)) {
        return;
      }

      setSaving(true);
      form.setFormError(null);

      try {
        await PersonService.ResetPassword(emailAddress, code, newPassword);
        setSaving(false);
        router.push('/login?view=reset-confirmation');
      } catch (e) {
        setSaving(false);
        const message = (e as PlatformError | null | undefined)?.message;
        form.setFormError(message ?? 'An error occurred. Please try again.');
      }
    },
    [emailAddress, code, newPassword, form, router, allValues],
  );

  return (
    <div className="w-full max-w-sm">
      {fromSendCode ? (
        <>
          <h3 data-testid="reset-check-inbox" className="text-xl font-semibold text-swift mb-2">Check Your Inbox</h3>
          <p className="text-coot mb-1">
            We&apos;ve sent an email to <strong>{emailAddress}</strong> with a code to reset your password.
          </p>
          <p className="text-sm text-grouse mb-6">
            If you do not receive the email within a few minutes, check your spam folder.
          </p>
        </>
      ) : (
        <h3 className="text-xl font-semibold text-swift mb-6">
          Already have a code from Support?
        </h3>
      )}

      <form onSubmit={handleSubmit}>
        {!fromSendCode && (
          <div className="mb-4">
            <label htmlFor="rpEmail" className="block text-sm font-medium text-swift mb-1">
              Email Address
            </label>
            <input
              id="rpEmail"
              type="email"
              autoComplete="email"
              value={emailAddress}
              onChange={(e) => {
                setEmailAddress(e.target.value);
                form.markChanged('emailAddress');
              }}
              onBlur={() => {
                form.markVisited('emailAddress');
                form.validateSingle('emailAddress', emailAddress, allValues);
              }}
              className="w-full px-3 py-2 border border-grouse rounded-[var(--border-radius-base)] focus:outline-none focus:border-peacock"
            />
            {form.visited.emailAddress && form.getFieldErrors('emailAddress').length > 0 && (
              <p className="mt-1 text-sm text-cardinal">{form.getFieldErrors('emailAddress')[0]}</p>
            )}
          </div>
        )}

        <div className="mb-4">
          <label htmlFor="code" className="block text-sm font-medium text-swift mb-1">
            Enter Code
          </label>
          <input
            id="code"
            type="text"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              form.markChanged('code');
            }}
            onBlur={() => {
              form.markVisited('code');
              form.validateSingle('code', code, allValues);
            }}
            className="w-full px-3 py-2 border border-grouse rounded-[var(--border-radius-base)] focus:outline-none focus:border-peacock"
          />
          {form.visited.code && form.getFieldErrors('code').length > 0 && (
            <p className="mt-1 text-sm text-cardinal">{form.getFieldErrors('code')[0]}</p>
          )}
        </div>

        <div className="mb-4">
          <label htmlFor="newPassword" className="block text-sm font-medium text-swift mb-1">
            New Password
          </label>
          <input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              form.markChanged('newPassword');
            }}
            onBlur={() => {
              form.markVisited('newPassword');
              form.validateSingle('newPassword', newPassword, allValues);
            }}
            className="w-full px-3 py-2 border border-grouse rounded-[var(--border-radius-base)] focus:outline-none focus:border-peacock"
          />
          {form.visited.newPassword && form.getFieldErrors('newPassword').length > 0 && (
            <p className="mt-1 text-sm text-cardinal">{form.getFieldErrors('newPassword')[0]}</p>
          )}
        </div>

        <div className="mb-4">
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-swift mb-1">
            Confirm New Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              form.markChanged('confirmPassword');
            }}
            onBlur={() => {
              form.markVisited('confirmPassword');
              form.validateSingle('confirmPassword', confirmPassword, allValues);
            }}
            className="w-full px-3 py-2 border border-grouse rounded-[var(--border-radius-base)] focus:outline-none focus:border-peacock"
          />
          {form.visited.confirmPassword && form.getFieldErrors('confirmPassword').length > 0 && (
            <p className="mt-1 text-sm text-cardinal">
              {form.getFieldErrors('confirmPassword')[0]}
            </p>
          )}
        </div>

        <ul className="text-sm text-grouse mb-4 pl-4 list-disc">
          <li>Password is case-sensitive</li>
          <li>Must be at least 8 characters in length</li>
          <li>Must have at least 1 letter &amp; 1 number</li>
          <li>Cannot use spaces</li>
          <li>Cannot be your email address</li>
        </ul>

        {form.formError && (
          <div data-testid="reset-error" className="mb-4 text-cardinal text-sm">{form.formError}</div>
        )}

        <div className="flex gap-4">
          <button
            type="submit"
            data-testid="reset-submit"
            disabled={saving}
            className="bg-peacock text-crane px-6 py-2.5 rounded-[var(--border-radius-base)] hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Saving Password...' : 'Reset Password'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="bg-heron text-swift px-6 py-2.5 rounded-[var(--border-radius-base)] border border-grouse hover:bg-crane transition-colors"
          >
            Back
          </button>
        </div>
      </form>
    </div>
  );
}
