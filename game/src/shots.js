// The Meridian Job — deterministic screenshot scenes.
// ?shot=start|play|end&seed=1 stages one fixed scene, renders a single frame and
// sets window.__shotReady so a screenshot tool knows the frame is complete.
// No randomness beyond the seed: the same query always stages the same picture.

import { createWorld } from './world.js';

function stagePlay(game, seed) {
  // Mid-heist in the Gallery: the thief halfway across the room, a guard's
  // yellow cone sweeping close by, the camera's red cone overhead, the target
  // case glowing ahead, the alarm already warm — the whole game in one frame.
  const world = createWorld(0, seed);
  world.player.x = 560;
  world.player.y = 340;
  world.player.angle = -0.4;
  world.player.sneaking = true;
  world.alarm = 32;
  world.maxAlarm = 32;
  world.time = 41.5;
  world.score = 1600;
  world.lootTaken = 2;
  world.loot[0].taken = true;
  world.loot[1].taken = true;
  world.target.progress = 0.45;
  world.coinsLeft = 2;
  world.smokeLeft = 1;
  world.events.push({ kind: 'loot', text: 'Loot secured: $800.', at: 38.2 });
  world.events.push({ kind: 'loot', text: 'Loot secured: $800.', at: 40.1 });
  // Guard A mid-patrol, cone crossing the thief's path; guard B up top.
  const a = world.guards[0];
  a.x = 620;
  a.y = 300;
  a.angle = Math.PI * 0.78;
  a.suspicion = 48;
  a.state = 'suspicious';
  a.lastSeen = { x: 560, y: 340 };
  const b = world.guards[1];
  b.x = 980;
  b.y = 130;
  b.angle = Math.PI * 0.9;
  // Camera sweeping down over the vault corridor.
  world.cameras[0].angle = Math.PI * 0.62;
  world.cameras[0].seesPlayer = false;
  // A spent coin on the floor and a fading smoke puff for the story.
  world.coins.push({ x: 700, y: 380, landed: true, landAt: 39.0, rung: true });
  world.smokes.push({ x: 480, y: 420, radius: 96, left: 1.8 });
  game.world = world;
  game.screen = 'play';
}

function stageEnd(game, seed) {
  // The getaway screen after the Gallery: a full score breakdown.
  const world = createWorld(0, seed);
  world.status = 'getaway';
  world.targetSecured = true;
  world.score = 6600;
  world.time = 74;
  world.maxAlarm = 32;
  world.breakdown = {
    loot: 6600,
    timeBonus: 240,
    ghostBonus: 0,
    cleanBonus: 800,
    ghost: false,
    clean: true,
    total: 7640,
  };
  game.world = world;
  game.screen = 'getaway';
}

export function stageShot(game, name, seed) {
  if (name === 'play') {
    stagePlay(game, seed);
  } else if (name === 'end') {
    stageEnd(game, seed);
  } else {
    game.screen = 'title';
  }
  game.shotStaged = name;
}
