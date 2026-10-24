'use client';

/**
 * Create Account page — multi-step wizard:
 *   1. Login credentials (email, password, name, phone)
 *   2. Address entry
 *   3. PIN code
 *   4. Welcome / completion
 */

import { useCallback } from 'react';
import Link from 'next/link';
import { CreateAccountProvider, useCreateAccount, CredentialsStep, AddressStep, WelcomeStep, STEPS, STEP_LABELS } from '@/components/create-account';
import { setStep, setLoading, setPinError } from '@/components/create-account';
import ChangePinForm from '@/components/ChangePinForm';
import Bridge from '@arcus/core/bridge';

function CreateAccountInner() {
  const { state, dispatch } = useCreateAccount();
  const { step, error, personData, placeId, loading, pinError } = state;
  const stepIndex = STEPS.indexOf(step);

  const handlePin = useCallback(
    async (pinValue: string) => {
      if (!personData) {
        dispatch(setStep('welcome'));
        return;
      }

      dispatch(setLoading(true));

      try {
        await Bridge.restfulRequest('person:ChangePinV2', `SERV:person:${personData.personId}`, {
          place: placeId,
          pin: pinValue,
        });
        dispatch(setStep('welcome'));
      } catch {
        dispatch(setPinError('Failed to save PIN code. Please try again.'));
      } finally {
        dispatch(setLoading(false));
      }
    },
    [personData, placeId, dispatch],
  );

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
          <h2 data-testid="create-account-step" data-step={step} className="text-lg font-semibold text-swift mb-1">{STEP_LABELS[step]}</h2>

          {error && (
            <div data-testid="create-account-error" className="mb-4 text-cardinal text-sm bg-cardinal/5 border border-cardinal/20 rounded px-3 py-2">
              {error}
            </div>
          )}

          {step === 'credentials' && <CredentialsStep />}
          {step === 'address' && <AddressStep />}
          {step === 'pin' && (
            <ChangePinForm
              onSave={handlePin}
              onSkip={() => dispatch(setStep('welcome'))}
              loading={loading}
              error={pinError}
            />
          )}
          {step === 'welcome' && <WelcomeStep />}
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

export default function CreateAccountPage() {
  return (
    <CreateAccountProvider>
      <CreateAccountInner />
    </CreateAccountProvider>
  );
}
