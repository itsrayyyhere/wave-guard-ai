export type RaceQuestion = { q: string; options: string[]; answer: number };

export type RaceQuestionsResult = {
  questions: RaceQuestion[];
  error: string | null;
  retryable: boolean;
};

/** Correct answers needed to cross the finish line. */
export const RACE_GOAL = 10;
/** Lock-out after a wrong answer, for players and bots alike. */
export const WRONG_PENALTY_MS = 2000;
export const MIN_OPPONENTS = 1;
export const MAX_OPPONENTS = 3;

export type BotLevel = "rookie" | "pro" | "olympian";

export const BOT_LEVELS: Record<
  BotLevel,
  { label: string; minMs: number; maxMs: number; accuracy: number }
> = {
  rookie: { label: "Rookie", minMs: 6500, maxMs: 10000, accuracy: 0.6 },
  pro: { label: "Pro", minMs: 4200, maxMs: 6500, accuracy: 0.78 },
  olympian: { label: "Olympian", minMs: 2600, maxMs: 4200, accuracy: 0.92 },
};

export function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i] as T;
    a[i] = a[j] as T;
    a[j] = tmp;
  }
  return a;
}

/** Built-in questions used while AI questions load or if they're unavailable. */
export const FALLBACK_QUESTIONS: RaceQuestion[] = [
  { q: "Recommended freestyle body roll range?", options: ["10–20°", "35–45°", "60–75°", "90°"], answer: 1 },
  { q: "During recovery, the elbow should be…", options: ["Below the wrist", "Level with the wrist", "Above the wrist", "Fully straight"], answer: 2 },
  { q: "A dropped elbow in the pull mostly stresses the…", options: ["Knee", "Shoulder", "Ankle", "Hip"], answer: 1 },
  { q: "Which drill trains a high-elbow recovery?", options: ["Fingertip Drag", "Flip turn", "Breaststroke kick", "Treading water"], answer: 0 },
  { q: "Crossing the midline at hand entry can cause…", options: ["Faster kick", "Shoulder impingement", "Easier breathing", "Longer glide"], answer: 1 },
  { q: "Where should the hand enter in freestyle?", options: ["Behind the head", "In line with the shoulder", "Across the centerline", "Next to the hip"], answer: 1 },
  { q: "The 'catch' is when you…", options: ["Breathe to the side", "Push off the wall", "Set the forearm to grip water", "Kick from the hips"], answer: 2 },
  { q: "Too little body roll forces a…", options: ["Wide, straight-arm recovery", "Smaller kick", "Easier breath", "Higher float"], answer: 0 },
  { q: "Which drill improves balance on the side?", options: ["Kick on Side", "Butterfly kick", "Back sculling", "Dolphin dive"], answer: 0 },
  { q: "Head position in freestyle should be…", options: ["Lifted, looking forward", "Neutral, eyes down", "Tilted far back", "Turned to one side"], answer: 1 },
  { q: "Which muscles stabilize the shoulder blade?", options: ["Calves", "Quadriceps", "Scapular stabilizers", "Hamstrings"], answer: 2 },
  { q: "Common sign of swimmer's shoulder?", options: ["Pain at front/top of shoulder", "Tingling toes", "Sore jaw", "Stiff ankles"], answer: 0 },
  { q: "Breaststroke kick is also called a…", options: ["Flutter kick", "Whip kick", "Dolphin kick", "Scissor kick"], answer: 1 },
  { q: "Butterfly uses which kick?", options: ["Flutter kick", "Whip kick", "Dolphin kick", "Eggbeater"], answer: 2 },
  { q: "In backstroke, the hand enters…", options: ["Thumb first", "Pinky first", "Palm up", "Fist closed"], answer: 1 },
  { q: "Bilateral breathing means breathing…", options: ["Every stroke", "To both sides", "Only forward", "Through the nose only"], answer: 1 },
  { q: "A streamline off the wall should be…", options: ["Arms wide", "Tight, arms over ears", "Head up", "Knees bent"], answer: 1 },
  { q: "Freestyle kick should start from the…", options: ["Knees", "Ankles", "Hips", "Feet"], answer: 2 },
];
