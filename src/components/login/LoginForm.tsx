'use client';

/** The default `/login` view: email/password sign-in. */

import { useState, useCallback, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAppDispatch } from '@/store/hooks';
import { loginThunk } from '@/store/thunks/loginThunk';
import { loadPlaceDataThunk } from '@/store/thunks/loadPlaceDataThunk';
import { useFormValidation, type ValidationConstraints } from '@/hooks/useFormValidation';
import { EMAIL_RULE } from '@/lib/validationRules';
import { takeNextPage } from '@/lib/nextPage';

const LOGIN_CONSTRAINTS: ValidationConstraints = {
  emailAddress: EMAIL_RULE,
  password: {
    presence: true,
  },
};

export function LoginForm() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const expired = searchParams.get('expired') === '1';
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);

  const form = useFormValidation(LOGIN_CONSTRAINTS);

  const handleSubmit = useCallback(
    async (ev: FormEvent) => {
      ev.preventDefault();
      const values = { emailAddress, password };
      if (!form.formValidates(['emailAddress', 'password'], values)) return;

      setSaving(true);
      form.setFormError(null);

      try {
        const result = await dispatch(
          loginThunk({
            username: emailAddress,
            password,
            isPublic,
          }),
        ).unwrap();

        // SetActivePlace + cookie already handled inside loginThunk
        if (result.placeId) {
          await dispatch(loadPlaceDataThunk(result.placeId)).unwrap();
        }

        router.replace(takeNextPage());
      } catch {
        setSaving(false);
        form.setFormError('Invalid username or password');
      }
    },
    [emailAddress, password, isPublic, dispatch, router, form],
  );

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm">
      {expired && (
        <div data-testid="session-expired-notice" className="mb-4 rounded-[var(--border-radius-base)] border border-heron bg-pigeon px-4 py-3 text-sm text-swift">
          Your session has expired. Please log in again.
        </div>
      )}
      {form.formError && (
        <div data-testid="login-error" className="mb-4 text-cardinal text-sm">{form.formError}</div>
      )}

      <div className="mb-4">
        <label htmlFor="email" className="block text-sm font-medium text-swift mb-1">
          Email
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={emailAddress}
            onChange={(e) => {
              setEmailAddress(e.target.value);
              form.markChanged('emailAddress');
            }}
            onBlur={() => {
              form.markVisited('emailAddress');
              form.validateSingle('emailAddress', emailAddress, { emailAddress, password });
            }}
            className="w-full px-3 py-2 border border-grouse rounded-[var(--border-radius-base)] focus:outline-none focus:border-peacock"
          />
        </label>
        {form.visited.emailAddress && form.getFieldErrors('emailAddress').length > 0 && (
          <p className="mt-1 text-sm text-cardinal">
            {form.getFieldErrors('emailAddress')[0]}
          </p>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="password" className="block text-sm font-medium text-swift mb-1">
          Password
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              form.markChanged('password');
            }}
            onBlur={() => {
              form.markVisited('password');
              form.validateSingle('password', password, { emailAddress, password });
            }}
            className="w-full px-3 py-2 border border-grouse rounded-[var(--border-radius-base)] focus:outline-none focus:border-peacock"
          />
        </label>
        {form.visited.password && form.getFieldErrors('password').length > 0 && (
          <p className="mt-1 text-sm text-cardinal">
            {form.getFieldErrors('password')[0]}
          </p>
        )}
      </div>

      <div className="mb-6 flex items-center gap-2">
        <input
          id="isPublic"
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          className="rounded"
        />
        <label htmlFor="isPublic" className="text-sm text-coot">
          I am on a public computer
        </label>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <button
          type="submit"
          data-testid="login-submit"
          disabled={saving}
          className="bg-peacock text-crane px-6 py-2.5 rounded-[var(--border-radius-base)] hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? 'Logging In...' : 'Login'}
        </button>
        <Link
          href="/create-account"
          className="bg-heron text-swift px-6 py-2.5 rounded-[var(--border-radius-base)] border border-grouse hover:bg-crane transition-colors"
        >
          Create An Account
        </Link>
      </div>

      <div className="flex gap-6 text-xs uppercase">
        <Link href="/invite" className="text-peacock hover:underline">
          Use Invitation Code
        </Link>
        <Link
          href="/login?view=send-code"
          className="text-peacock hover:underline"
        >
          Forgot Password?
        </Link>
      </div>
    </form>
  );
}
