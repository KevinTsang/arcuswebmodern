'use client';

/**
 * Create Account page — ported from src/pages/create-account/.
 *
 * Multi-step wizard:
 *   1. Login credentials (email, password, name, phone)
 *   2. Address entry
 *   3. PIN code
 *   4. Welcome / completion
 *
 * The original had 10 steps including ProMonitoring-specific steps.
 * This simplified version covers the core account creation flow.
 * ProMonitoring steps can be added later if needed.
 */

import { useState, useCallback, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppDispatch } from '@/store/hooks';
import { AccountService, PlaceService } from '@arcus/core/services';
import auth from '@arcus/core/auth';
import Bridge from '@arcus/core/bridge';
import { loginSuccess } from '@/store/slices/authSlice';
import { loadPlaceDataThunk } from '@/store/thunks/loadPlaceDataThunk';
import { initializeCoreConfig } from '@/store/thunks/loginThunk';
import { useFormValidation, type ValidationConstraints } from '@/hooks/useFormValidation';

// ── Steps ─────────────────────────────────────────────────────────

type Step = 'credentials' | 'address' | 'pin' | 'welcome';

const STEPS: Step[] = ['credentials', 'address', 'pin', 'welcome'];

const STEP_LABELS: Record<Step, string> = {
  credentials: 'Account',
  address: 'Address',
  pin: 'PIN Code',
  welcome: 'Welcome',
};

// ── Validation ────────────────────────────────────────────────────

const CREDENTIALS_CONSTRAINTS: ValidationConstraints = {
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

const ADDRESS_CONSTRAINTS: ValidationConstraints = {
  street1: { presence: true },
  city: { presence: true },
  state: { presence: true },
  zip: { presence: true },
};

const PIN_CONSTRAINTS: ValidationConstraints = {
  pin: { presence: true, length: { minimum: 4, maximum: 8, message: 'must be 4-8 digits' } },
};

// ── Main Component ────────────────────────────────────────────────

export default function CreateAccountPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [step, setStep] = useState<Step>('credentials');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form data persisted across steps
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [optIn, setOptIn] = useState(false);

  const [street1, setStreet1] = useState('');
  const [street2, setStreet2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');

  const [pin, setPin] = useState('');

  // Data from API responses
  const [personData, setPersonData] = useState<Record<string, unknown> | null>(null);
  const [placeId, setPlaceId] = useState<string | null>(null);

  const credForm = useFormValidation(CREDENTIALS_CONSTRAINTS);
  const addrForm = useFormValidation(ADDRESS_CONSTRAINTS);
  const pinForm = useFormValidation(PIN_CONSTRAINTS);

  const stepIndex = STEPS.indexOf(step);

  // ── Step 1: Create account with credentials ──────────────────

  const handleCredentials = useCallback(
    async (ev: FormEvent) => {
      ev.preventDefault();
      const values = { email, password, confirmPassword, firstName, lastName };
      if (!credForm.formValidates(['email', 'password', 'confirmPassword', 'firstName', 'lastName'], values)) return;

      setLoading(true);
      setError('');

      try {
        initializeCoreConfig();

        const result = await AccountService.CreateAccount({
          email,
          password,
          optin: optIn ? 'true' : 'false',
          person: {
            'person:firstName': firstName,
            'person:lastName': lastName,
            'person:mobileNumber': phone || undefined,
            'person:email': email,
          },
          place: {},
        });

        // Authenticate after account creation
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
          auth.authenticate().catch(reject);
        });

        setPersonData(sessionData);
        const pId = (sessionData['person:currPlace'] as string) ??
          (result['placeId'] as string) ?? null;
        setPlaceId(pId);

        dispatch(loginSuccess({ person: sessionData, account: (result['account'] as Record<string, unknown>) ?? {} }));
        setStep('address');
      } catch {
        setError('Failed to create account. The email may already be in use.');
      } finally {
        setLoading(false);
      }
    },
    [email, password, confirmPassword, firstName, lastName, phone, optIn, credForm, dispatch],
  );

  // ── Step 2: Save address ─────────────────────────────────────

  const handleAddress = useCallback(
    async (ev: FormEvent) => {
      ev.preventDefault();
      const values = { street1, city, state, zip };
      if (!addrForm.formValidates(['street1', 'city', 'state', 'zip'], values)) return;

      if (!placeId) {
        setStep('pin');
        return;
      }

      setLoading(true);
      setError('');

      try {
        await Bridge.request('base:SetAttributes', `SERV:place:${placeId}`, {
          'place:streetAddress1': street1,
          'place:streetAddress2': street2,
          'place:city': city,
          'place:stateProv': state,
          'place:zipCode': zip,
        });
        setStep('pin');
      } catch {
        setError('Failed to save address. You can update it later in Settings.');
        setStep('pin');
      } finally {
        setLoading(false);
      }
    },
    [street1, street2, city, state, zip, placeId, addrForm],
  );

  // ── Step 3: Set PIN ──────────────────────────────────────────

  const handlePin = useCallback(
    async (ev: FormEvent) => {
      ev.preventDefault();
      const values = { pin };
      if (!pinForm.formValidates(['pin'], values)) return;

      if (!personData) {
        setStep('welcome');
        return;
      }

      setLoading(true);
      setError('');

      try {
        const personAddr = personData['base:address'] as string;
        await Bridge.request('person:ChangePinV2', personAddr, {
          place: placeId,
          pin,
        });
        setStep('welcome');
      } catch {
        setError('PIN code not available. Please choose a different PIN.');
      } finally {
        setLoading(false);
      }
    },
    [pin, personData, placeId, pinForm],
  );

  // ── Step 4: Welcome / finish ─────────────────────────────────

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

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-pigeon/30">
      <div className="w-full max-w-md">
        {/* Logo / title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-swift">Create Account</h1>
          <p className="text-sm text-grouse mt-1">Set up your Arcus Smart Home</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                  i < stepIndex
                    ? 'bg-honeycreeper text-crane'
                    : i === stepIndex
                      ? 'bg-peacock text-crane'
                      : 'bg-pigeon text-grouse'
                }`}
              >
                {i < stepIndex ? '\u2713' : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-0.5 ${i < stepIndex ? 'bg-honeycreeper' : 'bg-pigeon'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="bg-crane rounded-[var(--border-radius-lg)] shadow-sm border border-heron p-6">
          <h2 className="text-lg font-semibold text-swift mb-1">{STEP_LABELS[step]}</h2>

          {error && (
            <div className="mb-4 text-cardinal text-sm bg-cardinal/5 border border-cardinal/20 rounded px-3 py-2">
              {error}
            </div>
          )}

          {step === 'credentials' && (
            <CredentialsStep
              email={email} setEmail={setEmail}
              password={password} setPassword={setPassword}
              confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword}
              firstName={firstName} setFirstName={setFirstName}
              lastName={lastName} setLastName={setLastName}
              phone={phone} setPhone={setPhone}
              optIn={optIn} setOptIn={setOptIn}
              form={credForm}
              loading={loading}
              onSubmit={handleCredentials}
            />
          )}

          {step === 'address' && (
            <AddressStep
              street1={street1} setStreet1={setStreet1}
              street2={street2} setStreet2={setStreet2}
              city={city} setCity={setCity}
              state={state} setState={setState}
              zip={zip} setZip={setZip}
              form={addrForm}
              loading={loading}
              onSubmit={handleAddress}
              onSkip={() => setStep('pin')}
            />
          )}

          {step === 'pin' && (
            <PinStep
              pin={pin} setPin={setPin}
              form={pinForm}
              loading={loading}
              onSubmit={handlePin}
              onSkip={() => setStep('welcome')}
            />
          )}

          {step === 'welcome' && (
            <WelcomeStep
              firstName={firstName}
              loading={loading}
              onFinish={handleFinish}
            />
          )}
        </div>

        {step === 'credentials' && (
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

// ── Step Components ───────────────────────────────────────────────

function CredentialsStep({
  email, setEmail, password, setPassword,
  confirmPassword, setConfirmPassword,
  firstName, setFirstName, lastName, setLastName,
  phone, setPhone, optIn, setOptIn,
  form, loading, onSubmit,
}: {
  email: string; setEmail: (v: string) => void;
  password: string; setPassword: (v: string) => void;
  confirmPassword: string; setConfirmPassword: (v: string) => void;
  firstName: string; setFirstName: (v: string) => void;
  lastName: string; setLastName: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
  optIn: boolean; setOptIn: (v: boolean) => void;
  form: ReturnType<typeof useFormValidation>;
  loading: boolean;
  onSubmit: (ev: FormEvent) => void;
}) {
  const allValues = { email, password, confirmPassword, firstName, lastName };

  return (
    <form onSubmit={onSubmit} className="space-y-4 mt-4">
      <div className="grid grid-cols-2 gap-3">
        <FormField
          label="First Name" id="firstName" value={firstName}
          onChange={setFirstName} form={form} allValues={allValues}
        />
        <FormField
          label="Last Name" id="lastName" value={lastName}
          onChange={setLastName} form={form} allValues={allValues}
        />
      </div>
      <FormField
        label="Email" id="email" type="email" autoComplete="email"
        value={email} onChange={setEmail} form={form} allValues={allValues}
      />
      <FormField
        label="Phone (optional)" id="phone" type="tel" autoComplete="tel"
        value={phone} onChange={setPhone}
      />
      <FormField
        label="Password" id="password" type="password" autoComplete="new-password"
        value={password} onChange={setPassword} form={form} allValues={allValues}
      />
      <FormField
        label="Confirm Password" id="confirmPassword" type="password" autoComplete="new-password"
        value={confirmPassword} onChange={setConfirmPassword} form={form} allValues={allValues}
      />
      <label className="flex items-center gap-2 text-sm text-coot">
        <input
          type="checkbox"
          checked={optIn}
          onChange={(e) => setOptIn(e.target.checked)}
          className="accent-peacock"
        />
        Keep me up to date with news and offers
      </label>
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90 disabled:opacity-50"
      >
        {loading ? 'Creating Account…' : 'Create Account'}
      </button>
    </form>
  );
}

function AddressStep({
  street1, setStreet1, street2, setStreet2,
  city, setCity, state, setState,
  zip, setZip,
  form, loading, onSubmit, onSkip,
}: {
  street1: string; setStreet1: (v: string) => void;
  street2: string; setStreet2: (v: string) => void;
  city: string; setCity: (v: string) => void;
  state: string; setState: (v: string) => void;
  zip: string; setZip: (v: string) => void;
  form: ReturnType<typeof useFormValidation>;
  loading: boolean;
  onSubmit: (ev: FormEvent) => void;
  onSkip: () => void;
}) {
  const allValues = { street1, city, state, zip };

  return (
    <form onSubmit={onSubmit} className="space-y-4 mt-4">
      <p className="text-sm text-grouse">Enter your home address for accurate weather and service information.</p>
      <FormField
        label="Street Address" id="street1" value={street1}
        onChange={setStreet1} form={form} allValues={allValues}
      />
      <FormField
        label="Street Address 2 (optional)" id="street2" value={street2}
        onChange={setStreet2}
      />
      <div className="grid grid-cols-3 gap-3">
        <FormField
          label="City" id="city" value={city}
          onChange={setCity} form={form} allValues={allValues}
        />
        <FormField
          label="State" id="state" value={state}
          onChange={setState} form={form} allValues={allValues}
        />
        <FormField
          label="ZIP" id="zip" value={zip}
          onChange={setZip} form={form} allValues={allValues}
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2.5 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90 disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Save Address'}
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="px-4 py-2.5 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon"
        >
          Skip
        </button>
      </div>
    </form>
  );
}

function PinStep({
  pin, setPin,
  form, loading, onSubmit, onSkip,
}: {
  pin: string; setPin: (v: string) => void;
  form: ReturnType<typeof useFormValidation>;
  loading: boolean;
  onSubmit: (ev: FormEvent) => void;
  onSkip: () => void;
}) {
  const allValues = { pin };

  return (
    <form onSubmit={onSubmit} className="space-y-4 mt-4">
      <p className="text-sm text-grouse">
        Set a PIN code to disarm your security alarm and unlock doors.
      </p>
      <FormField
        label="PIN Code" id="pin" type="password" autoComplete="off"
        value={pin} onChange={setPin} form={form} allValues={allValues}
        inputMode="numeric"
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
          onClick={onSkip}
          className="px-4 py-2.5 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon"
        >
          Skip
        </button>
      </div>
    </form>
  );
}

function WelcomeStep({
  firstName,
  loading,
  onFinish,
}: {
  firstName: string;
  loading: boolean;
  onFinish: () => void;
}) {
  return (
    <div className="text-center py-6 space-y-4">
      <div className="text-4xl">&#127968;</div>
      <h3 className="text-xl font-semibold text-swift">
        Welcome{firstName ? `, ${firstName}` : ''}!
      </h3>
      <p className="text-sm text-grouse">
        Your Arcus Smart Home account is ready. Start by pairing your hub and devices.
      </p>
      <button
        onClick={onFinish}
        disabled={loading}
        className="w-full py-2.5 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90 disabled:opacity-50"
      >
        {loading ? 'Loading…' : 'Go to Dashboard'}
      </button>
    </div>
  );
}

// ── Shared Form Field ─────────────────────────────────────────────

function FormField({
  label, id, value, onChange, type = 'text', autoComplete,
  form, allValues, inputMode,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  form?: ReturnType<typeof useFormValidation>;
  allValues?: Record<string, string>;
  inputMode?: 'numeric' | 'text';
}) {
  const errors = form && allValues
    ? form.visited[id] ? form.getFieldErrors(id) : []
    : [];

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-swift mb-1">
        {label}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        inputMode={inputMode}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          form?.markChanged(id);
        }}
        onBlur={() => {
          form?.markVisited(id);
          if (allValues) {
            form?.validateSingle(id, value, allValues);
          }
        }}
        className="w-full px-3 py-2 border border-grouse rounded-[var(--border-radius-base)] text-sm focus:outline-none focus:border-peacock"
      />
      {errors.length > 0 && (
        <p className="mt-1 text-sm text-cardinal">{errors[0]}</p>
      )}
    </div>
  );
}
