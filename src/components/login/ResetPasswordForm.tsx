'use client';

/** `/login?view=reset-password` — forgot password step 2: enter the code and a new password. */

import { useState, useCallback, useMemo, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFormValidation, validateFields, type ValidationConstraints } from '@/hooks/useFormValidation';
import { EMAIL_RULE, NEW_PASSWORD_RULE, confirmPasswordRule } from '@/lib/validationRules';
import { PersonService } from '@arcus/core/services';
import FormField from '@/components/create-account/FormField';
import { resetErrorMessage } from '@/components/login/resetErrors';

const FIELDS = ['emailAddress', 'code', 'newPassword', 'confirmPassword'];

function getResetPasswordConstraints(emailAddress: string): ValidationConstraints {
  return {
    emailAddress: EMAIL_RULE,
    code: {
      presence: true,
    },
    newPassword: {
      ...NEW_PASSWORD_RULE,
      exclusion: { within: [emailAddress], message: 'cannot be your email address', ignoreCase: true },
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

  const constraints = useMemo(() => getResetPasswordConstraints(emailAddress), [emailAddress]);
  const form = useFormValidation(constraints);

  // Coming from the send-code step the email is already known, so the field is hidden. A link
  // without a usable email still shows it, or the user would have no way to fix the address.
  const prefillValid = useMemo(
    () => !validateFields({ emailAddress: EMAIL_RULE }, ['emailAddress'], { emailAddress: prefillEmail }).emailAddress,
    [prefillEmail],
  );
  const showEmailField = !fromSendCode || !prefillValid;

  const allValues = useMemo(
    () => ({ emailAddress, code, newPassword, confirmPassword }),
    [emailAddress, code, newPassword, confirmPassword],
  );

  const handleSubmit = useCallback(
    async (ev: FormEvent) => {
      ev.preventDefault();
      if (!form.formValidates(FIELDS, allValues)) return;

      setSaving(true);
      form.setFormError(null);

      try {
        await PersonService.ResetPassword(emailAddress, code, newPassword);
        setSaving(false);
        router.push('/login?view=reset-confirmation');
      } catch (e) {
        setSaving(false);
        form.setFormError(resetErrorMessage(e));
      }
    },
    [emailAddress, code, newPassword, form, router, allValues],
  );

  return (
    <div className="w-full max-w-sm">
      {fromSendCode && prefillValid ? (
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
          {fromSendCode ? 'Enter Your Reset Code' : 'Already have a code from Support?'}
        </h3>
      )}

      <form onSubmit={handleSubmit}>
        {showEmailField && (
          <FormField
            className="mb-4"
            label="Email Address"
            id="rpEmail"
            name="emailAddress"
            type="email"
            autoComplete="email"
            value={emailAddress}
            onChange={setEmailAddress}
            form={form}
            allValues={allValues}
          />
        )}

        <FormField
          className="mb-4"
          label="Enter Code"
          id="code"
          autoComplete="one-time-code"
          value={code}
          onChange={setCode}
          form={form}
          allValues={allValues}
        />

        <FormField
          className="mb-4"
          label="New Password"
          id="newPassword"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={setNewPassword}
          form={form}
          allValues={allValues}
        />

        <FormField
          className="mb-4"
          label="Confirm New Password"
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          form={form}
          allValues={allValues}
        />

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
            onClick={() => router.push('/login?view=send-code')}
            className="bg-heron text-swift px-6 py-2.5 rounded-[var(--border-radius-base)] border border-grouse hover:bg-crane transition-colors"
          >
            Back
          </button>
        </div>
      </form>
    </div>
  );
}
