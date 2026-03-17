export type PairingStage = 'steps' | 'searching' | 'customize' | 'completed';


export interface PairingStep {
  id: string;
  order: number;
  instructions: string[];
  title?: string;
  [key: string]: unknown;
}

