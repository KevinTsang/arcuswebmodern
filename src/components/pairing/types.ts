export type PairingStage = 'steps' | 'searching' | 'customize' | 'completed';


export interface PairingStep {
  id: string;
  order: number;
  instructions: string[];
  title?: string;
}

/**
 * One pairing flow: from the first search after entering pairing until Finish
 * (DismissAll). It spans Pair Another and trips back to the product catalog,
 * so a device that joins during one search can still be customized on the next.
 */
export interface PairingFlow {
  /** The pairing subsystem (and so the place) the flow belongs to. */
  pairingSubsystem: string;
  /**
   * Pairing records the flow has already accounted for, mapped to the pairing
   * state each one was in: the PAIRED, MISPAIRED and MISCONFIGURED records
   * present when the flow started, plus each device this flow has finished
   * with. A record still in that state is not a result of the current search.
   */
  settled: Record<string, string>;
}
