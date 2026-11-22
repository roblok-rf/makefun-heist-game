// The Meridian Job — world simulation: levels, guards, cameras, the alarm,
// cracking, loot, coins and smoke. Pure game logic; render.js draws the state
// this module produces. All positions are in pixels; tiles are 40 px.

import { ALARM, CAMERA, COLS, GUARD, HEISTS, PLAYER, ROWS, SCORE, TILE, TOOLS } from './config.js';
import { makeRng, rngRange } from './rng.js';

export function tileCenter(col, row) {
  return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 };
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function createWorld(heistIndex, seed) {
  const def = HEISTS[heistIndex];
  const rng = makeRng(seed * 7919 + heistIndex * 104729 + 13);
  const walls = [];
  const cover = [];
  const loot = [];
  let target = null;
  let exit = null;
  let playerStart = { x: TILE * 2, y: TILE * 2 };

  for (let row = 0; row < ROWS; row++) {
    walls.push([]);
    cover.push([]);
    for (let col = 0; col < COLS; col++) {
      const ch = def.map[row][col];
      walls[row][col] = ch === '#';
      cover[row][col] = ch === ',';
      const at = tileCenter(col, row);
      if (ch === 'P') playerStart = at;
      else if (ch === 'T') target = { x: at.x, y: at.y, col, row, cracked: false, progress: 0 };
      else if (ch === 'L') loot.push({ x: at.x, y: at.y, taken: false, value: def.lootValue, sparkle: rng() * Math.PI * 2 });
      else if (ch === 'E') exit = { x: at.x, y: at.y, col, row };
      else if (ch === 'B') loot.push({ x: at.x, y: at.y, taken: false, kind: 'smoke', value: 0, sparkle: 0 });
      else if (ch === 'o') loot.push({ x: at.x, y: at.y, taken: false, kind: 'coins', value: 0, sparkle: 0 });
    }
  }

  const guards = def.guards.map((g) => {
    const start = tileCenter(g.waypoints[0][0], g.waypoints[0][1]);
    return {
      x: start.x,
      y: start.y,
      angle: rngRange(rng, 0, Math.PI * 2),
      waypoints: g.waypoints.map(([c, r]) => tileCenter(c, r)),
      waypointIndex: 1,
      pauseLeft: rngRange(rng, 0, g.pause),
      pause: g.pause,
      state: 'patrol', // patrol | suspicious | chase | search | investigate | return
      suspicion: 0,
      chaseLeft: 0,
      searchLeft: 0,
      investigateAt: null,
      investigateLeft: 0,
      lastSeen: null,
      bobPhase: rng() * Math.PI * 2,
    };
  });

  const cameras = def.cameras.map((c) => {
    const at = tileCenter(c.tile[0], c.tile[1]);
    return {
      x: at.x,
      y: at.y,
      baseAngle: c.baseAngle,
      sweep: c.sweep,
      speed: c.speed,
      angle: c.baseAngle,
      phase: rngRange(rng, 0, Math.PI * 2),
      seesPlayer: false,
    };
  });

  return {
    def,
    heistIndex,
    seed,
    walls,
    cover,
    loot,
    target,
    exit,
    player: {
      x: playerStart.x,
      y: playerStart.y,
      angle: 0,
      moving: false,
      sneaking: false,
      crackHeld: false,
    },
    guards,
    cameras,
    coins: [],
    smokes: [],
    alarm: 0,
    maxAlarm: 0,
    time: 0,
    score: 0,
    lootTaken: 0,
    targetSecured: false,
    coinsLeft: TOOLS.coinsStart,
    smokeLeft: TOOLS.smokeStart,
    status: 'playing', // playing | caught | getaway
    statusReason: '',
    events: [], // { kind, text, at } — recent feed lines for the HUD
  };
}

function tileAt(world, x, y) {
  const col = Math.floor(x / TILE);
  const row = Math.floor(y / TILE);
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return '#';
  return world.walls[row][col] ? '#' : world.cover[row][col] ? ',' : '.';
}

function isWall(world, x, y) {
  return tileAt(world, x, y) === '#';
}

function isCover(world, x, y) {
  return tileAt(world, x, y) === ',';
}

function hasLineOfSight(world, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 8));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (isWall(world, x0 + dx * t, y0 + dy * t)) return false;
  }
  return true;
}

function inSmoke(world, x, y) {
  return world.smokes.some((s) => Math.hypot(x - s.x, y - s.y) < s.radius);
}

// Can this watcher see the thief right now? Cones, walls and smoke all count.
export function canSee(world, wx, wy, angle, range, halfAngle, px, py) {
  const dx = px - wx;
  const dy = py - wy;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (dist > 4 && Math.abs(angleDiff(Math.atan2(dy, dx), angle)) > halfAngle) return false;
  if (inSmoke(world, px, py)) return false;
  if (inSmoke(world, wx, wy)) return false;
  return hasLineOfSight(world, wx, wy, px, py);
}

function moveWithCollision(world, body, dx, dy) {
  const r = PLAYER.radius;
  const nextX = body.x + dx;
  if (!isWall(world, nextX + Math.sign(dx) * r, body.y - r + 2) && !isWall(world, nextX + Math.sign(dx) * r, body.y + r - 2)) {
    body.x = nextX;
  }
  const nextY = body.y + dy;
  if (!isWall(world, body.x - r + 2, nextY + Math.sign(dy) * r) && !isWall(world, body.x + r - 2, nextY + Math.sign(dy) * r)) {
    body.y = nextY;
  }
}

function guardMove(world, guard, tx, ty, speed, dt) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return true;
  const step = Math.min(dist, speed * dt);
  const nx = guard.x + (dx / dist) * step;
  const ny = guard.y + (dy / dist) * step;
  // Guards slide along walls the same way the player does.
  if (!isWall(world, nx + Math.sign(dx) * 10, guard.y)) guard.x = nx;
  if (!isWall(world, guard.x, ny + Math.sign(dy) * 10)) guard.y = ny;
  guard.angle = Math.atan2(dy, dx);
  return dist - step < 3;
}

function pushEvent(world, kind, text) {
  world.events.push({ kind, text, at: world.time });
  if (world.events.length > 5) world.events.shift();
}

export function updateWorld(world, input, audio, dt) {
  if (world.status !== 'playing') return;
  world.time += dt;
  const player = world.player;

  // --- Player movement -------------------------------------------------
  const axis = input.moveAxis();
  const sneaking = input.sneaking();
  player.sneaking = sneaking;
  player.moving = axis.x !== 0 || axis.y !== 0;
  const speed = sneaking ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
  if (player.moving) {
    player.angle = Math.atan2(axis.y, axis.x);
    moveWithCollision(world, player, axis.x * speed * dt, axis.y * speed * dt);
  }

  // --- Coin throw (mouse click) ----------------------------------------
  if (input.mouse.clicked && world.coinsLeft > 0) {
    const dx = input.mouse.clickX - player.x;
    const dy = input.mouse.clickY - player.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 12) {
      const reach = Math.min(dist, TOOLS.coinRange);
      const coin = {
        x: player.x + (dx / dist) * reach,
        y: player.y + (dy / dist) * reach,
        landed: false,
        landAt: world.time + 0.35,
        rung: false,
      };
      // Coins stop at walls: walk the flight in steps.
      const steps = Math.ceil(reach / 6);
      for (let i = 1; i <= steps; i++) {
        const cx = player.x + (dx / dist) * (reach * (i / steps));
        const cy = player.y + (dy / dist) * (reach * (i / steps));
        if (isWall(world, cx, cy)) {
          coin.x = player.x + (dx / dist) * (reach * ((i - 1) / steps));
          coin.y = player.y + (dy / dist) * (reach * ((i - 1) / steps));
          break;
        }
      }
      world.coins.push(coin);
      world.coinsLeft -= 1;
      audio.coinThrow();
    }
  }

  // --- Smoke bomb (Q) ----------------------------------------------------
  if (input.wasPressed('q') && world.smokeLeft > 0) {
    world.smokes.push({ x: player.x, y: player.y, radius: TOOLS.smokeRadius, left: TOOLS.smokeSeconds });
    world.smokeLeft -= 1;
    audio.smoke();
    pushEvent(world, 'smoke', 'Smoke out — they cannot see through it.');
  }
  world.smokes = world.smokes.filter((s) => (s.left -= dt) > 0);

  // --- Coins landing: the clink lures the nearest guard ------------------
  for (const coin of world.coins) {
    if (!coin.landed && world.time >= coin.landAt) {
      coin.landed = true;
      audio.coinClink();
      let best = null;
      let bestDist = TOOLS.coinLureRadius;
      for (const guard of world.guards) {
        const d = Math.hypot(guard.x - coin.x, guard.y - coin.y);
        if (d < bestDist) {
          best = guard;
          bestDist = d;
        }
      }
      if (best && best.state !== 'chase') {
        best.state = 'investigate';
        best.investigateAt = { x: coin.x, y: coin.y };
        best.investigateLeft = 2.5;
        best.suspicion = Math.max(best.suspicion, 30);
        pushEvent(world, 'coin', 'A guard heard the coin.');
      }
    }
  }
  world.coins = world.coins.filter((c) => world.time - c.landAt < 6);

  // --- Loot pickups -------------------------------------------------------
  for (const item of world.loot) {
    if (item.taken) continue;
    if (Math.hypot(player.x - item.x, player.y - item.y) < 26) {
      item.taken = true;
      if (item.kind === 'smoke') {
        world.smokeLeft += 1;
        pushEvent(world, 'pickup', 'Picked up a smoke bomb.');
      } else if (item.kind === 'coins') {
        world.coinsLeft += 2;
        pushEvent(world, 'pickup', 'Picked up 2 coins.');
      } else {
        world.score += item.value;
        world.lootTaken += 1;
        world.alarm = Math.min(100, world.alarm + ALARM.lootGain);
        pushEvent(world, 'loot', `Loot secured: $${item.value.toLocaleString('en-US')}.`);
      }
      audio.pickup();
    }
  }

  // --- Cracking the target case (hold E) ----------------------------------
  const target = world.target;
  const nearTarget = target && !target.cracked && Math.hypot(player.x - target.x, player.y - target.y) < PLAYER.crackRange;
  player.crackHeld = nearTarget && input.held('e');
  if (nearTarget && input.held('e')) {
    target.progress += dt / PLAYER.crackSeconds;
    world.alarm = Math.min(100, world.alarm + ALARM.crackGain * dt);
    if (Math.floor(target.progress * 10) !== Math.floor((target.progress - dt / PLAYER.crackSeconds) * 10)) {
      audio.crackTick();
    }
    if (target.progress >= 1) {
      target.cracked = true;
      world.targetSecured = true;
      world.score += SCORE.targetValue;
      audio.crackDone();
      pushEvent(world, 'target', 'Target cracked — get to the exit!');
    }
  } else if (target && !target.cracked && target.progress > 0 && !input.held('e')) {
    target.progress = Math.max(0, target.progress - dt * 0.25);
  }

  // --- Exit ---------------------------------------------------------------
  if (world.targetSecured && world.exit && Math.hypot(player.x - world.exit.x, player.y - world.exit.y) < 30) {
    world.status = 'getaway';
    const timeBonus = Math.min(SCORE.timeBonusCap, Math.max(0, Math.floor(world.def.parSeconds - world.time)) * SCORE.timePerSecond);
    const ghost = world.maxAlarm < ALARM.ghostCeiling;
    const clean = world.maxAlarm < ALARM.huntedAt;
    world.breakdown = {
      loot: world.score,
      timeBonus,
      ghostBonus: ghost ? SCORE.ghostBonus : 0,
      cleanBonus: clean ? SCORE.cleanBonus : 0,
      ghost,
      clean,
      total: world.score + timeBonus + (ghost ? SCORE.ghostBonus : 0) + (clean ? SCORE.cleanBonus : 0),
    };
    audio.getaway();
    return;
  }

  // --- Cameras --------------------------------------------------------------
  let cameraSees = false;
  for (const camera of world.cameras) {
    camera.angle = camera.baseAngle + Math.sin(world.time * camera.speed + camera.phase) * camera.sweep;
    camera.seesPlayer = canSee(world, camera.x, camera.y, camera.angle, CAMERA.sightRange, CAMERA.sightHalfAngle, player.x, player.y);
    if (camera.seesPlayer) cameraSees = true;
  }

  // --- Guards ---------------------------------------------------------------
  let anyChase = false;
  let anySuspicious = false;
  for (const guard of world.guards) {
    guard.bobPhase += dt * 6;
    const sees = canSee(world, guard.x, guard.y, guard.angle, GUARD.sightRange, GUARD.sightHalfAngle, player.x, player.y);
    const dist = Math.hypot(player.x - guard.x, player.y - guard.y);
    if (sees) {
      guard.lastSeen = { x: player.x, y: player.y };
      let gain = GUARD.suspicionGain * (1.25 - Math.min(1, dist / GUARD.sightRange)) * dt;
      if (!player.sneaking) gain *= 1.6;
      if (isCover(world, player.x, player.y)) gain *= 0.5;
      const before = guard.suspicion;
      guard.suspicion = Math.min(100, guard.suspicion + gain);
      if (before < 100 && guard.suspicion >= 100 && guard.state !== 'chase') {
        guard.state = 'chase';
        guard.chaseLeft = GUARD.chaseMemory;
        audio.spotted();
        pushEvent(world, 'spotted', 'Spotted! Break line of sight!');
      }
      if (guard.state === 'chase') guard.chaseLeft = GUARD.chaseMemory;
    } else {
      guard.suspicion = Math.max(0, guard.suspicion - GUARD.suspicionDecay * dt);
    }
    if (guard.suspicion >= 60 && guard.state === 'patrol') guard.state = 'suspicious';
    if (guard.state === 'suspicious' && guard.suspicion < 25) guard.state = 'patrol';

    if (guard.state === 'patrol') {
      const wp = guard.waypoints[guard.waypointIndex];
      if (guard.pauseLeft > 0) {
        guard.pauseLeft -= dt;
        guard.angle += Math.sin(world.time * 0.8 + guard.bobPhase) * 0.01;
      } else if (guardMove(world, guard, wp.x, wp.y, GUARD.patrolSpeed, dt)) {
        guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
        guard.pauseLeft = guard.pause;
      }
    } else if (guard.state === 'suspicious') {
      // Turn toward the last seen spot and creep toward it.
      if (guard.lastSeen) {
        const want = Math.atan2(guard.lastSeen.y - guard.y, guard.lastSeen.x - guard.x);
        guard.angle += angleDiff(want, guard.angle) * Math.min(1, dt * 4);
        guardMove(world, guard, guard.lastSeen.x, guard.lastSeen.y, GUARD.patrolSpeed * 0.9, dt);
      }
    } else if (guard.state === 'chase') {
      anyChase = true;
      if (sees) {
        guardMove(world, guard, player.x, player.y, GUARD.chaseSpeed, dt);
      } else {
        guard.chaseLeft -= dt;
        if (guard.lastSeen) guardMove(world, guard, guard.lastSeen.x, guard.lastSeen.y, GUARD.searchSpeed, dt);
        if (guard.chaseLeft <= 0) {
          guard.state = 'search';
          guard.searchLeft = 5;
        }
      }
      if (Math.hypot(player.x - guard.x, player.y - guard.y) < GUARD.touchRadius) {
        world.status = 'caught';
        world.statusReason = 'A guard grabbed you.';
        audio.caught();
        return;
      }
    } else if (guard.state === 'search') {
      anySuspicious = true;
      guard.searchLeft -= dt;
      if (guard.lastSeen) {
        guardMove(world, guard, guard.lastSeen.x, guard.lastSeen.y, GUARD.searchSpeed, dt);
      } else {
        guard.angle += dt * 1.5;
      }
      if (guard.searchLeft <= 0) {
        guard.state = 'return';
      }
    } else if (guard.state === 'investigate') {
      if (guard.investigateAt) {
        if (guardMove(world, guard, guard.investigateAt.x, guard.investigateAt.y, GUARD.patrolSpeed * 1.15, dt)) {
          guard.investigateLeft -= dt;
          guard.angle += dt * 2.2;
          if (guard.investigateLeft <= 0) {
            guard.state = 'return';
            guard.investigateAt = null;
          }
        }
      } else {
        guard.state = 'return';
      }
    } else if (guard.state === 'return') {
      // Walk back to the nearest waypoint, then resume the patrol.
      let best = guard.waypoints[0];
      let bestDist = Infinity;
      for (const wp of guard.waypoints) {
        const d = Math.hypot(wp.x - guard.x, wp.y - guard.y);
        if (d < bestDist) {
          best = wp;
          bestDist = d;
        }
      }
      if (guardMove(world, guard, best.x, best.y, GUARD.patrolSpeed, dt)) {
        guard.waypointIndex = guard.waypoints.indexOf(best);
        guard.state = 'patrol';
        guard.suspicion = 0;
      }
    }
    if (guard.state === 'suspicious' || guard.state === 'search') anySuspicious = true;
  }

  // --- Alarm ------------------------------------------------------------------
  const hunted = world.alarm >= ALARM.huntedAt;
  if (cameraSees) world.alarm = Math.min(100, world.alarm + CAMERA.alarmGain * dt);
  if (anyChase) world.alarm = Math.min(100, world.alarm + ALARM.chaseGain * dt);
  if (hunted) {
    // Hunted: every guard converges on the thief's last known position.
    for (const guard of world.guards) {
      if (guard.state === 'patrol' || guard.state === 'suspicious') {
        guard.state = 'search';
        guard.searchLeft = 6;
        if (!guard.lastSeen) guard.lastSeen = { x: player.x, y: player.y };
      }
    }
    world.alarm = Math.max(0, world.alarm - ALARM.decayHunted * dt * (cameraSees || anyChase ? 0 : 1));
  } else if (!cameraSees && !anyChase && !anySuspicious) {
    world.alarm = Math.max(0, world.alarm - ALARM.decayCalm * dt);
  }
  world.maxAlarm = Math.max(world.maxAlarm, world.alarm);
  if (world.alarm >= ALARM.bustedAt) {
    world.status = 'caught';
    world.statusReason = 'The alarm hit 100 — the building locked down.';
    audio.caught();
    return;
  }
  if (world.alarm >= ALARM.huntedAt && !world.huntedAnnounced) {
    world.huntedAnnounced = true;
    pushEvent(world, 'alarm', 'HUNTED — every guard is coming for you.');
  }
  if (world.alarm < ALARM.huntedAt) world.huntedAnnounced = false;

  audio.alarmPulse(dt, world.alarm);
}
