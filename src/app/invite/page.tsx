'use client';

/**
 * Invite page — ported from src/pages/invite/.
 *
 * Two-phase flow:
 *   1. Enter invitation code + email → look up invitation
 *   2. Create login (name, password, phone) → accept invitation
 *   3. Set PIN → go to dashboard
 *
 * If the user is already logged in, the login step is skipped and
 * only the PIN step + welcome are shown.
 */

import { useState, useCallback, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { InvitationService } from '@arcus/core/services';
import auth from '@arcus/core/auth';
import Bridge from '@arcus/core/bridge';
import { loginSuccess } from '@/store/slices/authSlice';
import { loadPlaceDataThunk } from '@/store/thunks/loadPlaceDataThunk';
import { initializeCoreConfig } from '@/store/thunks/loginThunk';
import { useFormValidation, type ValidationConstraints } from '@/hooks/useFormValidation';

type InviteStep = 'code' | 'confirm' | 'create-login' | 'pin' | 'welcome';

const LOGIN_CONSTRAINTS: ValidationConstraints = {
  email: { presence: true, email: { message: 'is invalid' } },
  password: {
    presence: true,
    length: { minimum: 8, message: 'must be at least 8 characters' },
    oneLetterOneNumber: true,
    noSpaces: true,
  },
  confirmPassword: {
    presence: true,
    equality: { attribute: 'password', message: '^Passwords do not match' },
  },
  firstName: { presence: true },
  lastName: { presence: true },
};

const PIN_CONSTRAINTS: ValidationConstraints = {
  pin: { presence: true, length: { minimum: 4, maximum: 8, message: 'must be 4-8 digits' } },
};

export default function InvitePage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const authenticated = useAppSelector((s) => s.auth.authenticated);

  const [step, setStep] = useState<InviteStep>('code');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Phase 1: code entry
  const [inviteCode, setInviteCode] = useState('');
  const [inviteeEmail, setInviteeEmail] = useState('');
  const [invitation, setInvitation] = useState<Record<string, unknown> | null>(null);

  // Phase 2: account creation
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Phase 3: PIN
  const [pin, setPin] = useState('');
  const [personData, setPersonData] = useState<Record<string, unknown> | null>(null);
  const [placeId, setPlaceId] = useState<string | null>(null);

  const loginForm = useFormValidation(LOGIN_CONSTRAINTS);
  const pinForm = useFormValidation(PIN_CONSTRAINTS);

  // ── Step 1: Look up invitation ─────────────────────────────

  const handleLookup = useCallback(async (ev: FormEvent) => {
    ev.preventDefault();
    if (!inviteCode.trim() || !inviteeEmail.trim()) return;

    setLoading(true);
    setError('');

    try {
      initializeCoreConfig();
      const result = await InvitationService.GetInvitation(inviteCode.trim(), inviteeEmail.trim());
      setInvitation(result);
      setFirstName((result['inviteeFirstName'] as string) ?? '');
      setStep('confirm');
    } catch {
      setError(
        'Email and/or invitation code not recognized. Please check your email and invitation code and try again. Invitation codes expire after 7 days.',
      );
    } finally {
      setLoading(false);
    }
  }, [inviteCode, inviteeEmail]);

  // ── Step 2: Confirm → go to create login ───────────────────

  const handleConfirm = useCallback(() => {
    if (authenticated) {
      // Already logged in — skip login step
      setStep('pin');
    } else {
      setStep('create-login');
    }
  }, [authenticated]);

  // ── Step 3: Create login and accept invitation ─────────────

  const handleCreateLogin = useCallback(async (ev: FormEvent) => {
    ev.preventDefault();
    const values = { email: inviteeEmail, password, confirmPassword, firstName, lastName };
    if (!loginForm.formValidates(['email', 'password', 'confirmPassword', 'firstName', 'lastName'], values)) return;

    setLoading(true);
    setError('');

    try {
      const person: Record<string, unknown> = {
        'person:email': inviteeEmail,
        'person:firstName': firstName,
        'person:lastName': lastName,
        'person:mobileNumber': phone || undefined,
      };

      await InvitationService.AcceptInvitationCreateLogin(
        person,
        password,
        inviteCode.trim(),
        inviteeEmail.trim(),
      );

      // Authenticate after invitation acceptance
      const sessionData = await new Promise<Record<string, unknown>>((resolve, reject) => {
        const onSuccess = (data: Record<string, unknown>) => {
          auth.off('authentication:success', onSuccess);
          auth.off('authentication:fail', onFail);
          resolve(data);
        };
        const onFail = () => {
          auth.off('authentication:success', onSuccess);
          auth.off('authentication:fail', onFail);
          reject(new Error('Authentication failed'));
        };
        auth.on('authentication:success', onSuccess);
        auth.on('authentication:fail', onFail);
        auth.login(inviteeEmail, password).catch(reject);
      });

      setPersonData(sessionData);
      const pId = (sessionData['person:currPlace'] as string) ?? null;
      setPlaceId(pId);

      dispatch(loginSuccess({ person: sessionData, account: {} }));
      setStep('pin');
    } catch {
      setError('Failed to accept invitation. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [inviteeEmail, password, confirmPassword, firstName, lastName, phone, inviteCode, loginForm, dispatch]);

  // ── Step 4: Set PIN ────────────────────────────────────────

  const handlePin = useCallback(async (ev: FormEvent) => {
    ev.preventDefault();
    const values = { pin };
    if (!pinForm.formValidates(['pin'], values)) return;

    const person = personData;
    if (!person) {
      setStep('welcome');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await Bridge.request('person:ChangePinV2', person['base:address'] as string, {
        place: placeId,
        pin,
      });
      setStep('welcome');
    } catch {
      setError('PIN code not available. Please choose a different PIN.');
    } finally {
      setLoading(false);
    }
  }, [pin, personData, placeId, pinForm]);

  // ── Step 5: Welcome ────────────────────────────────────────

  const handleFinish = useCallback(async () => {
    setLoading(true);
    try {
      if (placeId) {
        await dispatch(loadPlaceDataThunk(placeId)).unwrap();
      }
      router.replace('/');
    } catch {
      router.replace('/');
    }
  }, [placeId, dispatch, router]);

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-pigeon/30">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-swift">Accept Invitation</h1>
          <p className="text-sm text-grouse mt-1">Join an Arcus Smart Home</p>
        </div>

        <div className="bg-crane rounded-[var(--border-radius-lg)] shadow-sm border border-heron p-6">
          {error && (
            <div className="mb-4 text-cardinal text-sm bg-cardinal/5 border border-cardinal/20 rounded px-3 py-2">
              {error}
            </div>
          )}

          {step === 'code' && (
            <form onSubmit={handleLookup} className="space-y-4">
              <p className="text-sm text-grouse">
                Enter the invitation code from your email to get started.
              </p>
              <InviteField
                label="Invitation Code" id="inviteCode" value={inviteCode}
                onChange={setInviteCode} placeholder="Enter code"
              />
              <InviteField
                label="Email Address" id="inviteeEmail" type="email" value={inviteeEmail}
                onChange={setInviteeEmail} placeholder="Email used for invitation"
              />
              <button
                type="submit"
                disabled={loading || !inviteCode.trim() || !inviteeEmail.trim()}
                className="w-full py-2.5 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90 disabled:opacity-50"
              >
                {loading ? 'Looking up…' : 'Look Up Invitation'}
              </button>
            </form>
          )}

          {step === 'confirm' && invitation && (
            <div className="space-y-4 text-center py-4">
              <p className="text-lg text-swift">
                Hello{firstName ? `, ${firstName}` : ''}!
              </p>
              <p className="text-sm text-grouse">
                Thanks for accepting your invitation to{' '}
                <strong className="text-swift">
                  {String(invitation['invitorFirstName'] ?? '')} {String(invitation['invitorLastName'] ?? '')}
                </strong>&apos;s place called{' '}
                <strong className="text-swift">{String(invitation['placeName'] ?? 'their home')}</strong>.
              </p>
              <p className="text-sm text-grouse">Get started by answering a few questions!</p>
              <button
                onClick={handleConfirm}
                className="w-full py-2.5 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90"
              >
                Next
              </button>
            </div>
          )}

          {step === 'create-login' && (
            <form onSubmit={handleCreateLogin} className="space-y-4">
              <p className="text-sm text-grouse mb-2">Create your login credentials.</p>
              <div className="grid grid-cols-2 gap-3">
                <ValidatedField
                  label="First Name" id="firstName" value={firstName}
                  onChange={setFirstName} form={loginForm}
                  allValues={{ email: inviteeEmail, password, confirmPassword, firstName, lastName }}
                />
                <ValidatedField
                  label="Last Name" id="lastName" value={lastName}
                  onChange={setLastName} form={loginForm}
                  allValues={{ email: inviteeEmail, password, confirmPassword, firstName, lastName }}
                />
              </div>
              <InviteField
                label="Phone (optional)" id="phone" type="tel" value={phone}
                onChange={setPhone}
              />
              <ValidatedField
                label="Password" id="password" type="password" autoComplete="new-password"
                value={password} onChange={setPassword} form={loginForm}
                allValues={{ email: inviteeEmail, password, confirmPassword, firstName, lastName }}
              />
              <ValidatedField
                label="Confirm Password" id="confirmPassword" type="password"
                autoComplete="new-password"
                value={confirmPassword} onChange={setConfirmPassword} form={loginForm}
                allValues={{ email: inviteeEmail, password, confirmPassword, firstName, lastName }}
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90 disabled:opacity-50"
              >
                {loading ? 'Creating Login…' : 'Create Login'}
              </button>
            </form>
          )}

          {step === 'pin' && (
            <form onSubmit={handlePin} className="space-y-4">
              <p className="text-sm text-grouse">
                Set a PIN code to disarm the security alarm and unlock doors at this place.
              </p>
              <ValidatedField
                label="PIN Code" id="pin" type="password" autoComplete="off"
                value={pin} onChange={setPin} form={pinForm}
                allValues={{ pin }} inputMode="numeric"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90 disabled:opacity-50"
                >
                  {loading ? 'Setting PIN…' : 'Set PIN'}
                </button>
                <button
                  type="button"
                  onClick={() => setStep('welcome')}
                  className="px-4 py-2.5 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon"
                >
                  Skip
                </button>
              </div>
            </form>
          )}

          {step === 'welcome' && (
            <div className="text-center py-6 space-y-4">
              <div className="text-4xl">&#127968;</div>
              <h3 className="text-xl font-semibold text-swift">
                Welcome{firstName ? `, ${firstName}` : ''}!
              </h3>
              <p className="text-sm text-grouse">
                You&apos;ve successfully joined the place. Start exploring your smart home.
              </p>
              <button
                onClick={handleFinish}
                disabled={loading}
                className="w-full py-2.5 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90 disabled:opacity-50"
              >
                {loading ? 'Loading…' : 'Go to Dashboard'}
              </button>
            </div>
          )}
        </div>

        {step === 'code' && (
          <p className="text-center text-sm text-grouse mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-peacock hover:underline">
              Log in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

// ── Field Components ──────────────────────────────────────────────

function InviteField({
  label, id, value, onChange, type = 'text', placeholder,
}: {
  label: string; id: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-swift mb-1">{label}</label>
      <input
        id={id} type={type} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-grouse rounded-[var(--border-radius-base)] text-sm focus:outline-none focus:border-peacock"
      />
    </div>
  );
}

function ValidatedField({
  label, id, value, onChange, type = 'text', autoComplete,
  form, allValues, inputMode,
}: {
  label: string; id: string; value: string; onChange: (v: string) => void;
  type?: string; autoComplete?: string;
  form: ReturnType<typeof useFormValidation>;
  allValues: Record<string, string>;
  inputMode?: 'numeric' | 'text';
}) {
  const errors = form.visited[id] ? form.getFieldErrors(id) : [];

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-swift mb-1">{label}</label>
      <input
        id={id} type={type} autoComplete={autoComplete} inputMode={inputMode}
        value={value}
        onChange={(e) => { onChange(e.target.value); form.markChanged(id); }}
        onBlur={() => { form.markVisited(id); form.validateSingle(id, value, allValues); }}
        className="w-full px-3 py-2 border border-grouse rounded-[var(--border-radius-base)] text-sm focus:outline-none focus:border-peacock"
      />
      {errors.length > 0 && <p className="mt-1 text-sm text-cardinal">{errors[0]}</p>}
    </div>
  );
}
