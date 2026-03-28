import {
  PERMISSION_CATEGORIES,
  emptyPermSet,
  isAllPerms,
  permSetToStrings,
  stringsToPermSet,
  hasAnyPermission,
} from '@/components/api-keys/permissions';

describe('emptyPermSet', () => {
  it('creates an entry for every category', () => {
    const perms = emptyPermSet();
    for (const cat of PERMISSION_CATEGORIES) {
      expect(perms[cat.key]).toEqual({ r: false, w: false, x: false });
    }
  });

  it('returns a new object each time', () => {
    const a = emptyPermSet();
    const b = emptyPermSet();
    expect(a).not.toBe(b);
  });
});

describe('isAllPerms', () => {
  it('returns true when all flags are true', () => {
    expect(isAllPerms({ r: true, w: true, x: true })).toBe(true);
  });

  it('returns false when any flag is false', () => {
    expect(isAllPerms({ r: true, w: true, x: false })).toBe(false);
    expect(isAllPerms({ r: false, w: true, x: true })).toBe(false);
    expect(isAllPerms({ r: true, w: false, x: true })).toBe(false);
  });

  it('returns false when all flags are false', () => {
    expect(isAllPerms({ r: false, w: false, x: false })).toBe(false);
  });
});

describe('permSetToStrings', () => {
  it('returns empty array for empty perm set', () => {
    expect(permSetToStrings(emptyPermSet())).toEqual([]);
  });

  it('returns individual permissions for partial flags', () => {
    const perms = emptyPermSet();
    perms.dev = { r: true, w: false, x: false };
    perms.scene = { r: false, w: false, x: true };
    const result = permSetToStrings(perms);
    expect(result).toContain('dev:r');
    expect(result).toContain('scene:x');
    expect(result).not.toContain('dev:w');
    expect(result).not.toContain('dev:x');
  });

  it('returns wildcard when all three flags are set', () => {
    const perms = emptyPermSet();
    perms.rule = { r: true, w: true, x: true };
    const result = permSetToStrings(perms);
    expect(result).toContain('rule:*');
    expect(result).not.toContain('rule:r');
    expect(result).not.toContain('rule:w');
    expect(result).not.toContain('rule:x');
  });

  it('handles mix of wildcard and individual permissions', () => {
    const perms = emptyPermSet();
    perms.dev = { r: true, w: true, x: true };
    perms.hub = { r: true, w: false, x: false };
    const result = permSetToStrings(perms);
    expect(result).toContain('dev:*');
    expect(result).toContain('hub:r');
    expect(result).toHaveLength(2);
  });
});

describe('stringsToPermSet', () => {
  it('returns empty perm set for empty array', () => {
    const perms = stringsToPermSet([]);
    for (const cat of PERMISSION_CATEGORIES) {
      expect(perms[cat.key]).toEqual({ r: false, w: false, x: false });
    }
  });

  it('parses individual permissions', () => {
    const perms = stringsToPermSet(['dev:r', 'scene:x']);
    expect(perms.dev).toEqual({ r: true, w: false, x: false });
    expect(perms.scene).toEqual({ r: false, w: false, x: true });
    expect(perms.rule).toEqual({ r: false, w: false, x: false });
  });

  it('parses category wildcard', () => {
    const perms = stringsToPermSet(['rule:*']);
    expect(perms.rule).toEqual({ r: true, w: true, x: true });
    expect(perms.dev).toEqual({ r: false, w: false, x: false });
  });

  it('parses global wildcard namespace with specific action', () => {
    const perms = stringsToPermSet(['*:r']);
    for (const cat of PERMISSION_CATEGORIES) {
      expect(perms[cat.key].r).toBe(true);
      expect(perms[cat.key].w).toBe(false);
      expect(perms[cat.key].x).toBe(false);
    }
  });

  it('parses full wildcard *:*', () => {
    const perms = stringsToPermSet(['*:*']);
    for (const cat of PERMISSION_CATEGORIES) {
      expect(perms[cat.key]).toEqual({ r: true, w: true, x: true });
    }
  });

  it('ignores unknown namespaces', () => {
    const perms = stringsToPermSet(['unknown:r', 'dev:w']);
    expect(perms.dev).toEqual({ r: false, w: true, x: false });
    expect(perms['unknown']).toBeUndefined();
  });

  it('merges multiple entries for the same namespace', () => {
    const perms = stringsToPermSet(['dev:r', 'dev:w']);
    expect(perms.dev).toEqual({ r: true, w: true, x: false });
  });
});

describe('hasAnyPermission', () => {
  it('returns false for empty perm set', () => {
    expect(hasAnyPermission(emptyPermSet())).toBe(false);
  });

  it('returns true when any single flag is set', () => {
    const perms = emptyPermSet();
    perms.hub = { r: false, w: true, x: false };
    expect(hasAnyPermission(perms)).toBe(true);
  });

  it('returns true when multiple categories have flags', () => {
    const perms = emptyPermSet();
    perms.dev = { r: true, w: false, x: false };
    perms.scene = { r: false, w: false, x: true };
    expect(hasAnyPermission(perms)).toBe(true);
  });
});

describe('round-trip: permSetToStrings -> stringsToPermSet', () => {
  it('preserves individual permissions', () => {
    const original = emptyPermSet();
    original.dev = { r: true, w: false, x: true };
    original.place = { r: false, w: true, x: false };
    const roundTripped = stringsToPermSet(permSetToStrings(original));
    for (const cat of PERMISSION_CATEGORIES) {
      expect(roundTripped[cat.key]).toEqual(original[cat.key]);
    }
  });

  it('preserves wildcard permissions', () => {
    const original = emptyPermSet();
    original.scene = { r: true, w: true, x: true };
    const roundTripped = stringsToPermSet(permSetToStrings(original));
    expect(roundTripped.scene).toEqual({ r: true, w: true, x: true });
  });
});
