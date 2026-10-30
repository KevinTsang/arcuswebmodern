'use client';

import { createContext, useContext, useReducer, type ReactNode } from 'react';
import { useFormValidation, type ValidationConstraints } from '@/hooks/useFormValidation';
import { initialState, type CreateAccountState } from './types';
import { createAccountReducer, type CreateAccountAction } from './createAccountSlice';

// ── Validation constraints ───────────────────────────────────────

export const CREDENTIALS_CONSTRAINTS: ValidationConstraints = {
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

export const ADDRESS_CONSTRAINTS: ValidationConstraints = {
  street1: { presence: true },
  city: { presence: true },
  state: { presence: true },
  zip: { presence: true },
};

// ── Context ──────────────────────────────────────────────────────

interface CreateAccountContextValue {
  state: CreateAccountState;
  dispatch: React.Dispatch<CreateAccountAction>;
  credForm: ReturnType<typeof useFormValidation>;
  addrForm: ReturnType<typeof useFormValidation>;
}

const CreateAccountContext = createContext<CreateAccountContextValue | null>(null);

export function CreateAccountProvider({ children, initialStateOverride }: { children: ReactNode; initialStateOverride?: Partial<CreateAccountState> }) {
  const [state, dispatch] = useReducer(createAccountReducer, { ...initialState, ...initialStateOverride });
  const credForm = useFormValidation(CREDENTIALS_CONSTRAINTS);
  const addrForm = useFormValidation(ADDRESS_CONSTRAINTS);

  return (
    <CreateAccountContext.Provider value={{ state, dispatch, credForm, addrForm }}>
      {children}
    </CreateAccountContext.Provider>
  );
}

export function useCreateAccount() {
  const ctx = useContext(CreateAccountContext);
  if (!ctx) throw new Error('useCreateAccount must be used within CreateAccountProvider');
  return ctx;
}
