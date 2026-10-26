'use client';

import { useCallback, type FormEvent } from 'react';
import { Person } from '@arcus/core';
import { useAppDispatch } from '@/store/hooks';
import { AccountService } from '@arcus/core/services';
import auth from '@arcus/core/auth';
import { loginSuccess } from '@/store/slices/authSlice';
import { initializeCoreConfig } from '@/store/thunks/initConfig';
import type { SessionCreatedEvent, Account } from '@/arcus/types';
import { useCreateAccount } from './CreateAccountContext';
import FormField from './FormField';

export default function CredentialsStep() {
  const { state, dispatch, credForm } = useCreateAccount();
  const reduxDispatch = useAppDispatch();

  const { email, password, confirmPassword, firstName, lastName, phone, optIn, loading } = state;
  const allValues = { email, password, confirmPassword, firstName, lastName };

  const handleSubmit = useCallback(
    async (ev: FormEvent) => {
      ev.preventDefault();
      if (!credForm.formValidates(['email', 'password', 'confirmPassword', 'firstName', 'lastName'], allValues)) return;

      dispatch({ type: 'SET_LOADING', loading: true });
      dispatch({ type: 'CLEAR_ERROR' });

      try {
        await initializeCoreConfig();

        const result = await AccountService.CreateAccount({
          email,
          password,
          optin: optIn ? 'true' : 'false',
          person: {
            [Person.ATTR_FIRSTNAME]: firstName,
            [Person.ATTR_LASTNAME]: lastName,
            [Person.ATTR_MOBILENUMBER]: phone || undefined,
            [Person.ATTR_EMAIL]: email,
          },
          place: {},
        });

        const sessionData = await new Promise<SessionCreatedEvent>((resolve, reject) => {
          const onSuccess = (data: SessionCreatedEvent) => {
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

        const pId = (sessionData[Person.ATTR_CURRPLACE] as string) ?? (result['placeId'] as string);

        reduxDispatch(loginSuccess({ person: sessionData, account: (result['account'] as Account) ?? ({} as Account) }));
        dispatch({ type: 'ACCOUNT_CREATED', personData: sessionData, placeId: pId });
      } catch {
        dispatch({ type: 'SET_ERROR', error: 'Failed to create account. The email may already be in use.' });
      } finally {
        dispatch({ type: 'SET_LOADING', loading: false });
      }
    },
    [email, password, confirmPassword, firstName, lastName, phone, optIn, credForm, dispatch, reduxDispatch, allValues],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <div className="grid grid-cols-2 gap-3">
        <FormField
          label="First Name" id="firstName" value={firstName}
          onChange={(v) => dispatch({ type: 'SET_FIELD', field: 'firstName', value: v })}
          form={credForm} allValues={allValues}
        />
        <FormField
          label="Last Name" id="lastName" value={lastName}
          onChange={(v) => dispatch({ type: 'SET_FIELD', field: 'lastName', value: v })}
          form={credForm} allValues={allValues}
        />
      </div>
      <FormField
        label="Email" id="email" type="email" autoComplete="email"
        value={email}
        onChange={(v) => dispatch({ type: 'SET_FIELD', field: 'email', value: v })}
        form={credForm} allValues={allValues}
      />
      <FormField
        label="Phone (optional)" id="phone" type="tel" autoComplete="tel"
        value={phone}
        onChange={(v) => dispatch({ type: 'SET_FIELD', field: 'phone', value: v })}
      />
      <FormField
        label="Password" id="password" type="password" autoComplete="new-password"
        value={password}
        onChange={(v) => dispatch({ type: 'SET_FIELD', field: 'password', value: v })}
        form={credForm} allValues={allValues}
      />
      <FormField
        label="Confirm Password" id="confirmPassword" type="password" autoComplete="new-password"
        value={confirmPassword}
        onChange={(v) => dispatch({ type: 'SET_FIELD', field: 'confirmPassword', value: v })}
        form={credForm} allValues={allValues}
      />
      <label className="flex items-center gap-2 text-sm text-coot">
        <input
          type="checkbox"
          data-testid="create-account-optin"
          checked={optIn}
          onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'optIn', value: e.target.checked })}
          className="accent-peacock"
        />
        Keep me up to date with news and offers
      </label>
      <button
        type="submit"
        data-testid="create-account-submit"
        disabled={loading}
        className="w-full py-2.5 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90 disabled:opacity-50"
      >
        {loading ? 'Creating Account\u2026' : 'Create Account'}
      </button>
    </form>
  );
}
