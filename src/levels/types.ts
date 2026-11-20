// Shared shapes for every level's notebook objectives and museum placards.

export interface Placard {
  id: string;
  kicker: string;
  title: string;
  body: string[];
  thenNow?: string;
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
}
