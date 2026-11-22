// The Meridian Job — game configuration: tuning constants and the three heists.
// Every heist is a tile map plus its patrols and cameras. One tile = 40 px, the
// playfield is 32 x 18 tiles (1280 x 720). Map legend:
//   # wall   . floor   , cover (rug / planter: guards spot you half as fast)
//   P player start   T target case   L loot case   E exit
//   B smoke-bomb pickup   o coin pickup
// Guards and cameras are placed by tile coordinates below each map.

export const TILE = 40;
export const COLS = 32;
export const ROWS = 18;
export const VIEW_W = 1280;
export const VIEW_H = 720;

// Screenshots are staged at exactly this size (see shots.json).
export const SHOT = { width: 1280, height: 720 };

export const PLAYER = {
  walkSpeed: 178,
  sneakSpeed: 96,
  radius: 12,
  crackRange: 52,
  crackSeconds: 2.5,
};

export const GUARD = {
  patrolSpeed: 72,
  chaseSpeed: 152,
  searchSpeed: 118,
  sightRange: 225,
  sightHalfAngle: 0.61, // ~35 degrees each side
  touchRadius: 24,
  suspicionGain: 62, // per second at point blank, scaled by closeness
  suspicionDecay: 22,
  chaseMemory: 4.0, // seconds a guard keeps chasing after losing sight
};

export const CAMERA = {
  sightRange: 265,
  sightHalfAngle: 0.44,
  alarmGain: 24, // alarm per second while the camera sees the thief
};

export const ALARM = {
  huntedAt: 55,
  bustedAt: 100,
  chaseGain: 12, // per second while any guard chases
  decayCalm: 5,
  decayHunted: 2,
  crackGain: 3, // cracking the target case is loud
  lootGain: 2, // grabbing a loot case pings the alarm a little
  ghostCeiling: 25, // stay under this all heist for the Ghost bonus
};

export const TOOLS = {
  coinsStart: 3,
  coinRange: 280,
  coinLureRadius: 340,
  smokeStart: 2,
  smokeRadius: 96,
  smokeSeconds: 3.5,
};

export const SCORE = {
  targetValue: 5000,
  ghostBonus: 1500,
  cleanBonus: 800,
  timePerSecond: 15,
  timeBonusCap: 1500,
};

export const HEISTS = [
  {
    id: 'gallery',
    name: 'Heist 1 — The Meridian Gallery',
    brief:
      'The Meridian Star diamond sits in the east wing. Two guards walk the floor, one camera sweeps the vault corridor. Crack the case, grab what you can, and slip out the south door.',
    tip: 'Tip: the middle band is wide open — cross it behind the guard, not in front of him.',
    parSeconds: 90,
    lootValue: 800,
    map: [
      '################################',
      '#......#..........#............#',
      '#..P...#....L.....#.....T......#',
      '#......#..........#............#',
      '#..............,...............#',
      '#......#..........#............#',
      '###.####..######..###.######.###',
      '#..............................#',
      '#..L.......,......,.......L....#',
      '#..............................#',
      '#......#..........#............#',
      '#..,...#....,.....#....,.......#',
      '#......#..........#............#',
      '#..............,...............#',
      '#......#..........#............#',
      '#..B...#....o.....#.....E......#',
      '#......#..........#............#',
      '################################',
    ],
    guards: [
      { waypoints: [[4, 8], [15, 8], [27, 8], [15, 8]], pause: 1.2 },
      { waypoints: [[24, 2], [24, 5], [28, 5], [28, 2]], pause: 0.8 },
    ],
    cameras: [
      { tile: [30, 1], baseAngle: Math.PI * 0.72, sweep: 0.55, speed: 0.45 },
    ],
  },
  {
    id: 'vault',
    name: 'Heist 2 — The Vault Below',
    brief:
      'Down in the bank vault level the corridors are tight and the patrols overlap. Three guards, two cameras, and the Meridian ledger in the strongroom. Move slow, use the coins.',
    tip: 'Tip: a coin thrown down a corridor pulls a guard off his patrol — walk through the gap he leaves.',
    parSeconds: 120,
    lootValue: 1200,
    map: [
      '################################',
      '#....#......#........#.........#',
      '#.P..#..L...#...T....#....L....#',
      '#....#......#........#.........#',
      '#....#......#........#.........#',
      '#....#......#........#.........#',
      '######..##########..########..##',
      '#..............................#',
      '#..L.....,........,........L...#',
      '#..............................#',
      '##..#######..##########..#######',
      '#....#......#........#.........#',
      '#....#..,...#....,....#....,...#',
      '#....#......#........#.........#',
      '#....#......#........#.........#',
      '#.B..#...o..#........#....E....#',
      '#....#......#........#.........#',
      '################################',
    ],
    guards: [
      { waypoints: [[3, 7], [15, 7], [28, 7], [15, 7]], pause: 1.0 },
      { waypoints: [[10, 9], [10, 13], [22, 13], [22, 9]], pause: 1.4 },
      { waypoints: [[26, 2], [26, 5], [20, 5], [20, 2]], pause: 0.8 },
    ],
    cameras: [
      { tile: [1, 1], baseAngle: 0, sweep: 0.7, speed: 0.55 },
      { tile: [30, 16], baseAngle: Math.PI, sweep: 0.6, speed: 0.5 },
    ],
  },
  {
    id: 'penthouse',
    name: 'Heist 3 — The Penthouse',
    brief:
      'The top floor. Open plan, nowhere to hide except the planters, four guards on crossing patrols and three cameras over the gallery. The Meridian collection is the last score. Get in, get rich, get out.',
    tip: 'Tip: the planters are cover — guards spot you half as fast while you stand in one.',
    parSeconds: 150,
    lootValue: 1600,
    map: [
      '################################',
      '#..P...........................#',
      '#......,.............,.........#',
      '#..............................#',
      '#..####......####......####....#',
      '#..............................#',
      '#....,......,......,......,....#',
      '#..............................#',
      '#..L..........T...........L....#',
      '#..............................#',
      '#....,......,......,......,....#',
      '#..............................#',
      '#..####......####......####....#',
      '#..............................#',
      '#......,.............,.........#',
      '#..B.........o............E....#',
      '#..............................#',
      '################################',
    ],
    guards: [
      { waypoints: [[4, 3], [27, 3], [27, 6], [4, 6]], pause: 0.9 },
      { waypoints: [[27, 14], [4, 14], [4, 11], [27, 11]], pause: 0.9 },
      { waypoints: [[15, 1], [15, 8], [15, 16], [15, 8]], pause: 1.1 },
      { waypoints: [[8, 8], [23, 8], [23, 9], [8, 9]], pause: 1.3 },
    ],
    cameras: [
      { tile: [16, 1], baseAngle: Math.PI / 2, sweep: 0.8, speed: 0.6 },
      { tile: [1, 9], baseAngle: 0, sweep: 0.7, speed: 0.5 },
      { tile: [30, 9], baseAngle: Math.PI, sweep: 0.7, speed: 0.5 },
    ],
  },
];
