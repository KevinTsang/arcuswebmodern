'use client';

/**
 * Accordion — expandable panel sections.
 *
 * Replaces src/components/accordion/. Supports single or multi
 * panel expansion. First panel auto-opens by default.
 */

import { useState, useCallback, createContext, useContext, type ReactNode } from 'react';

interface AccordionContextValue {
  activeIds: Set<string>;
  toggle: (id: string) => void;
}

const AccordionContext = createContext<AccordionContextValue>({
  activeIds: new Set(),
  toggle: () => {},
});

interface AccordionProps {
  children: ReactNode;
  defaultOpen?: string;
  allowMultiple?: boolean;
}

export function Accordion({ children, defaultOpen, allowMultiple = false }: AccordionProps) {
  const [activeIds, setActiveIds] = useState<Set<string>>(
    defaultOpen ? new Set([defaultOpen]) : new Set(),
  );

  const toggle = useCallback(
    (id: string) => {
      setActiveIds((prev) => {
        const next = new Set(allowMultiple ? prev : []);
        if (prev.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [allowMultiple],
  );

  return (
    <AccordionContext.Provider value={{ activeIds, toggle }}>
      <div className="border border-heron rounded-[var(--border-radius-base)] divide-y divide-heron overflow-hidden">
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

interface AccordionPanelProps {
  id: string;
  title: string;
  icon?: string;
  children: ReactNode;
}

export function AccordionPanel({ id, title, icon, children }: AccordionPanelProps) {
  const { activeIds, toggle } = useContext(AccordionContext);
  const isOpen = activeIds.has(id);

  return (
    <div>
      <button
        onClick={() => toggle(id)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-pigeon/30 transition-colors"
      >
        {icon && <span className={`${icon} text-base text-grouse`} />}
        <span className="flex-1 text-sm font-medium text-swift">{title}</span>
        <span className={`text-grouse text-xs transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          &#9660;
        </span>
      </button>
      {isOpen && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
