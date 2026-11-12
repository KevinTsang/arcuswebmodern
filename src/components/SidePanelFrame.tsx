'use client';

/**
 * SidePanelFrame — the chrome around one side panel's content.
 *
 * Owns the panel header (title and the single close button) so panel
 * content never draws its own close control, and wraps the content in a
 * Suspense boundary so panels that suspend while loading show a shared
 * fallback beneath a header that stays visible. An error boundary around it
 * catches a panel that fails to render.
 *
 * Both boundaries are keyed by `panelKey`, so opening different content
 * mounts them fresh: the new content starts from its own state, shows the
 * loading fallback while it suspends, and any previous error is cleared.
 */

import { Suspense, type ReactNode } from 'react';
import { SidePanelErrorBoundary } from '@/components/SidePanelErrorBoundary';

interface SidePanelFrameProps {
  side: 'left' | 'right';
  title: ReactNode | null;
  /** Identity of the content; a new key remounts it and its boundaries. */
  panelKey: string | null;
  content: ReactNode | null;
  expanded: boolean;
  onClose: () => void;
}

export function SidePanelFrame({ side, title, panelKey, content, expanded, onClose }: SidePanelFrameProps) {
  const open = content !== null;
  const position = side === 'left' ? 'left-0' : 'right-0';
  const hidden = side === 'left' ? '-translate-x-full' : 'translate-x-full';

  return (
    <div
      className={`
        fixed top-0 ${position} h-full bg-crane shadow-xl z-[var(--z-modal)]
        transition-transform duration-300 ease-in-out overflow-y-auto
        ${expanded ? 'w-[600px]' : 'w-[380px]'}
        ${open ? 'translate-x-0' : hidden}
      `}
    >
      {open && (
        <>
          <div className="flex items-center justify-between gap-4 px-6 pt-4">
            {title ? (
              <h3 data-testid={`side-panel-${side}-title`} className="text-lg font-semibold text-swift">
                {title}
              </h3>
            ) : (
              <span />
            )}
            <button
              onClick={onClose}
              data-testid={`side-panel-${side}-close`}
              className="text-2xl text-grouse hover:text-swift"
              aria-label="Close panel"
            >
              &times;
            </button>
          </div>
          <div data-testid={`side-panel-${side}`} className="p-6 pt-4">
            <SidePanelErrorBoundary key={panelKey} testId={`side-panel-${side}-error`}>
              <Suspense
                fallback={
                  <p data-testid={`side-panel-${side}-loading`} className="text-sm text-grouse">
                    Loading…
                  </p>
                }
              >
                {content}
              </Suspense>
            </SidePanelErrorBoundary>
          </div>
        </>
      )}
    </div>
  );
}
