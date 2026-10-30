'use client';

import { useCallback, useMemo, type FormEvent } from 'react';
import { Base, Place } from '@arcus/core';
import Bridge from '@arcus/core/bridge';
import { useCreateAccount } from './CreateAccountContext';
import { setField, setStep, setLoading, setError, clearError } from './createAccountSlice';
import FormField from './FormField';

export default function AddressStep() {
  const { state, dispatch, addrForm } = useCreateAccount();

  const { street1, street2, city, state: addrState, zip, placeId, loading } = state;
  const allValues = useMemo(() => ({ street1, city, state: addrState, zip }), [street1, city, addrState, zip]);

  const handleSubmit = useCallback(
    async (ev: FormEvent) => {
      ev.preventDefault();
      if (!addrForm.formValidates(['street1', 'city', 'state', 'zip'], allValues)) return;

      if (!placeId) {
        dispatch(setStep('pin'));
        return;
      }

      dispatch(setLoading(true));
      dispatch(clearError());

      try {
        await Bridge.request(Base.CMD_SETATTRIBUTES, `SERV:place:${placeId}`, {
          [Place.ATTR_STREETADDRESS1]: street1,
          [Place.ATTR_STREETADDRESS2]: street2,
          [Place.ATTR_CITY]: city,
          [Place.ATTR_STATEPROV]: addrState,
          [Place.ATTR_ZIPCODE]: zip,
        });
        dispatch(setStep('pin'));
      } catch {
        dispatch(setError('Failed to save address. You can update it later in Settings.'));
        dispatch(setStep('pin'));
      } finally {
        dispatch(setLoading(false));
      }
    },
    [street1, street2, city, addrState, zip, placeId, addrForm, dispatch, allValues],
  );

  const handleSkip = useCallback(() => {
    dispatch(setStep('pin'));
  }, [dispatch]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <p className="text-sm text-grouse">Enter your home address for accurate weather and service information.</p>
      <FormField
        label="Street Address" id="street1" value={street1}
        onChange={(v) => dispatch(setField({ field: 'street1', value: v }))}
        form={addrForm} allValues={allValues}
      />
      <FormField
        label="Street Address 2 (optional)" id="street2" value={street2}
        onChange={(v) => dispatch(setField({ field: 'street2', value: v }))}
      />
      <div className="grid grid-cols-3 gap-3">
        <FormField
          label="City" id="city" value={city}
          onChange={(v) => dispatch(setField({ field: 'city', value: v }))}
          form={addrForm} allValues={allValues}
        />
        <FormField
          label="State" id="state" value={addrState}
          onChange={(v) => dispatch(setField({ field: 'state', value: v }))}
          form={addrForm} allValues={allValues}
        />
        <FormField
          label="ZIP" id="zip" value={zip}
          onChange={(v) => dispatch(setField({ field: 'zip', value: v }))}
          form={addrForm} allValues={allValues}
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          data-testid="address-save"
          disabled={loading}
          className="flex-1 py-2.5 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90 disabled:opacity-50"
        >
          {loading ? 'Saving\u2026' : 'Save Address'}
        </button>
        <button
          type="button"
          data-testid="address-skip"
          onClick={handleSkip}
          className="px-4 py-2.5 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon"
        >
          Skip
        </button>
      </div>
    </form>
  );
}
