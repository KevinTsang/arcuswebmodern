'use client';

/**
 * SidePanel — slide-out panel system.
 *
 * Replaces src/plugins/side-panel.js. Instead of storing rendered Stache
 * templates in AppState, this uses React's component model: the panel
 * content is a React element stored in a context/state, and the panel
 * component renders it with slide animation.
 *
 * Usage from any component:
 *   import { useSidePanel } from '@/components/SidePanel';
 *   const { openRight, closeRight } = useSidePanel();
 *   openRight(<MyComponent />);
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';

// ── Context ───────────────────────────────────────────────────────────

interface SidePanelState {
  leftContent: ReactNode | null;
  rightContent: ReactNode | null;
  leftExpanded: boolean;
  rightExpanded: boolean;
  /** Changes on every open, so the overlay remounts the content. */
  leftKey: number;
  rightKey: number;
}

interface SidePanelActions {
  openLeft: (content: ReactNode) => void;
  openRight: (content: ReactNode) => void;
  closeLeft: () => void;
  closeRight: () => void;
  close: () => void;
  expandLeft: () => void;
  expandRight: () => void;
  contractLeft: () => void;
  contractRight: () => void;
}

type SidePanelContextValue = SidePanelState & SidePanelActions;

const SidePanelContext = createContext<SidePanelContextValue | null>(null);

export function useSidePanel(): SidePanelContextValue {
  const ctx = useContext(SidePanelContext);
  if (!ctx) {
    throw new Error('useSidePanel must be used within a SidePanelProvider');
  }
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────

export function SidePanelProvider({ children }: { children: ReactNode }) {
  const [leftContent, setLeftContent] = useState<ReactNode | null>(null);
  const [rightContent, setRightContent] = useState<ReactNode | null>(null);
  const [leftExpanded, setLeftExpanded] = useState(false);
  const [rightExpanded, setRightExpanded] = useState(false);
  // Bumped on every open so each open mounts fresh content. Without it,
  // opening a panel of the same type (e.g. Edit on a second place card)
  // reuses the first instance and keeps its form state, so Save writes the
  // first item's values onto the second.
  const [leftKey, setLeftKey] = useState(0);
  const [rightKey, setRightKey] = useState(0);
  const pathname = usePathname();

  // Close panels on route change (matches original behavior in app.js page setter)
  useEffect(() => {
    setLeftContent(null);
    setRightContent(null);
    setLeftExpanded(false);
    setRightExpanded(false);
  }, [pathname]);

  const openLeft = useCallback((content: ReactNode) => {
    setLeftContent(content);
    setLeftKey((k) => k + 1);
  }, []);

  const openRight = useCallback((content: ReactNode) => {
    setRightContent(content);
    setRightKey((k) => k + 1);
  }, []);

  const closeLeft = useCallback(() => {
    setLeftContent(null);
    setLeftExpanded(false);
  }, []);

  const closeRight = useCallback(() => {
    setRightContent(null);
    setRightExpanded(false);
  }, []);

  const close = useCallback(() => {
    setLeftContent(null);
    setRightContent(null);
    setLeftExpanded(false);
    setRightExpanded(false);
  }, []);

  const expandLeft = useCallback(() => setLeftExpanded(true), []);
  const expandRight = useCallback(() => setRightExpanded(true), []);
  const contractLeft = useCallback(() => setLeftExpanded(false), []);
  const contractRight = useCallback(() => setRightExpanded(false), []);

  const value = useMemo<SidePanelContextValue>(
    () => ({
      leftContent,
      rightContent,
      leftExpanded,
      rightExpanded,
      leftKey,
      rightKey,
      openLeft,
      openRight,
      closeLeft,
      closeRight,
      close,
      expandLeft,
      expandRight,
      contractLeft,
      contractRight,
    }),
    [
      leftContent,
      rightContent,
      leftExpanded,
      rightExpanded,
      leftKey,
      rightKey,
      openLeft,
      openRight,
      closeLeft,
      closeRight,
      close,
      expandLeft,
      expandRight,
      contractLeft,
      contractRight,
    ],
  );

  return (
    <SidePanelContext.Provider value={value}>
      {children}
      <SidePanelOverlay />
    </SidePanelContext.Provider>
  );
}

// ── Panel UI ──────────────────────────────────────────────────────────

function SidePanelOverlay() {
  const {
    leftContent,
    rightContent,
    leftExpanded,
    rightExpanded,
    leftKey,
    rightKey,
    closeLeft,
    closeRight,
  } = useSidePanel();

  const hasLeft = leftContent !== null;
  const hasRight = rightContent !== null;
  const hasAny = hasLeft || hasRight;

  return (
    <>
      {/* Backdrop */}
      {hasAny && (
        <div
          className="fixed inset-0 bg-raven/30 z-[var(--z-modal-bg)] transition-opacity"
          onClick={() => {
            closeLeft();
            closeRight();
          }}
        />
      )}

      {/* Left panel */}
      <div
        className={`
          fixed top-0 left-0 h-full bg-crane shadow-xl z-[var(--z-modal)]
          transition-transform duration-300 ease-in-out overflow-y-auto
          ${leftExpanded ? 'w-[600px]' : 'w-[380px]'}
          ${hasLeft ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {hasLeft && (
          <div className="relative h-full">
            <button
              onClick={closeLeft}
              data-testid="side-panel-left-close"
              className="absolute top-4 right-4 text-2xl text-grouse hover:text-swift z-10"
              aria-label="Close panel"
            >
              &times;
            </button>
            <div key={leftKey} className="p-6 pt-14">{leftContent}</div>
          </div>
        )}
      </div>

      {/* Right panel */}
      <div
        className={`
          fixed top-0 right-0 h-full bg-crane shadow-xl z-[var(--z-modal)]
          transition-transform duration-300 ease-in-out overflow-y-auto
          ${rightExpanded ? 'w-[600px]' : 'w-[380px]'}
          ${hasRight ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {hasRight && (
          <div className="relative h-full">
            <button
              onClick={closeRight}
              data-testid="side-panel-right-close"
              className="absolute top-4 right-4 text-2xl text-grouse hover:text-swift z-10"
              aria-label="Close panel"
            >
              &times;
            </button>
            <div key={rightKey} data-testid="side-panel-right" className="p-6 pt-14">{rightContent}</div>
          </div>
        )}
      </div>
    </>
  );
}
