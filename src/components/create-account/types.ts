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

// ── Field names (payload of `setField`) ───────────────────────────

/** String form fields `setField` can target. */
export type FormStringField =
  | 'email' | 'password' | 'confirmPassword'
  | 'firstName' | 'lastName' | 'phone'
  | 'street1' | 'street2' | 'city' | 'state' | 'zip';

export type FormBooleanField = 'optIn';
