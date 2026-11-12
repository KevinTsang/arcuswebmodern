'use client';

import { createContext, useContext, useReducer, type ReactNode } from 'react';
import { useFormValidation, type ValidationConstraints } from '@/hooks/useFormValidation';
import { NEW_LOGIN_CONSTRAINTS } from '@/lib/validationRules';
import { initialState, type CreateAccountState } from './types';
import { createAccountReducer, type CreateAccountAction } from './createAccountSlice';

// ── Validation constraints ───────────────────────────────────────


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
  // Sign-up checks the same login and person fields as accepting an invitation.
  const credForm = useFormValidation(NEW_LOGIN_CONSTRAINTS);
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
