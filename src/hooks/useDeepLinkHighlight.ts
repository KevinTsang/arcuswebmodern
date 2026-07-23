'use client';

/**
 * useDeepLinkHighlight — scroll to and briefly highlight a list item named by
 * a URL query param (e.g. `/devices?device=<address>` from the dashboard
 * favorites card).
 *
 * Register each item's element with `registerItem(key)` and style it when
 * `highlighted === key`. The target is handled once per value — it won't
 * re-fire on unrelated list updates, but it will retry once the list has
 * grown to include the target (pass the item count so the effect re-checks
 * when items load in).
 *
 * Usage:
 *   const { highlighted, registerItem } = useDeepLinkHighlight('device', items.length);
 *   <div ref={registerItem(item.id)} className={highlighted === item.id ? 'ring-2' : ''} />
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const DEFAULT_HIGHLIGHT_MS = 2000;

export function useDeepLinkHighlight(
  paramName: string,
  itemCount: number,
  highlightMs: number = DEFAULT_HIGHLIGHT_MS,
) {
  const searchParams = useSearchParams();
  const target = searchParams.get(paramName);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());
  const handledRef = useRef<string | null>(null);
  const [highlighted, setHighlighted] = useState<string | null>(null);

  const registerItem = useCallback(
    (key: string) => (el: HTMLElement | null) => {
      if (el) itemRefs.current.set(key, el);
      else itemRefs.current.delete(key);
    },
    [],
  );

  useEffect(() => {
    if (!target || handledRef.current === target) return;
    const el = itemRefs.current.get(target);
    if (!el) return;
    handledRef.current = target;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlighted(target);
    const timer = setTimeout(() => setHighlighted(null), highlightMs);
    return () => clearTimeout(timer);
  }, [target, itemCount, highlightMs]);

  return { highlighted, registerItem };
}
