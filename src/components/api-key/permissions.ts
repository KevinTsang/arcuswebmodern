export const PERMISSION_CATEGORIES = [
  { key: 'dev', label: 'Devices' },
  { key: 'scene', label: 'Scenes' },
  { key: 'rule', label: 'Rules' },
  { key: 'scheduler', label: 'Schedulers' },
  { key: 'sub', label: 'Subsystems' },
  { key: 'hub', label: 'Hub' },
  { key: 'person', label: 'People' },
  { key: 'place', label: 'Place' },
] as const;

export type PermEntry = { r: boolean; w: boolean; x: boolean };
export type PermSet = Record<string, PermEntry>;

export function emptyPermSet(): PermSet {
  const perms: PermSet = {};
  for (const cat of PERMISSION_CATEGORIES) {
    perms[cat.key] = { r: false, w: false, x: false };
  }
  return perms;
}

export function isAllPerms(p: PermEntry): boolean {
  return p.r && p.w && p.x;
}

export function permSetToStrings(perms: PermSet): string[] {
  const result: string[] = [];
  for (const cat of PERMISSION_CATEGORIES) {
    const p = perms[cat.key];
    if (isAllPerms(p)) {
      result.push(`${cat.key}:*`);
    } else {
      if (p.r) result.push(`${cat.key}:r`);
      if (p.w) result.push(`${cat.key}:w`);
      if (p.x) result.push(`${cat.key}:x`);
    }
  }
  return result;
}

export function stringsToPermSet(permissions: string[]): PermSet {
  const perms = emptyPermSet();
  for (const p of permissions) {
    const [ns, action] = p.split(':');
    if (ns === '*') {
      for (const cat of PERMISSION_CATEGORIES) {
        if (action === 'r' || action === '*') perms[cat.key].r = true;
        if (action === 'w' || action === '*') perms[cat.key].w = true;
        if (action === 'x' || action === '*') perms[cat.key].x = true;
      }
    } else if (perms[ns]) {
      if (action === 'r' || action === '*') perms[ns].r = true;
      if (action === 'w' || action === '*') perms[ns].w = true;
      if (action === 'x' || action === '*') perms[ns].x = true;
    }
  }
  return perms;
}

export function hasAnyPermission(perms: PermSet): boolean {
  return PERMISSION_CATEGORIES.some((cat) => {
    const p = perms[cat.key];
    return p.r || p.w || p.x;
  });
}
