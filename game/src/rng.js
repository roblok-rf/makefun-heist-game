// The Meridian Job — deterministic random numbers (mulberry32).
// Every random choice in the game comes from a seeded generator, so a given seed
// always plays the same heist: the same guard pauses, the same loot sparkle.

export function makeRng(seed) {
  let state = (seed >>> 0) || 0x9e3779b9;
  return function next() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rngRange(rng, min, max) {
  return min + rng() * (max - min);
}

export function rngInt(rng, min, max) {
  return Math.floor(rngRange(rng, min, max + 1));
}

export function rngPick(rng, items) {
  return items[Math.floor(rng() * items.length)];
}

// A stable hash of a short string, for seeding sparkle and floor variation.
export function hashString(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
