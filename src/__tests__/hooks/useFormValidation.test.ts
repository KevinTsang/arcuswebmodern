import { renderHook, act } from '@testing-library/react';
import { useFormValidation, type ValidationConstraints } from '@/hooks/useFormValidation';

describe('useFormValidation', () => {
  const constraints: ValidationConstraints = {
    email: { presence: true, email: {} },
    password: { presence: true, length: { minimum: 8 }, oneLetterOneNumber: true, noSpaces: true },
    confirmPassword: { presence: true, equality: { attribute: 'password', message: '^Passwords must match' } },
  };

  it('starts with no errors', () => {
    const { result } = renderHook(() => useFormValidation(constraints));
    expect(result.current.errors).toEqual({});
    expect(result.current.hasErrors()).toBe(false);
  });

  it('formValidates detects missing required fields', () => {
    const { result } = renderHook(() => useFormValidation(constraints));
    let valid: boolean;
    act(() => {
      valid = result.current.formValidates(
        ['email', 'password'],
        { email: '', password: '', confirmPassword: '' },
      );
    });
    expect(valid!).toBe(false);
    expect(result.current.errors['email']).toContain("can't be blank");
    expect(result.current.errors['password']).toContain("can't be blank");
  });

  it('validates email format', () => {
    const { result } = renderHook(() => useFormValidation(constraints));
    act(() => {
      result.current.formValidates(['email'], { email: 'notanemail', password: '', confirmPassword: '' });
    });
    expect(result.current.errors['email']).toContain('is invalid');
  });

  it('accepts valid email', () => {
    const { result } = renderHook(() => useFormValidation(constraints));
    act(() => {
      result.current.formValidates(['email'], { email: 'test@example.com', password: '', confirmPassword: '' });
    });
    expect(result.current.errors['email']).toBeUndefined();
  });

  it('validates password length', () => {
    const { result } = renderHook(() => useFormValidation(constraints));
    act(() => {
      result.current.formValidates(['password'], { email: '', password: 'Ab1', confirmPassword: '' });
    });
    expect(result.current.errors['password']).toContain('must be at least 8 characters');
  });

  it('validates password requires letter and number', () => {
    const { result } = renderHook(() => useFormValidation(constraints));
    act(() => {
      result.current.formValidates(['password'], { email: '', password: 'abcdefgh', confirmPassword: '' });
    });
    expect(result.current.errors['password']).toContain('must have at least 1 letter and 1 number');
  });

  it('validates no spaces in password', () => {
    const { result } = renderHook(() => useFormValidation(constraints));
    act(() => {
      result.current.formValidates(['password'], { email: '', password: 'pass word1', confirmPassword: '' });
    });
    expect(result.current.errors['password']).toContain('cannot use spaces');
  });

  describe('phoneNumber', () => {
    const phoneConstraints: ValidationConstraints = { phone: { presence: true, phoneNumber: true } };

    it.each(['5551234567', '(555) 123-4567', '555-123-4567'])('accepts %s', (phone) => {
      const { result } = renderHook(() => useFormValidation(phoneConstraints));
      let valid: boolean;
      act(() => {
        valid = result.current.formValidates(['phone'], { phone });
      });
      expect(valid!).toBe(true);
      expect(result.current.errors['phone']).toBeUndefined();
    });

    it.each(['555-1234', '15551234567', 'not a number'])('rejects %s', (phone) => {
      const { result } = renderHook(() => useFormValidation(phoneConstraints));
      let valid: boolean;
      act(() => {
        valid = result.current.formValidates(['phone'], { phone });
      });
      expect(valid!).toBe(false);
      expect(result.current.errors['phone']).toEqual(['must be a valid phone number']);
    });

    it('skips the format check for an empty optional phone', () => {
      const { result } = renderHook(() => useFormValidation({ phone: { phoneNumber: true } }));
      let valid: boolean;
      act(() => {
        valid = result.current.formValidates(['phone'], { phone: '' });
      });
      expect(valid!).toBe(true);
    });
  });

  it('validates password equality', () => {
    const { result } = renderHook(() => useFormValidation(constraints));
    act(() => {
      result.current.formValidates(
        ['confirmPassword'],
        { email: '', password: 'Abcdefg1', confirmPassword: 'different' },
      );
    });
    expect(result.current.errors['confirmPassword']).toContain('Passwords must match');
  });

  it('accepts valid form', () => {
    const { result } = renderHook(() => useFormValidation(constraints));
    let valid: boolean;
    act(() => {
      valid = result.current.formValidates(
        [],
        { email: 'test@example.com', password: 'Abcdefg1', confirmPassword: 'Abcdefg1' },
      );
    });
    expect(valid!).toBe(true);
    expect(result.current.hasErrors()).toBe(false);
  });

  it('markVisited and markChanged track field state', () => {
    const { result } = renderHook(() => useFormValidation(constraints));
    act(() => {
      result.current.markVisited('email');
      result.current.markChanged('email');
    });
    expect(result.current.visited['email']).toBe(true);
    expect(result.current.changed['email']).toBe(true);
    expect(result.current.hasChanges(['email'])).toBe(true);
    expect(result.current.hasChanges(['password'])).toBe(false);
  });

  it('resetForm clears everything', () => {
    const { result } = renderHook(() => useFormValidation(constraints));
    act(() => {
      result.current.formValidates([], { email: '', password: '', confirmPassword: '' });
      result.current.markVisited('email');
      result.current.markChanged('email');
    });
    expect(result.current.hasErrors()).toBe(true);

    act(() => {
      result.current.resetForm();
    });
    expect(result.current.errors).toEqual({});
    expect(result.current.visited).toEqual({});
    expect(result.current.changed).toEqual({});
    expect(result.current.formError).toBeNull();
  });

  it('getFieldErrors returns errors for a field', () => {
    const { result } = renderHook(() => useFormValidation(constraints));
    act(() => {
      result.current.formValidates(['email'], { email: '', password: '', confirmPassword: '' });
    });
    expect(result.current.getFieldErrors('email')).toContain("can't be blank");
    expect(result.current.getFieldErrors('password')).toEqual([]);
  });
});
