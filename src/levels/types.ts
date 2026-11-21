// Shared shapes for every level's notebook objectives and museum placards.

export interface Placard {
  id: string;
  kicker: string;
  title: string;
  body: string[];
  thenNow?: string;
}

/** A worked example the hint strip can fill in for the player. */
export interface Example {
  /** What to type, one entry per step; the last step repeats. */
  steps: string[];
  temperature?: number;
  /** Archive Mode prompt card id. */
  card?: string;
}

export interface ObjectiveBase {
  id: string;
  title: string;
  /** Cryptic, clearer, explicit. */
  hints: [string, string, string];
  /** What should have happened, shown if the player skips. */
  explain: string;
  placard: Placard;
  /** Hidden objectives appear only once found and don't count toward clearing. */
  hidden?: boolean;
  /** Filled in by the hint strip's "Try it" button. */
  example?: Example;
  /** Button label when there's no example to type (e.g. "Point it out"). */
  tryLabel?: string;
}
