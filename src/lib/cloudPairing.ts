/**
 * Cloud / third-party pairing helpers — ported from the legacy
 * pages/pairing (isOAuthDevice), components/pairing/oauth-popup and
 * components/pairing/steps (pairing form) modules.
 *
 * OAuth products (Nest, Honeywell TCC, Lutron Caséta bridges, …) are paired by
 * signing in to the vendor's account in a popup window opened at the
 * `oauthUrl` returned by `subpairing:StartPairing`. The platform then adds the
 * vendor's devices as pairing devices. Cloud (IPCD) products are searched for
 * with `subpairing:Search`, passing the values the user entered into the
 * pairing form (e.g. a serial number) as `form`.
 */

import { Product } from '@arcus/core';
import type { PairingInput } from '@/arcus/types';
import type { PairingProduct } from '@/store/entityTypes';

/** Protocol family of Lutron bridged products, which pair through OAuth. */
export const PROTOFAMILY_LUTRON = 'LUTRON';

/** Template parameter the platform's OAuth pages use to render the web layout. */
export const OAUTH_TEMPLATE_PARAM = 'template=v2-web';

/** `window.postMessage` types sent by the platform's OAuth popup pages. */
export const OAUTH_MESSAGE = {
  COMPLETE: 'arcus-oauth-popup-complete',
  EXIT_TO_CATALOG: 'arcus-oauth-exit-to-catalog',
  EXIT_TO_SUPPORT: 'arcus-oauth-exit-to-support',
} as const;

export type OAuthMessageType = typeof OAUTH_MESSAGE[keyof typeof OAUTH_MESSAGE];

/** Shape of the message the OAuth popup posts back to the opener. */
export interface OAuthPopupMessage {
  type: OAuthMessageType;
}

/**
 * Support page the popup's "contact support" link leads to — the session's
 * redirect base URL plus `/support`, as the legacy getRedirectionURL builds it.
 */
export function supportUrl(redirectBaseUrl: string | undefined): string | null {
  return redirectBaseUrl ? `${redirectBaseUrl.replace(/\/$/, '')}/support` : null;
}

/** Size of the OAuth popup window, matching the legacy client. */
export const OAUTH_POPUP_WIDTH = 400;
export const OAUTH_POPUP_HEIGHT = 600;

/** Values entered into a cloud pairing form, keyed by input name. */
export type PairingFormValues = Record<string, string>;

/** Whether a product pairs by signing in to a vendor account. */
export function isOAuthProduct(product: PairingProduct | null): boolean {
  if (!product) return false;
  const mode = (product[Product.ATTR_PAIRINGMODE] ?? '').toUpperCase();
  if (mode === Product.PAIRINGMODE_OAUTH) return true;
  const family = (product[Product.ATTR_PROTOFAMILY] ?? '').toUpperCase();
  return mode === Product.PAIRINGMODE_BRIDGED_DEVICE && family === PROTOFAMILY_LUTRON;
}

/** URL the popup opens: the platform's OAuth URL with the web template. */
export function buildOAuthPopupUrl(oauthUrl: string): string {
  const separator = oauthUrl.includes('?') ? '&' : '?';
  return `${oauthUrl}${separator}${OAUTH_TEMPLATE_PARAM}`;
}

/** Origin of the OAuth URL, used to trust only messages from the popup's site. */
export function oauthOrigin(oauthUrl: string): string | null {
  try {
    return new URL(oauthUrl).origin;
  } catch {
    return null;
  }
}

/** Whether `data` is a message from the OAuth popup. */
export function isOAuthPopupMessage(data: OAuthPopupMessage | null | undefined): data is OAuthPopupMessage {
  return !!data && Object.values<string>(OAUTH_MESSAGE).includes(data.type);
}

/** Default form values: each input's preset value, or empty. */
export function initialFormValues(form: PairingInput[]): PairingFormValues {
  return Object.fromEntries(form.map((input) => [input.name, input.value ?? '']));
}

/** Validation error for one visible input, or null when valid. */
export function validateFormInput(input: PairingInput, value: string): string | null {
  if (input.type === 'HIDDEN') return null;
  const trimmed = value.trim();
  if (input.required && !trimmed) return `${input.label} is required`;
  if (!trimmed) return null;
  if (input.minlen !== undefined && trimmed.length < input.minlen) {
    return `${input.label} must be at least ${input.minlen} characters`;
  }
  if (input.maxlen !== undefined && trimmed.length > input.maxlen) {
    return `${input.label} must be at most ${input.maxlen} characters`;
  }
  return null;
}

/** Whether every input in the form is valid. */
export function isFormValid(form: PairingInput[], values: PairingFormValues): boolean {
  return form.every((input) => validateFormInput(input, values[input.name] ?? '') === null);
}

/** Trimmed form values to send with `subpairing:Search`. */
export function formValuesForSearch(form: PairingInput[], values: PairingFormValues): PairingFormValues {
  return Object.fromEntries(form.map((input) => [input.name, (values[input.name] ?? '').trim()]));
}
