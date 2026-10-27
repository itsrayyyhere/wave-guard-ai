import type { BotLevel } from "./questions";

/** Points per bot you beat when you win the race (1st place). */
export const WIN_POINTS: Record<BotLevel, number> = { rookie: 3, pro: 8, olympian: 15 };

/** Points per bot you beat when you finish 2nd in a 4-car race (3 bots). */
export const SECOND_OF_FOUR_POINTS: Record<BotLevel, number> = { rookie: 1, pro: 6, olympian: 10 };

/**
 * Ranking points earned in one race.
 * - 1st place: WIN_POINTS for every bot in the race.
 * - 2nd place against 3 bots: SECOND_OF_FOUR_POINTS for each bot finishing behind you.
 * - Anything else: 0.
 */
export function racePoints({
  place,
  opponents,
  beaten,
}: {
  place: number;
  opponents: readonly BotLevel[];
  /** Levels of the bots that finished behind the player. */
  beaten: readonly BotLevel[];
}): number {
  if (place === 1) return beaten.reduce((sum, l) => sum + WIN_POINTS[l], 0);
  if (place === 2 && opponents.length === 3)
    return beaten.reduce((sum, l) => sum + SECOND_OF_FOUR_POINTS[l], 0);
  return 0;
}

export type RaceRecord = {
  at: number;
  place: number;
  field: number;
  opponents: BotLevel[];
  points: number;
};

export type RankingState = {
  total: number;
  played: number;
  wins: number;
  races: RaceRecord[];
};

export const EMPTY_RANKING: RankingState = { total: 0, played: 0, wins: 0, races: [] };
const MAX_HISTORY = 30;

export function addRace(state: RankingState, race: RaceRecord): RankingState {
  return {
    total: state.total + race.points,
    played: state.played + 1,
    wins: state.wins + (race.place === 1 ? 1 : 0),
    races: [race, ...state.races].slice(0, MAX_HISTORY),
  };
}
