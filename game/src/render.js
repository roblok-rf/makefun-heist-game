// The Meridian Job — canvas rendering: the room, the cones, the thief, the HUD
// and every screen (title, briefing, pause, caught, getaway, win). The palette
// is deliberate: gold = loot, yellow = guard sight, red = camera sight, green =
// safety and the exit, so danger and value read at a glance even shrunk.

import { ALARM, COLS, GUARD, ROWS, TILE, VIEW_H, VIEW_W } from './config.js';
import { makeRng } from './rng.js';

const GOLD = '#e8b64c';
const GOLD_DIM = '#8a6d2f';
const INK = '#0d1117';
const FLOOR_A = '#232a33';
const FLOOR_B = '#1f252d';
const WALL = '#3a4552';
const WALL_TOP = '#55637a';
const COVER = '#1d3a2a';
const COVER_EDGE = '#2c5a40';

function conePath(ctx, x, y, angle, range, halfAngle) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
}

function drawCone(ctx, x, y, angle, range, halfAngle, fill, edge) {
  conePath(ctx, x, y, angle, range, halfAngle);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawRoom(ctx, world) {
  // Floor: two-tone checker with a faint seeded speckle so rooms feel built.
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const x = col * TILE;
      const y = row * TILE;
      if (world.walls[row][col]) {
        ctx.fillStyle = WALL;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = WALL_TOP;
        ctx.fillRect(x, y, TILE, 5);
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
      } else if (world.cover[row][col]) {
        ctx.fillStyle = COVER;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.strokeStyle = COVER_EDGE;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 3.5, y + 3.5, TILE - 7, TILE - 7);
        // Planter leaves.
        ctx.fillStyle = '#3f7d52';
        ctx.beginPath();
        ctx.arc(x + TILE / 2, y + TILE / 2, 6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = (row + col) % 2 === 0 ? FLOOR_A : FLOOR_B;
        ctx.fillRect(x, y, TILE, TILE);
      }
    }
  }

  // Exit door: green, with a lit arrow.
  const exit = world.exit;
  if (exit) {
    ctx.fillStyle = '#123f2a';
    ctx.fillRect(exit.x - 18, exit.y - 18, 36, 36);
    ctx.strokeStyle = '#37d67a';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(exit.x - 18, exit.y - 18, 36, 36);
    ctx.fillStyle = '#37d67a';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EXIT', exit.x, exit.y);
  }

  // Loot cases and pickups.
  for (const item of world.loot) {
    if (item.taken) continue;
    const pulse = 0.6 + 0.4 * Math.sin(world.time * 3 + item.sparkle);
    if (item.kind === 'smoke') {
      ctx.fillStyle = '#8b9bb4';
      ctx.beginPath();
      ctx.arc(item.x, item.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#dfe7f2';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('S', item.x, item.y);
    } else if (item.kind === 'coins') {
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.arc(item.x, item.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5a4510';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('¢', item.x, item.y);
    } else {
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = `rgba(232,182,76,${0.75 + 0.25 * pulse})`;
      ctx.fillRect(-8, -8, 16, 16);
      ctx.strokeStyle = '#fff2c9';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-8, -8, 16, 16);
      ctx.restore();
    }
  }

  // Target case: a big gold case with a pulsing ring and a label.
  const target = world.target;
  if (target && !target.cracked) {
    const pulse = 0.5 + 0.5 * Math.sin(world.time * 4);
    ctx.strokeStyle = `rgba(255,214,102,${0.5 + 0.5 * pulse})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(target.x, target.y, 26 + pulse * 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#3a2c08';
    ctx.fillRect(target.x - 15, target.y - 12, 30, 24);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.strokeRect(target.x - 15, target.y - 12, 30, 24);
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.moveTo(target.x, target.y - 7);
    ctx.lineTo(target.x + 6, target.y + 1);
    ctx.lineTo(target.x, target.y + 8);
    ctx.lineTo(target.x - 6, target.y + 1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TARGET', target.x, target.y - 34);
    if (target.progress > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(target.x - 24, target.y + 22, 48, 7);
      ctx.fillStyle = GOLD;
      ctx.fillRect(target.x - 24, target.y + 22, 48 * target.progress, 7);
    }
  }

  // Thrown coins on the floor.
  for (const coin of world.coins) {
    ctx.fillStyle = coin.landed ? GOLD : '#f5d67a';
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, coin.landed ? 6 : 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Smoke clouds.
  for (const smoke of world.smokes) {
    const alpha = Math.min(0.75, (smoke.left / 3.5) * 0.8 + 0.15);
    const gradient = ctx.createRadialGradient(smoke.x, smoke.y, 4, smoke.x, smoke.y, smoke.radius);
    gradient.addColorStop(0, `rgba(180,190,205,${alpha})`);
    gradient.addColorStop(1, 'rgba(180,190,205,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(smoke.x, smoke.y, smoke.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWatcherCones(ctx, world) {
  for (const camera of world.cameras) {
    drawCone(
      ctx, camera.x, camera.y, camera.angle, 265, 0.44,
      camera.seesPlayer ? 'rgba(255,59,48,0.34)' : 'rgba(255,59,48,0.16)',
      camera.seesPlayer ? 'rgba(255,120,110,0.9)' : 'rgba(255,120,110,0.45)',
    );
  }
  for (const guard of world.guards) {
    const hot = guard.state === 'chase' || guard.suspicion >= 60;
    drawCone(
      ctx, guard.x, guard.y, guard.angle, GUARD.sightRange, 0.61,
      hot ? 'rgba(255,204,0,0.34)' : 'rgba(255,204,0,0.17)',
      hot ? 'rgba(255,220,80,0.9)' : 'rgba(255,220,80,0.5)',
    );
  }
}

function drawGuard(ctx, guard, time) {
  const bob = Math.sin(guard.bobPhase) * 1.5;
  ctx.save();
  ctx.translate(guard.x, guard.y + bob);
  ctx.fillStyle = guard.state === 'chase' ? '#c0392b' : '#5b6b7f';
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#dfe7f2';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Facing tick.
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(guard.angle) * 17, Math.sin(guard.angle) * 17);
  ctx.stroke();
  // Eyes.
  const ex = Math.cos(guard.angle);
  const ey = Math.sin(guard.angle);
  const px = -ey;
  const py = ex;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(ex * 5 + px * 4, ey * 5 + py * 4, 2.4, 0, Math.PI * 2);
  ctx.arc(ex * 5 - px * 4, ey * 5 - py * 4, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Suspicion / alert mark.
  if (guard.state === 'chase') {
    drawMark(ctx, guard.x, guard.y - 26, '!', '#ff3b30');
  } else if (guard.suspicion >= 25) {
    drawMark(ctx, guard.x, guard.y - 26, '?', '#ffcc00');
  }
  // Suspicion bar while it builds.
  if (guard.suspicion > 2 && guard.suspicion < 100) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(guard.x - 16, guard.y - 38, 32, 5);
    ctx.fillStyle = guard.suspicion >= 60 ? '#ff3b30' : '#ffcc00';
    ctx.fillRect(guard.x - 16, guard.y - 38, 32 * (guard.suspicion / 100), 5);
  }
  void time;
}

function drawMark(ctx, x, y, text, color) {
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(0,0,0,0.8)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function drawCamera(ctx, camera) {
  ctx.save();
  ctx.translate(camera.x, camera.y);
  ctx.fillStyle = '#2c3644';
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = camera.seesPlayer ? '#ff3b30' : '#8b9bb4';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.rotate(camera.angle);
  ctx.fillStyle = '#3a4552';
  ctx.fillRect(0, -5, 16, 10);
  ctx.fillStyle = camera.seesPlayer ? '#ff3b30' : '#ff5b52';
  ctx.beginPath();
  ctx.arc(16, 0, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPlayer(ctx, player) {
  ctx.save();
  ctx.translate(player.x, player.y);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 9, 13, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Cloak.
  ctx.rotate(player.angle + Math.PI / 2);
  ctx.fillStyle = player.sneaking ? '#2f4a68' : '#1d2f47';
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(11, 10);
  ctx.lineTo(-11, 10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#7fb2e5';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Hood + mask.
  ctx.fillStyle = '#e8e4d8';
  ctx.beginPath();
  ctx.arc(0, -2, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111827';
  ctx.fillRect(-5, -4, 10, 3);
  ctx.restore();
  if (player.crackHeld) {
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText('CRACKING…', player.x, player.y - 26);
  }
}

function drawHud(ctx, world, screen) {
  const alarm = world.alarm;
  ctx.fillStyle = 'rgba(5,8,12,0.82)';
  ctx.fillRect(0, 0, VIEW_W, 46);
  ctx.fillStyle = '#e8e4d8';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(world.def.name.toUpperCase(), 16, 24);

  // Alarm meter.
  const mx = 430;
  const mw = 320;
  ctx.fillStyle = '#10151c';
  roundRect(ctx, mx, 13, mw, 20, 10);
  ctx.fill();
  const frac = alarm / 100;
  const alarmColor = alarm >= ALARM.bustedAt ? '#ff3b30' : alarm >= ALARM.huntedAt ? '#ff9500' : '#37d67a';
  ctx.fillStyle = alarmColor;
  if (frac > 0) {
    roundRect(ctx, mx, 13, Math.max(12, mw * frac), 20, 10);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(mx + mw * 0.55 - 0.5, 11, 1, 24);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(alarm >= ALARM.huntedAt ? 'HUNTED' : 'ALARM', mx - 62, 24);
  ctx.fillStyle = alarmColor;
  ctx.fillText(`${Math.floor(alarm)}`, mx + mw + 10, 24);

  // Score, tools, timer.
  ctx.fillStyle = '#e8b64c';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`$${world.score.toLocaleString('en-US')}`, 1000, 24);
  ctx.fillStyle = '#dfe7f2';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText(`◉ ${world.coinsLeft}   ☁ ${world.smokeLeft}`, 1120, 24);
  const mins = Math.floor(world.time / 60);
  const secs = Math.floor(world.time % 60);
  ctx.fillText(`${mins}:${String(secs).padStart(2, '0')}`, 1264, 24);

  // Objective line.
  ctx.fillStyle = 'rgba(5,8,12,0.72)';
  ctx.fillRect(0, VIEW_H - 30, VIEW_W, 30);
  ctx.fillStyle = '#ffe9a8';
  ctx.font = '13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  const objective = world.targetSecured
    ? 'Target secured — reach the green EXIT.'
    : 'Hold E at the gold TARGET case to crack it. WASD move · Shift sneak · Q smoke · click throws a coin.';
  ctx.fillText(objective, 16, VIEW_H - 15);

  // Recent events, top-left under the bar.
  ctx.textAlign = 'left';
  world.events.slice(-3).forEach((event, i) => {
    const age = world.time - event.at;
    if (age > 6) return;
    ctx.globalAlpha = Math.max(0, 1 - age / 6);
    ctx.fillStyle = event.kind === 'spotted' || event.kind === 'alarm' ? '#ff8a80' : '#cfe3ff';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(event.text, 16, 66 + i * 20);
    ctx.globalAlpha = 1;
  });

  // Off-screen objective arrow.
  const dest = world.targetSecured ? world.exit : world.target;
  if (dest && screen === 'play') {
    const dx = dest.x - world.player.x;
    const dy = dest.y - world.player.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 320) {
      const angle = Math.atan2(dy, dx);
      const ax = world.player.x + Math.cos(angle) * 90;
      const ay = world.player.y + Math.sin(angle) * 90;
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(angle);
      ctx.fillStyle = world.targetSecured ? '#37d67a' : GOLD;
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-8, -8);
      ctx.lineTo(-8, 8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(6,10,15,0.88)';
  roundRect(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(232,182,76,0.55)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawTitle(ctx, time) {
  ctx.fillStyle = '#0a0e14';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // A faint gallery floor and a sweeping guard cone behind the title.
  const rng = makeRng(7);
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = i % 2 ? '#141a22' : '#11161d';
    ctx.fillRect(Math.floor(rng() * 32) * TILE, Math.floor(rng() * 18) * TILE, TILE, TILE);
  }
  const sweep = Math.sin(time * 0.35) * 0.7;
  drawCone(ctx, 1060, 130, Math.PI * 0.62 + sweep, 300, 0.5, 'rgba(255,204,0,0.10)', 'rgba(255,204,0,0.25)');
  drawCone(ctx, 220, 600, -Math.PI * 0.3 + sweep * 0.5, 260, 0.4, 'rgba(255,59,48,0.10)', 'rgba(255,59,48,0.25)');

  ctx.textAlign = 'center';
  ctx.fillStyle = GOLD;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText('A TOP-DOWN STEALTH HEIST IN THREE JOBS', VIEW_W / 2, 168);
  ctx.fillStyle = '#f2ead8';
  ctx.font = 'bold 84px Georgia, serif';
  ctx.fillText('THE MERIDIAN JOB', VIEW_W / 2, 258);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(330, 292);
  ctx.lineTo(950, 292);
  ctx.stroke();
  ctx.fillStyle = '#cfe3ff';
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText('Three heists. One crew of one. Guards, cameras, and an alarm', VIEW_W / 2, 336);
  ctx.fillText('that never forgets — crack the case and walk out rich.', VIEW_W / 2, 366);

  panel(ctx, 390, 410, 500, 168);
  ctx.fillStyle = '#e8e4d8';
  ctx.font = '15px system-ui, sans-serif';
  const lines = [
    'WASD / arrows — move        Shift — sneak',
    'Hold E — crack the target case',
    'Q — smoke bomb        Click — throw a coin lure',
    'P / Esc — pause        M — mute',
  ];
  lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, 442 + i * 30));
  ctx.fillStyle = GOLD;
  ctx.font = 'bold 22px system-ui, sans-serif';
  const blink = 0.55 + 0.45 * Math.sin(time * 4);
  ctx.globalAlpha = blink;
  ctx.fillText('PRESS ENTER TO START THE FIRST HEIST', VIEW_W / 2, 640);
  ctx.globalAlpha = 1;
}

function drawBriefing(ctx, heist, index) {
  ctx.fillStyle = '#0a0e14';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = GOLD;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText(`HEIST ${index + 1} OF 3`, VIEW_W / 2, 150);
  ctx.fillStyle = '#f2ead8';
  ctx.font = 'bold 52px Georgia, serif';
  ctx.fillText(heist.name.replace(/^Heist \d — /, ''), VIEW_W / 2, 220);
  panel(ctx, 290, 260, 700, 210);
  ctx.fillStyle = '#dfe7f2';
  ctx.font = '18px system-ui, sans-serif';
  const words = heist.brief.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length > 62) {
      lines.push(current.trim());
      current = word;
    } else {
      current += ' ' + word;
    }
  }
  lines.push(current.trim());
  lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, 300 + i * 30));
  ctx.fillStyle = '#8b9bb4';
  ctx.font = 'italic 16px system-ui, sans-serif';
  ctx.fillText(heist.tip, VIEW_W / 2, 300 + lines.length * 30 + 12);
  ctx.fillStyle = '#dfe7f2';
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText(
    `${heist.guards.length} guard${heist.guards.length === 1 ? '' : 's'} · ${heist.cameras.length} camera${heist.cameras.length === 1 ? '' : 's'} · par ${heist.parSeconds}s for the time bonus`,
    VIEW_W / 2,
    300 + lines.length * 30 + 44,
  );
  ctx.fillStyle = GOLD;
  ctx.font = 'bold 20px system-ui, sans-serif';
  const blink = 0.55 + 0.45 * Math.sin(Date.now() / 280);
  ctx.globalAlpha = blink;
  ctx.fillText('PRESS ENTER TO BEGIN', VIEW_W / 2, 560);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#8b9bb4';
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText('Stay out of the yellow cones. Red cones are cameras. Alarm 55 means hunted, 100 means busted.', VIEW_W / 2, 610);
}

function drawPause(ctx) {
  ctx.fillStyle = 'rgba(5,8,12,0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f2ead8';
  ctx.font = 'bold 56px Georgia, serif';
  ctx.fillText('PAUSED', VIEW_W / 2, 320);
  ctx.fillStyle = '#cfe3ff';
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillText('P or Esc to resume · R to restart this heist · M to mute', VIEW_W / 2, 372);
}

function drawCaught(ctx, world) {
  ctx.fillStyle = 'rgba(20,4,4,0.82)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff6b60';
  ctx.font = 'bold 72px Georgia, serif';
  ctx.fillText('BUSTED', VIEW_W / 2, 280);
  ctx.fillStyle = '#f2ead8';
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText(world.statusReason || 'The crew got caught.', VIEW_W / 2, 330);
  ctx.fillStyle = '#cfe3ff';
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillText(`Loot kept: $${world.score.toLocaleString('en-US')} · Alarm peaked at ${Math.floor(world.maxAlarm)}`, VIEW_W / 2, 380);
  ctx.fillStyle = GOLD;
  ctx.font = 'bold 22px system-ui, sans-serif';
  const blink = 0.55 + 0.45 * Math.sin(Date.now() / 280);
  ctx.globalAlpha = blink;
  ctx.fillText('PRESS R TO TRY THE HEIST AGAIN', VIEW_W / 2, 470);
  ctx.globalAlpha = 1;
}

function drawGetaway(ctx, world, heistIndex, totalHeists) {
  ctx.fillStyle = 'rgba(4,16,8,0.86)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#37d67a';
  ctx.font = 'bold 60px Georgia, serif';
  ctx.fillText('CLEAN GETAWAY', VIEW_W / 2, 210);
  ctx.fillStyle = '#f2ead8';
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText(`${world.def.name} — the case is yours and the door is behind you.`, VIEW_W / 2, 256);
  const b = world.breakdown;
  panel(ctx, 430, 300, 420, 220);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#dfe7f2';
  ctx.font = '18px system-ui, sans-serif';
  const rows = [
    ['Loot this heist', `$${b.loot.toLocaleString('en-US')}`],
    ['Time bonus', `+$${b.timeBonus.toLocaleString('en-US')}`],
    ['Ghost bonus', b.ghost ? `+$${b.ghostBonus.toLocaleString('en-US')}` : '—'],
    ['Clean bonus', b.clean ? `+$${b.cleanBonus.toLocaleString('en-US')}` : '—'],
    ['Heist total', `$${b.total.toLocaleString('en-US')}`],
  ];
  rows.forEach(([label, value], i) => {
    const y = 336 + i * 34;
    ctx.fillStyle = i === rows.length - 1 ? GOLD : '#dfe7f2';
    ctx.font = i === rows.length - 1 ? 'bold 20px system-ui, sans-serif' : '18px system-ui, sans-serif';
    ctx.fillText(label, 460, y);
    ctx.textAlign = 'right';
    ctx.fillText(value, 820, y);
    ctx.textAlign = 'left';
  });
  ctx.textAlign = 'center';
  ctx.fillStyle = GOLD;
  ctx.font = 'bold 22px system-ui, sans-serif';
  const blink = 0.55 + 0.45 * Math.sin(Date.now() / 280);
  ctx.globalAlpha = blink;
  ctx.fillText(heistIndex + 1 < totalHeists ? 'PRESS ENTER FOR THE NEXT HEIST' : 'PRESS ENTER FOR THE FINAL SCORE', VIEW_W / 2, 590);
  ctx.globalAlpha = 1;
}

function drawWin(ctx, totalScore, perHeist) {
  ctx.fillStyle = '#0a0e14';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = GOLD;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText('ALL THREE HEISTS COMPLETE', VIEW_W / 2, 150);
  ctx.fillStyle = '#f2ead8';
  ctx.font = 'bold 64px Georgia, serif';
  ctx.fillText('THE MERIDIAN JOB', VIEW_W / 2, 226);
  ctx.fillText('IS DONE', VIEW_W / 2, 296);
  panel(ctx, 430, 340, 420, 190);
  ctx.fillStyle = '#dfe7f2';
  ctx.font = '18px system-ui, sans-serif';
  ctx.textAlign = 'left';
  perHeist.forEach((score, i) => {
    ctx.fillText(`Heist ${i + 1}`, 470, 382 + i * 34);
    ctx.textAlign = 'right';
    ctx.fillText(`$${score.toLocaleString('en-US')}`, 810, 382 + i * 34);
    ctx.textAlign = 'left';
  });
  ctx.fillStyle = GOLD;
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText('Total take', 470, 382 + 3 * 34);
  ctx.textAlign = 'right';
  ctx.fillText(`$${totalScore.toLocaleString('en-US')}`, 810, 382 + 3 * 34);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#cfe3ff';
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillText('Three cases cracked, three exits walked through, nobody caught.', VIEW_W / 2, 580);
  const blink = 0.55 + 0.45 * Math.sin(Date.now() / 280);
  ctx.globalAlpha = blink;
  ctx.fillStyle = GOLD;
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText('PRESS ENTER TO PLAY AGAIN', VIEW_W / 2, 640);
  ctx.globalAlpha = 1;
}

export function render(ctx, game) {
  const { screen, world, time } = game;
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  if (screen === 'title') {
    drawTitle(ctx, time);
    return;
  }
  if (screen === 'briefing') {
    drawBriefing(ctx, world.def, world.heistIndex);
    return;
  }
  if (screen === 'win') {
    drawWin(ctx, game.totalScore, game.perHeist);
    return;
  }
  // Play, pause, caught and getaway all show the room underneath.
  drawRoom(ctx, world);
  drawWatcherCones(ctx, world);
  for (const camera of world.cameras) drawCamera(ctx, camera);
  for (const guard of world.guards) drawGuard(ctx, guard, time);
  drawPlayer(ctx, world.player);
  drawHud(ctx, world, screen);
  if (screen === 'pause') drawPause(ctx);
  else if (screen === 'caught') drawCaught(ctx, world);
  else if (screen === 'getaway') drawGetaway(ctx, world, world.heistIndex, 3);
}
