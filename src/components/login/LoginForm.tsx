'use client';

/** The default `/login` view: email/password sign-in. */

import { useState, useCallback, useMemo, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { loginThunk } from '@/store/thunks/loginThunk';
import { loadPlaceDataThunk } from '@/store/thunks/loadPlaceDataThunk';
import { useFormValidation, type ValidationConstraints } from '@/hooks/useFormValidation';
import { EMAIL_RULE } from '@/lib/validationRules';
import { takeNextPage } from '@/lib/nextPage';
import FormField from '@/components/create-account/FormField';

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
  const allValues = useMemo(() => ({ emailAddress, password }), [emailAddress, password]);

  const handleSubmit = useCallback(
    async (ev: FormEvent) => {
      ev.preventDefault();
      if (!form.formValidates(['emailAddress', 'password'], allValues)) return;

      setSaving(true);
      form.setFormError(null);

      let placeId: string | undefined;
      try {
        const result = await dispatch(
          loginThunk({
            username: emailAddress,
            password,
            isPublic,
          }),
        ).unwrap();
        placeId = result.placeId;
      } catch {
        setSaving(false);
        form.setFormError('Invalid username or password');
        return;
      }

      // The session and active place are already set by loginThunk, so a failure here is not a
      // credentials problem: carry on into the app and say the place data didn't load.
      if (placeId) {
        try {
          await dispatch(loadPlaceDataThunk(placeId)).unwrap();
        } catch {
          dispatch(addNotification({
            type: 'error',
            message: 'Signed in, but your place could not be loaded. Try refreshing the page.',
          }));
        }
      }

      router.replace(takeNextPage());
    },
    [emailAddress, password, isPublic, dispatch, router, form, allValues],
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

      <FormField
        className="mb-4"
        label="Email"
        id="email"
        name="emailAddress"
        type="email"
        autoComplete="email"
        value={emailAddress}
        onChange={setEmailAddress}
        form={form}
        allValues={allValues}
      />

      <FormField
        className="mb-4"
        label="Password"
        id="password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={setPassword}
        form={form}
        allValues={allValues}
      />

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
