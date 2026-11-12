/**
 * Validation rules shared by the forms that collect a person's login and
 * contact details: sign-up, accepting an invitation, password reset and the
 * contact info panel. Each form builds its own constraint map from these,
 * since the forms name their fields differently (`firstName` on sign-up,
 * `person:firstName` in the contact panel).
 */

import type { ValidationConstraints, ValidationRule } from '@/hooks/useFormValidation';

/** A required email address. */
export const EMAIL_RULE: ValidationRule = { presence: true, email: { message: 'is invalid' } };

/** A new password: at least 8 characters, with a letter and a number, and no spaces. */
export const NEW_PASSWORD_RULE: ValidationRule = {
  presence: true,
  length: { minimum: 8, message: 'must be at least 8 characters' },
  oneLetterOneNumber: true,
  noSpaces: true,
};

/** A required confirmation that must match the password in the field named `passwordField`. */
export function confirmPasswordRule(passwordField: string): ValidationRule {
  return { presence: true, equality: { attribute: passwordField, message: '^Passwords do not match' } };
}

/** A required first or last name. */
export const NAME_RULE: ValidationRule = { presence: true };

/** An optional US phone number. An empty field passes; anything else must be a phone number. */
export const PHONE_RULE: ValidationRule = { phoneNumber: true };

/** A required US phone number. */
export const REQUIRED_PHONE_RULE: ValidationRule = { presence: true, phoneNumber: true };

/** The login and person fields a new user fills in, on sign-up and when accepting an invitation. */
export const NEW_LOGIN_CONSTRAINTS: ValidationConstraints = {
  email: EMAIL_RULE,
  password: NEW_PASSWORD_RULE,
  confirmPassword: confirmPasswordRule('password'),
  firstName: NAME_RULE,
  lastName: NAME_RULE,
  phone: PHONE_RULE,
};

/** The fields `NEW_LOGIN_CONSTRAINTS` checks, for `formValidates`. */
export const NEW_LOGIN_FIELDS = Object.keys(NEW_LOGIN_CONSTRAINTS);
