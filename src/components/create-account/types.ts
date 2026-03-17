import type { SessionCreatedEvent } from '@/arcus/types';

export type Step = 'credentials' | 'address' | 'pin' | 'welcome';

export const STEPS: Step[] = ['credentials', 'address', 'pin', 'welcome'];

export const STEP_LABELS: Record<Step, string> = {
  credentials: 'Account',
  address: 'Address',
  pin: 'PIN Code',
  welcome: 'Welcome',
};

// ── State ─────────────────────────────────────────────────────────

export interface CreateAccountState {
  step: Step;
  loading: boolean;
  error: string;

  // Credentials
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone: string;
  optIn: boolean;

  // Address
  street1: string;
  street2: string;
  city: string;
  state: string;
  zip: string;

  // API response data persisted across steps
  personData: SessionCreatedEvent | null;
  placeId: string | null;
  pinError: string | null;
}

export const initialState: CreateAccountState = {
  step: 'credentials',
  loading: false,
  error: '',

  email: '',
  password: '',
  confirmPassword: '',
  firstName: '',
  lastName: '',
  phone: '',
  optIn: false,

  street1: '',
  street2: '',
  city: '',
  state: '',
  zip: '',

  personData: null,
  placeId: null,
  pinError: null,
};

// ── Actions ───────────────────────────────────────────────────────

/** String form fields that SET_FIELD can target. */
type FormStringField =
  | 'email' | 'password' | 'confirmPassword'
  | 'firstName' | 'lastName' | 'phone'
  | 'street1' | 'street2' | 'city' | 'state' | 'zip';

type FormBooleanField = 'optIn';

export type CreateAccountAction =
  | { type: 'SET_FIELD'; field: FormStringField; value: string }
  | { type: 'SET_FIELD'; field: FormBooleanField; value: boolean }
  | { type: 'SET_STEP'; step: Step }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'ACCOUNT_CREATED'; personData: SessionCreatedEvent; placeId: string | null }
  | { type: 'SET_PIN_ERROR'; pinError: string | null };

// ── Reducer ───────────────────────────────────────────────────────

export function createAccountReducer(
  state: CreateAccountState,
  action: CreateAccountAction,
): CreateAccountState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SET_STEP':
      return { ...state, step: action.step };
    case 'SET_LOADING':
      return { ...state, loading: action.loading, ...(action.loading ? { pinError: null } : {}) };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'CLEAR_ERROR':
      return { ...state, error: '' };
    case 'ACCOUNT_CREATED':
      return { ...state, personData: action.personData, placeId: action.placeId, step: 'address' };
    case 'SET_PIN_ERROR':
      return { ...state, pinError: action.pinError };
    default:
      return state;
  }
}
