/**
 * Form validation hook — ports the FormViewModel validation pattern.
 *
 * Replaces the CanJS FormViewModel from src/components/form/form.js.
 * Uses the same validation rules (presence, email, length, custom validators)
 * but in a React-friendly hook pattern.
 */

import { useState, useCallback, useMemo } from 'react';
import { usPhoneDigits } from '@/lib/phoneNumber';

// ── Validation rule types ─────────────────────────────────────────────

interface PresenceRule {
  presence: true;
}

interface EmailRule {
  email: { message?: string };
}

interface LengthRule {
  length: { minimum?: number; maximum?: number; message?: string };
}

interface EqualityRule {
  equality: { attribute: string; message?: string };
}

interface ExclusionRule {
  exclusion: { within: string[]; message?: string };
}

interface CustomRule {
  oneLetterOneNumber?: true;
  noSpaces?: true;
  /**
   * A US phone number: only digits, spaces, dashes, dots, parentheses and a leading +, with 10 digits
   * or 11 starting with 1 (what the platform accepts for `person:mobileNumber`).
   */
  phoneNumber?: true;
}

type ValidationRule = Partial<
  PresenceRule & EmailRule & LengthRule & EqualityRule & ExclusionRule & CustomRule
>;

export type ValidationConstraints = Record<string, ValidationRule>;

export interface FormValidationState {
  errors: Record<string, string[]>;
  visited: Record<string, boolean>;
  changed: Record<string, boolean>;
}

// ── Validation logic ──────────────────────────────────────────────────

function validateField(
  field: string,
  value: string | undefined,
  rule: ValidationRule,
  allValues: Record<string, string>,
): string[] {
  const errors: string[] = [];

  if (rule.presence && (!value || value.trim() === '')) {
    errors.push("can't be blank");
    return errors; // Skip other validations if empty and required
  }

  if (!value || value.trim() === '') return errors; // Skip validations for empty optional fields

  if (rule.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      errors.push(rule.email.message ?? 'is invalid');
    }
  }

  if (rule.length) {
    if (rule.length.minimum && value.length < rule.length.minimum) {
      errors.push(rule.length.message ?? `must be at least ${rule.length.minimum} characters`);
    }
    if (rule.length.maximum && value.length > rule.length.maximum) {
      errors.push(rule.length.message ?? `must be at most ${rule.length.maximum} characters`);
    }
  }

  if (rule.exclusion) {
    if (rule.exclusion.within.includes(value)) {
      errors.push(rule.exclusion.message ?? 'is not allowed');
    }
  }

  if (rule.oneLetterOneNumber) {
    if (!value.match(/\d+/g) || !value.match(/[A-Za-z_]+/g)) {
      errors.push('must have at least 1 letter and 1 number');
    }
  }

  if (rule.noSpaces) {
    if (value.includes(' ')) {
      errors.push('cannot use spaces');
    }
  }

  if (rule.phoneNumber) {
    if (!usPhoneDigits(value)) {
      errors.push('must be a valid phone number');
    }
  }

  if (rule.equality) {
    const otherValue = allValues[rule.equality.attribute];
    if (value !== otherValue) {
      errors.push(
        rule.equality.message?.replace('^', '') ?? `must match ${rule.equality.attribute}`,
      );
    }
  }

  return errors;
}

/**
 * Validate `fields` against `constraints` without touching any form state.
 * Returns the errors of each failing field; fields without a rule are skipped.
 */
export function validateFields(
  constraints: ValidationConstraints,
  fields: string[],
  values: Record<string, string>,
): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  for (const field of fields) {
    const rule = constraints[field];
    if (!rule) continue;
    const fieldErrors = validateField(field, values[field], rule, values);
    if (fieldErrors.length > 0) errors[field] = fieldErrors;
  }
  return errors;
}

// ── Hook ──────────────────────────────────────────────────────────────

export function useFormValidation(constraints: ValidationConstraints) {
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [visited, setVisited] = useState<Record<string, boolean>>({});
  const [changed, setChanged] = useState<Record<string, boolean>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const markVisited = useCallback((field: string) => {
    setVisited((prev) => ({ ...prev, [field]: true }));
  }, []);

  const markChanged = useCallback((field: string) => {
    setChanged((prev) => ({ ...prev, [field]: true }));
  }, []);

  /**
   * Validate a single field on blur.
   */
  const validateSingle = useCallback(
    (field: string, value: string, allValues: Record<string, string>) => {
      const rule = constraints[field];
      if (!rule) return;

      const fieldErrors = validateField(field, value, rule, allValues);
      setErrors((prev) => {
        const next = { ...prev };
        if (fieldErrors.length > 0) {
          next[field] = fieldErrors;
        } else {
          delete next[field];
        }

        // Also re-validate fields that depend on this one via equality
        for (const [otherField, otherRule] of Object.entries(constraints)) {
          if (
            otherRule.equality?.attribute === field &&
            visited[otherField]
          ) {
            const otherErrors = validateField(
              otherField,
              allValues[otherField],
              otherRule,
              allValues,
            );
            if (otherErrors.length > 0) {
              next[otherField] = otherErrors;
            } else {
              delete next[otherField];
            }
          }
        }

        return next;
      });
    },
    [constraints, visited],
  );

  /**
   * Validate specified fields (or all constrained fields).
   * Returns true if validation passes.
   */
  const formValidates = useCallback(
    (fields: string[], values: Record<string, string>): boolean => {
      const fieldsToValidate =
        fields.length > 0 ? fields : Object.keys(constraints);

      const newErrors = validateFields(constraints, fieldsToValidate, values);
      const hasErrors = Object.keys(newErrors).length > 0;

      setErrors((prev) => {
        const next = { ...prev };
        // Clear previous errors for validated fields
        for (const field of fieldsToValidate) {
          delete next[field];
        }
        // Set new errors
        return { ...next, ...newErrors };
      });
      // A submit attempt counts as visiting every field, so untouched fields show their errors.
      setVisited((prev) => ({
        ...prev,
        ...Object.fromEntries(fieldsToValidate.map((field) => [field, true])),
      }));

      return !hasErrors;
    },
    [constraints],
  );

  /**
   * Check if specific fields have changes.
   */
  const hasChanges = useCallback(
    (fields: string[]): boolean => {
      return fields.some((f) => changed[f]);
    },
    [changed],
  );

  /**
   * Check if specific fields have errors.
   */
  const hasErrors = useCallback(
    (fields?: string[]): boolean => {
      if (!fields) return Object.keys(errors).length > 0;
      return fields.some((f) => errors[f] && errors[f].length > 0);
    },
    [errors],
  );

  /**
   * Get error messages for a specific field.
   */
  const getFieldErrors = useCallback(
    (field: string): string[] => {
      return errors[field] ?? [];
    },
    [errors],
  );

  /**
   * Reset the form state.
   */
  const resetForm = useCallback(() => {
    setErrors({});
    setVisited({});
    setChanged({});
    setFormError(null);
  }, []);

  return useMemo(
    () => ({
      errors,
      visited,
      changed,
      formError,
      setFormError,
      markVisited,
      markChanged,
      validateSingle,
      formValidates,
      hasChanges,
      hasErrors,
      getFieldErrors,
      resetForm,
    }),
    [
      errors,
      visited,
      changed,
      formError,
      markVisited,
      markChanged,
      validateSingle,
      formValidates,
      hasChanges,
      hasErrors,
      getFieldErrors,
      resetForm,
    ],
  );
}
