export type PairingStage = 'steps' | 'searching' | 'customize' | 'completed';

export interface PairingProduct {
  'base:address': string;
  'product:name': string;
  'product:vendor': string;
  'product:hubRequired': boolean;
  'product:pairingMode'?: string;
  'product:id': string;
  [key: string]: unknown;
}

export interface PairingDevice {
  'base:address': string;
  'pairdev:pairingState': string;
  'pairdev:pairingPhase': string;
  'pairdev:productAddress'?: string;
  'pairdev:deviceAddress'?: string;
  'pairdev:customizations'?: string[];
  [key: string]: unknown;
}

export interface PairingStep {
  id: string;
  order: number;
  instructions: string[];
  title?: string;
  [key: string]: unknown;
}

export const PAIRING_STATES = {
  PAIRING: 'PAIRING',
  PAIRED: 'PAIRED',
  MISPAIRED: 'MISPAIRED',
  MISCONFIGURED: 'MISCONFIGURED',
} as const;

export const PAIRING_PHASES = {
  JOIN: 'JOIN',
  CONNECT: 'CONNECT',
  IDENTIFY: 'IDENTIFY',
  PREPARE: 'PREPARE',
  CONFIGURE: 'CONFIGURE',
  PAIRED: 'PAIRED',
  FAILED: 'FAILED',
} as const;
