'use client';

/** `/login?view=send-code` — forgot password step 1: email a reset code. */

import { useState, useCallback, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFormValidation, type ValidationConstraints } from '@/hooks/useFormValidation';
import { EMAIL_RULE } from '@/lib/validationRules';
import { PersonService } from '@arcus/core/services';
import FormField from '@/components/create-account/FormField';

const SEND_CODE_CONSTRAINTS: ValidationConstraints = {
  emailAddress: EMAIL_RULE,
};

export function SendCodeForm() {
  const router = useRouter();
  const [emailAddress, setEmailAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const form = useFormValidation(SEND_CODE_CONSTRAINTS);

  const handleSubmit = useCallback(
    async (ev: FormEvent) => {
      ev.preventDefault();
      if (!form.formValidates(['emailAddress'], { emailAddress })) return;

      setSaving(true);
      form.setFormError(null);

      try {
        await PersonService.SendPasswordReset(emailAddress, 'email');
        setSaving(false);
        router.push(`/login?view=reset-password&email=${encodeURIComponent(emailAddress)}&fromSendCode=1`);
      } catch {
        setSaving(false);
        form.setFormError('An error occurred sending the reset code. Please try again later.');
      }
    },
    [emailAddress, form, router],
  );

  return (
    <div className="w-full max-w-sm">
      <h3 className="text-xl font-semibold text-swift mb-2">Forgot Password</h3>
      <p className="text-coot mb-1">
        Don&apos;t worry, just enter the email address you registered with and we will send you
        instructions to reset your password.
      </p>
      <p className="text-sm text-grouse mb-6">
        But hurry, the link will expire in 30 minutes.
      </p>

      <form onSubmit={handleSubmit}>
        <FormField
          className="mb-4"
          label="Email Address"
          id="resetEmail"
          name="emailAddress"
          type="email"
          autoComplete="email"
          value={emailAddress}
          onChange={setEmailAddress}
          form={form}
          allValues={{ emailAddress }}
        />

        <p className="text-sm mb-4">
          <Link href="/login?view=reset-password" className="text-peacock hover:underline">
            Already have a code from Support? Click here.
          </Link>
        </p>

        {form.formError && (
          <div data-testid="send-code-error" className="mb-4 text-cardinal text-sm">{form.formError}</div>
        )}

        <div className="flex gap-4">
          <button
            type="submit"
            data-testid="reset-send"
            disabled={saving}
            className="bg-peacock text-crane px-6 py-2.5 rounded-[var(--border-radius-base)] hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Sending...' : 'Send Email'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="bg-heron text-swift px-6 py-2.5 rounded-[var(--border-radius-base)] border border-grouse hover:bg-crane transition-colors"
          >
            Back
          </button>
        </div>
      </form>
    </div>
  );
}
