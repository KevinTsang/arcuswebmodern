export type PairingStage = 'steps' | 'searching' | 'customize' | 'completed';

/**
 * Progress of an OAuth (vendor account) sign-in:
 * - `connecting` — the sign-in popup is open
 * - `authorized` — the popup reported success; waiting for the vendor's devices
 * - `closed` — the popup was closed before any device was found
 * - `blocked` — the browser refused to open the popup
 * - `timedOut` — no device was found before the pairing timeout
 */
export type OAuthStatus = 'connecting' | 'authorized' | 'closed' | 'blocked' | 'timedOut';


/** Platform PairingStep type (pairingstep.xml): a pairing, removal or factory reset step. */
export interface PairingStep {
  id: string;
  order: number;
  /** Absent from the platform's default removal step, which only has a title and info. */
  instructions?: string[];
  title?: string;
  info?: string;
}

