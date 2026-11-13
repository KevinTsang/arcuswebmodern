'use client';

import { useCallback } from 'react';
import { Product } from '@arcus/core';
import type { PairingProduct } from '@/store/entityTypes';
import type { PairingInput } from '@/arcus/types';
import type { PairingStep } from './types';
import type { AppDispatch } from '@/store/store';
import { nextStep, prevStep, setFormValue } from '@/store/slices/pairingSlice';
import { isFormValid, type PairingFormValues } from '@/lib/cloudPairing';
import HubRegistrationSteps from './HubRegistrationSteps';
import { PairingForm } from './PairingForm';

interface StepsStageProps {
  product: PairingProduct | null;
  isHubPairing: boolean;
  steps: PairingStep[];
  currentStep: number;
  loading: boolean;
  hubId: string;
  /** Inputs a cloud product needs, shown on the last step. */
  form?: PairingInput[];
  formValues?: PairingFormValues;
  /** The product pairs by signing in to a vendor account. */
  isOAuth?: boolean;
  dispatch: AppDispatch;
  onStartSearch: () => void;
  onStartHubRegistration: () => void;
  onCancel: () => void;
}

export default function StepsStage({
  product,
  isHubPairing,
  steps,
  currentStep,
  loading,
  hubId,
  form = [],
  formValues = {},
  isOAuth = false,
  dispatch,
  onStartSearch,
  onStartHubRegistration,
  onCancel,
}: StepsStageProps) {
  const handleFormChange = useCallback((name: string, value: string) => {
    dispatch(setFormValue({ name, value }));
  }, [dispatch]);

  // Generic pairing: waiting for search to start
  if (!isHubPairing && !product) {
    return (
      <div className="text-center py-6">
        <div className="animate-pulse mb-4">
          <div className="w-16 h-16 bg-peacock/10 rounded-full flex items-center justify-center mx-auto">
            <span className="icon-app-devices text-2xl text-peacock" />
          </div>
        </div>
        <p className="text-sm text-grouse">Starting device search…</p>
        <button
          onClick={onCancel}
          className="mt-4 px-4 py-2 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon"
        >
          Cancel
        </button>
      </div>
    );
  }

  // Hub pairing: hub ID entry
  if (isHubPairing) {
    return (
      <HubRegistrationSteps
        hubId={hubId}
        dispatch={dispatch}
        loading={loading}
        onStartHubRegistration={onStartHubRegistration}
      />
    );
  }

  const vendor = product?.[Product.ATTR_VENDOR] ?? '';
  const continueLabel = isOAuth ? `Sign In${vendor ? ` to ${vendor}` : ''}` : 'Search for Device';
  const canContinue = isFormValid(form, formValues);
  const formFields = (
    <PairingForm form={form} values={formValues} onChange={handleFormChange} />
  );

  // Product pairing: instructions
  return (
    <div>
      <h3 className="text-lg font-semibold text-swift mb-4">Pairing Instructions</h3>
      {steps.length > 0 ? (
        <>
          <div data-testid="pairing-step" className="text-sm text-grouse mb-2">
            Step {currentStep + 1} of {steps.length}
          </div>
          <div data-testid="pairing-instructions" className="bg-pigeon/30 rounded-[var(--border-radius-base)] p-4 mb-4 min-h-[100px]">
            {steps[currentStep]?.instructions?.map((inst, i) => (
              <p key={i} className="text-sm text-swift mb-2 last:mb-0">
                {inst}
              </p>
            ))}
          </div>
          {currentStep === steps.length - 1 && formFields}
          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                onClick={() => dispatch(prevStep())}
                data-testid="pairing-prev"
                className="px-4 py-2 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon"
              >
                Previous
              </button>
            )}
            {currentStep < steps.length - 1 ? (
              <button
                onClick={() => dispatch(nextStep())}
                data-testid="pairing-next"
                className="px-4 py-2 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90"
              >
                Next
              </button>
            ) : (
              <button
                onClick={onStartSearch}
                data-testid="pairing-search"
                disabled={!canContinue}
                className="px-4 py-2 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90 disabled:opacity-50"
              >
                {continueLabel}
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-4">
          <p className="text-sm text-grouse mb-4">
            {isOAuth
              ? `Sign in to your ${vendor || 'vendor'} account to connect your devices.`
              : 'Follow the manufacturer instructions to put your device in pairing mode, then click below.'}
          </p>
          <div className="text-left">{formFields}</div>
          <button
            onClick={onStartSearch}
            data-testid="pairing-search"
            disabled={loading || !canContinue}
            className="px-6 py-2.5 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90 disabled:opacity-50"
          >
            {loading ? 'Starting…' : continueLabel}
          </button>
        </div>
      )}
    </div>
  );
}
