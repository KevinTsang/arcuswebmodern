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
 *   openRight(<MyComponent />, { title: 'My Panel', key: 'my-panel' });
 *
 * The panel frame draws the title and the only close button, and wraps the
 * content in Suspense, so content should not render its own close control.
 *
 * Every open passes a `key` naming what the panel shows. When the key changes,
 * the content (with its Suspense and error boundaries) remounts instead of
 * reusing the previous panel's state. Use `<panel>:<entity address>` for
 * entity panels (e.g. `device-details:DRIV:dev:…`, `scene:new` when creating)
 * and a fixed name for panels without one (e.g. `change-password`).
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
import { SidePanelFrame } from '@/components/SidePanelFrame';

// ── Context ───────────────────────────────────────────────────────────

interface SidePanelOptions {
  /** Shown in the panel header, including while the content is suspended. */
  title?: ReactNode;
  /** Identity of the panel's content; a new key remounts it. See the file header. */
  key: string;
}

interface SidePanelState {
  leftContent: ReactNode | null;
  rightContent: ReactNode | null;
  leftTitle: ReactNode | null;
  rightTitle: ReactNode | null;
  leftKey: string | null;
  rightKey: string | null;
  leftExpanded: boolean;
  rightExpanded: boolean;
}

interface SidePanelActions {
  openLeft: (content: ReactNode, options: SidePanelOptions) => void;
  openRight: (content: ReactNode, options: SidePanelOptions) => void;
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
  const [leftTitle, setLeftTitle] = useState<ReactNode | null>(null);
  const [rightTitle, setRightTitle] = useState<ReactNode | null>(null);
  const [leftKey, setLeftKey] = useState<string | null>(null);
  const [rightKey, setRightKey] = useState<string | null>(null);
  const [leftExpanded, setLeftExpanded] = useState(false);
  const [rightExpanded, setRightExpanded] = useState(false);
  const pathname = usePathname();

  // Close panels on route change (matches original behavior in app.js page setter)
  useEffect(() => {
    setLeftContent(null);
    setRightContent(null);
    setLeftTitle(null);
    setLeftKey(null);
    setRightTitle(null);
    setRightKey(null);
    setLeftExpanded(false);
    setRightExpanded(false);
  }, [pathname]);

  const openLeft = useCallback((content: ReactNode, options: SidePanelOptions) => {
    setLeftContent(content);
    setLeftTitle(options.title ?? null);
    setLeftKey(options.key);
  }, []);

  const openRight = useCallback((content: ReactNode, options: SidePanelOptions) => {
    setRightContent(content);
    setRightTitle(options.title ?? null);
    setRightKey(options.key);
  }, []);

  const closeLeft = useCallback(() => {
    setLeftContent(null);
    setLeftTitle(null);
    setLeftKey(null);
    setLeftExpanded(false);
  }, []);

  const closeRight = useCallback(() => {
    setRightContent(null);
    setRightTitle(null);
    setRightKey(null);
    setRightExpanded(false);
  }, []);

  const close = useCallback(() => {
    setLeftContent(null);
    setRightContent(null);
    setLeftTitle(null);
    setLeftKey(null);
    setRightTitle(null);
    setRightKey(null);
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
      leftTitle,
      rightTitle,
      leftKey,
      rightKey,
      leftExpanded,
      rightExpanded,
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
      leftTitle,
      rightTitle,
      leftKey,
      rightKey,
      leftExpanded,
      rightExpanded,
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
    leftTitle,
    rightTitle,
    leftKey,
    rightKey,
    leftExpanded,
    rightExpanded,
    closeLeft,
    closeRight,
  } = useSidePanel();

  const hasAny = leftContent !== null || rightContent !== null;

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

      <SidePanelFrame
        side="left"
        title={leftTitle}
        panelKey={leftKey}
        content={leftContent}
        expanded={leftExpanded}
        onClose={closeLeft}
      />
      <SidePanelFrame
        side="right"
        title={rightTitle}
        panelKey={rightKey}
        content={rightContent}
        expanded={rightExpanded}
        onClose={closeRight}
      />
    </>
  );
}
