import { validateFields } from '@/hooks/useFormValidation';
import {
  NEW_LOGIN_CONSTRAINTS,
  NEW_LOGIN_FIELDS,
  NEW_PASSWORD_RULE,
  REQUIRED_PHONE_RULE,
  SECURITY_ANSWER_RULE,
  confirmEmailRule,
  confirmPasswordRule,
} from '@/lib/validationRules';

// ── Helpers ───────────────────────────────────────────────────────────

const VALID_LOGIN = {
  email: 'jane@example.com',
  password: 'password1',
  confirmPassword: 'password1',
  firstName: 'Jane',
  lastName: 'Doe',
  phone: '',
};

function newLoginErrors(overrides: Partial<typeof VALID_LOGIN> = {}) {
  return validateFields(NEW_LOGIN_CONSTRAINTS, NEW_LOGIN_FIELDS, { ...VALID_LOGIN, ...overrides });
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('NEW_LOGIN_CONSTRAINTS', () => {
  it('accepts a complete login with no phone', () => {
    expect(newLoginErrors()).toEqual({});
  });

  it('checks every field it defines', () => {
    expect(NEW_LOGIN_FIELDS).toEqual(['email', 'password', 'confirmPassword', 'firstName', 'lastName', 'phone']);
  });

  it('requires both names', () => {
    expect(Object.keys(newLoginErrors({ firstName: '', lastName: ' ' }))).toEqual(['firstName', 'lastName']);
  });

  it('rejects an invalid email', () => {
    expect(newLoginErrors({ email: 'jane@' }).email).toEqual(['is invalid']);
  });

  it('accepts a US phone number in any common format', () => {
    for (const phone of ['5551234567', '(555) 123-4567', '555.123.4567', '+1 555 123 4567']) {
      expect(newLoginErrors({ phone })).toEqual({});
    }
  });

  it('rejects a phone that is not a US number', () => {
    expect(newLoginErrors({ phone: '555-123' }).phone).toEqual(['must be a valid phone number']);
  });

  it('rejects a confirmation that does not match', () => {
    expect(newLoginErrors({ confirmPassword: 'password2' }).confirmPassword).toEqual(['Passwords do not match']);
  });
});

describe('NEW_PASSWORD_RULE', () => {
  function passwordErrors(password: string) {
    return validateFields({ password: NEW_PASSWORD_RULE }, ['password'], { password }).password ?? [];
  }

  it('accepts 8+ characters with a letter and a number', () => {
    expect(passwordErrors('password1')).toEqual([]);
  });

  it('rejects a short password', () => {
    expect(passwordErrors('pass1')).toContain('must be at least 8 characters');
  });

  it('requires a letter and a number', () => {
    expect(passwordErrors('passwordonly')).toContain('must have at least 1 letter and 1 number');
  });

  it('rejects spaces', () => {
    expect(passwordErrors('pass word1')).toContain('cannot use spaces');
  });
});

describe('confirmPasswordRule', () => {
  it('compares against the named password field', () => {
    const constraints = { confirmPassword: confirmPasswordRule('newPassword') };
    expect(validateFields(constraints, ['confirmPassword'], { newPassword: 'abc', confirmPassword: 'abc' })).toEqual({});
    expect(validateFields(constraints, ['confirmPassword'], { newPassword: 'abc', confirmPassword: 'xyz' })).toEqual({
      confirmPassword: ['Passwords do not match'],
    });
  });
});

describe('REQUIRED_PHONE_RULE', () => {
  it('rejects an empty phone, unlike the optional rule', () => {
    expect(validateFields({ phone: REQUIRED_PHONE_RULE }, ['phone'], { phone: '' })).toEqual({ phone: ["can't be blank"] });
  });
});

describe('SECURITY_ANSWER_RULE', () => {
  const errors = (answer: string) => validateFields({ answer: SECURITY_ANSWER_RULE }, ['answer'], { answer });

  it('requires an answer', () => {
    expect(errors('  ')).toEqual({ answer: ["can't be blank"] });
  });

  it('accepts any answer', () => {
    expect(errors('Rex')).toEqual({});
  });
});

describe('confirmEmailRule', () => {
  const constraints = { email: { presence: true as const }, confirmEmail: confirmEmailRule('email') };
  const errors = (email: string, confirmEmail: string) =>
    validateFields(constraints, ['confirmEmail'], { email, confirmEmail });

  it('accepts a matching confirmation', () => {
    expect(errors('a@b.co', 'a@b.co')).toEqual({});
  });

  it('rejects a different confirmation', () => {
    expect(errors('a@b.co', 'c@d.co')).toEqual({ confirmEmail: ['Emails do not match'] });
  });

  it('requires the confirmation', () => {
    expect(errors('a@b.co', '')).toEqual({ confirmEmail: ["can't be blank"] });
  });
});
