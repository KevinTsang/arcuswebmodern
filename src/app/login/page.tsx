'use client';

/**
 * Login page — ported from src/pages/login/.
 *
 * Supports four views via search params:
 *   /login                — login form (default)
 *   /login?view=send-code — forgot password step 1
 *   /login?view=reset-password — forgot password step 2
 *   /login?view=reset-confirmation — forgot password step 3
 */

import { useState, useCallback, Suspense, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { loginThunk } from '@/store/thunks/loginThunk';
import { loadPlaceDataThunk } from '@/store/thunks/loadPlaceDataThunk';
import { useFormValidation, type ValidationConstraints } from '@/hooks/useFormValidation';
import { PersonService } from '@arcus/core/services';
import { safeRedirectPath } from '@/lib/safeRedirect';

// ── Validation constraints ────────────────────────────────────────────

const LOGIN_CONSTRAINTS: ValidationConstraints = {
  emailAddress: {
    presence: true,
    email: { message: 'is invalid' },
  },
  password: {
    presence: true,
  },
};

const SEND_CODE_CONSTRAINTS: ValidationConstraints = {
  emailAddress: {
    presence: true,
    email: { message: 'is invalid' },
  },
};

function getResetPasswordConstraints(emailAddress: string): ValidationConstraints {
  return {
    emailAddress: {
      presence: true,
      email: { message: 'is invalid' },
    },
    code: {
      presence: true,
    },
    newPassword: {
      presence: true,
      length: { minimum: 8, message: 'must be at least 8 characters' },
      exclusion: { within: [emailAddress], message: 'cannot be your email address' },
      oneLetterOneNumber: true,
      noSpaces: true,
    },
    confirmPassword: {
      presence: true,
      equality: { attribute: 'newPassword', message: '^Passwords do not match' },
    },
  };
}

// ── Login Form ────────────────────────────────────────────────────────

function LoginForm() {
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

        router.replace(safeRedirectPath(searchParams.get('redirect')));
      } catch {
        setSaving(false);
        form.setFormError('Invalid username or password');
      }
    },
    [emailAddress, password, isPublic, dispatch, router, searchParams, form],
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

// ── Forgot Password Step 1: Send Code ─────────────────────────────────

function SendCodeForm() {
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
        <div className="mb-4">
          <label htmlFor="resetEmail" className="block text-sm font-medium text-swift mb-1">
            Email Address
          </label>
          <input
            id="resetEmail"
            type="email"
            autoComplete="email"
            value={emailAddress}
            onChange={(e) => {
              setEmailAddress(e.target.value);
              form.markChanged('emailAddress');
            }}
            onBlur={() => {
              form.markVisited('emailAddress');
              form.validateSingle('emailAddress', emailAddress, { emailAddress });
            }}
            className="w-full px-3 py-2 border border-grouse rounded-[var(--border-radius-base)] focus:outline-none focus:border-peacock"
          />
          {form.visited.emailAddress && form.getFieldErrors('emailAddress').length > 0 && (
            <p className="mt-1 text-sm text-cardinal">
              {form.getFieldErrors('emailAddress')[0]}
            </p>
          )}
        </div>

        <p className="text-sm mb-4">
          <Link href="/login?view=reset-password" className="text-peacock hover:underline">
            Already have a code from Support? Click here.
          </Link>
        </p>

        {form.formError && (
          <div className="mb-4 text-cardinal text-sm">{form.formError}</div>
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

// ── Forgot Password Step 2: Reset Password ────────────────────────────

function ResetPasswordForm() {
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

  const allValues = { emailAddress, code, newPassword, confirmPassword };

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
      } catch (e: any) {
        setSaving(false);
        form.setFormError(e?.message ?? 'An error occurred. Please try again.');
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

// ── Forgot Password Step 3: Confirmation ──────────────────────────────

function ResetConfirmation() {
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

// ── Page Content (uses useSearchParams, must be inside Suspense) ──────

function LoginPageContent() {
  const searchParams = useSearchParams();
  const view = searchParams.get('view');

  let content: React.ReactNode;
  switch (view) {
    case 'send-code':
      content = <SendCodeForm />;
      break;
    case 'reset-password':
      content = <ResetPasswordForm />;
      break;
    case 'reset-confirmation':
      content = <ResetConfirmation />;
      break;
    default:
      content = <LoginForm />;
  }

  return (
    <main className="flex min-h-screen">
      {/* Branding panel */}
      <div className="hidden md:flex flex-col items-center justify-center flex-[0_0_35%] bg-gradient-to-b from-crane to-heron border-r border-grouse px-8">
        <div className="text-2xl font-bold text-swift mb-2">Arcus</div>
        <div className="text-sm text-grouse uppercase tracking-wider">
          Smart Home
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-[var(--gutter)]">
        {content}
      </div>
    </main>
  );
}

// ── Page Component ────────────────────────────────────────────────────

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}
