'use client';

/**
 * OAuth sign-in popup — ported from the legacy
 * components/pairing/oauth-popup.component.
 *
 * Opens the vendor sign-in page in a centred popup, polls for the user closing
 * it, and listens for the messages the platform's OAuth pages post back
 * (complete, exit to catalog, exit to support). Only messages from the OAuth
 * URL's origin are trusted. The popup is closed when the component unmounts.
 */

import { useCallback, useEffect, useRef } from 'react';
import {
  OAUTH_MESSAGE,
  OAUTH_POPUP_HEIGHT,
  OAUTH_POPUP_WIDTH,
  buildOAuthPopupUrl,
  isOAuthPopupMessage,
  oauthOrigin,
  type OAuthPopupMessage,
} from '@/lib/cloudPairing';

/** How often to check whether the user closed the popup (ms), as in the legacy client. */
export const POPUP_CLOSED_POLL_MS = 333;

/** Name of the popup window; reusing it focuses an already-open popup. */
export const OAUTH_POPUP_NAME = 'ArcusOAuth';

export interface UseOAuthPopupOptions {
  /** The user closed the popup without the sign-in completing. */
  onClosed: () => void;
  /** The popup reported the sign-in finished; it has been closed. */
  onComplete: () => void;
  /** The popup asked to return to the product catalog. */
  onExitToCatalog: () => void;
  /** The popup asked to show the support page; it has been closed. */
  onExitToSupport: () => void;
}

export interface OAuthPopupControls {
  /** Open the popup at the OAuth URL. Returns false when the browser blocked it. */
  open: (oauthUrl: string) => boolean;
  /** Bring the open popup to the front. */
  focus: () => void;
  /** Close the popup without reporting it as closed by the user. */
  close: () => void;
}

function popupFeatures(): string {
  const top = window.top ?? window;
  const left = top.screenX + (top.outerWidth - OAUTH_POPUP_WIDTH) / 2;
  return [
    `width=${OAUTH_POPUP_WIDTH}`,
    `height=${OAUTH_POPUP_HEIGHT}`,
    `top=${top.screenY}`,
    `left=${left}`,
    'toolbar=no',
    'location=no',
    'menubar=no',
    'status=no',
    'resizable=no',
  ].join(',');
}

export function useOAuthPopup(options: UseOAuthPopupOptions): OAuthPopupControls {
  const popupRef = useRef<Window | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const originRef = useRef<string | null>(null);
  // Keep the latest callbacks without re-binding the message listener.
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const stopPoll = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  }, []);

  const close = useCallback(() => {
    stopPoll();
    const popup = popupRef.current;
    popupRef.current = null;
    if (popup && !popup.closed) popup.close();
  }, [stopPoll]);

  const focus = useCallback(() => {
    popupRef.current?.focus();
  }, []);

  const open = useCallback((oauthUrl: string) => {
    close();
    originRef.current = oauthOrigin(oauthUrl);
    const popup = window.open(buildOAuthPopupUrl(oauthUrl), OAUTH_POPUP_NAME, popupFeatures());
    if (!popup) return false;

    popupRef.current = popup;
    popup.focus();
    pollRef.current = setInterval(() => {
      if (popupRef.current?.closed) {
        popupRef.current = null;
        stopPoll();
        optionsRef.current.onClosed();
      }
    }, POPUP_CLOSED_POLL_MS);
    return true;
  }, [close, stopPoll]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<OAuthPopupMessage | null>) => {
      if (!originRef.current || event.origin !== originRef.current) return;
      if (!isOAuthPopupMessage(event.data)) return;

      switch (event.data.type) {
        case OAUTH_MESSAGE.COMPLETE:
          close();
          optionsRef.current.onComplete();
          break;
        case OAUTH_MESSAGE.EXIT_TO_CATALOG:
          close();
          optionsRef.current.onExitToCatalog();
          break;
        case OAUTH_MESSAGE.EXIT_TO_SUPPORT:
          close();
          optionsRef.current.onExitToSupport();
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      close();
    };
  }, [close]);

  return { open, focus, close };
}
