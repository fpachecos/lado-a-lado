export const FPS = 30;
export const DURATION_F = 450; // 15s

// Sequences with overlapping cross-fades (overlap = 15 frames = 0.5s)
export const SEQS = {
  hero:    { from: 0,   dur: 105 },  // 0-105  (3.5s)
  problem: { from: 75,  dur: 105 },  // 75-180 (3.5s)
  demo:    { from: 150, dur: 225 },  // 150-375 (7.5s) ← most of the video
  benefit: { from: 345, dur: 90  },  // 345-435 (3s)
  cta:     { from: 420, dur: 30  },  // 420-450 (1s)
} as const;

// Local frame windows within the demo Sequence (dur=225)
// 1-screen: takes the full 225
// 2-screens: split with 15-frame crossfade at the midpoint
export const DEMO_1 = [{ start: 0, end: 225 }];
export const DEMO_2 = [
  { start: 0, end: 125 },
  { start: 110, end: 225 },
];
