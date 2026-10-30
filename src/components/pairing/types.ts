export type PairingStage = 'steps' | 'searching' | 'customize' | 'completed';


/** Platform PairingStep type (pairingstep.xml): a pairing, removal or factory reset step. */
export interface PairingStep {
  id: string;
  order: number;
  /** Absent from the platform's default removal step, which only has a title and info. */
  instructions?: string[];
  title?: string;
  info?: string;
}

