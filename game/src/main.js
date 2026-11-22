// The Meridian Job — game entry point: the loop, the screen state machine and
// the wiring between input, world, audio and render. Screens: title, briefing,
// play, pause, caught, getaway, win. ?shot= stages a screenshot scene instead.

import { HEISTS, VIEW_H, VIEW_W } from './config.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { render } from './render.js';
import { stageShot } from './shots.js';
import { createWorld, updateWorld } from './world.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = createInput(canvas);
const audio = createAudio();
const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || '1') || 1;
const shot = params.get('shot');

// Record page errors where a headless check can read them.
window.__errors = [];
window.addEventListener('error', (event) => {
  window.__errors.push(String(event.message || event.error || 'error'));
});

const game = {
  screen: 'title',
  world: createWorld(0, seed),
  time: 0,
  totalScore: 0,
  perHeist: [],
  shotStaged: null,
};

function startHeist(index) {
  game.world = createWorld(index, seed);
  game.screen = 'briefing';
}

function beginPlay() {
  game.screen = 'play';
}

function advanceAfterGetaway() {
  const world = game.world;
  game.totalScore += world.breakdown.total;
  game.perHeist.push(world.breakdown.total);
  if (world.heistIndex + 1 < HEISTS.length) {
    startHeist(world.heistIndex + 1);
  } else {
    game.screen = 'win';
  }
}

function restartHeist() {
  startHeist(game.world.heistIndex);
  game.screen = 'briefing';
}

function restartAll() {
  game.totalScore = 0;
  game.perHeist = [];
  startHeist(0);
}

function handleKeys() {
  if (input.wasPressed('m')) {
    const muted = audio.toggleMute();
    document.getElementById('mute-note').textContent = muted ? 'Muted (M to unmute)' : '';
  }
  if (input.wasPressed('Enter')) audio.unlock();

  switch (game.screen) {
    case 'title':
      if (input.wasPressed('Enter') || input.wasPressed(' ')) {
        audio.unlock();
        audio.click();
        startHeist(0);
      }
      break;
    case 'briefing':
      if (input.wasPressed('Enter') || input.wasPressed(' ')) {
        audio.click();
        beginPlay();
      }
      break;
    case 'play':
      if (input.wasPressed('p') || input.wasPressed('Escape')) {
        game.screen = 'pause';
        audio.click();
      } else if (input.wasPressed('r')) {
        restartHeist();
      }
      break;
    case 'pause':
      if (input.wasPressed('p') || input.wasPressed('Escape') || input.wasPressed('Enter')) {
        game.screen = 'play';
        audio.click();
      } else if (input.wasPressed('r')) {
        restartHeist();
      }
      break;
    case 'caught':
      if (input.wasPressed('r') || input.wasPressed('Enter')) {
        restartHeist();
      }
      break;
    case 'getaway':
      if (input.wasPressed('Enter') || input.wasPressed(' ')) {
        audio.click();
        advanceAfterGetaway();
      }
      break;
    case 'win':
      if (input.wasPressed('Enter') || input.wasPressed(' ')) {
        audio.click();
        restartAll();
      }
      break;
    default:
      break;
  }
}

let last = performance.now();

function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  game.time += dt;
  handleKeys();
  if (game.screen === 'play') {
    updateWorld(game.world, input, audio, dt);
    if (game.world.status === 'caught') game.screen = 'caught';
    else if (game.world.status === 'getaway') game.screen = 'getaway';
  }
  render(ctx, game);
  input.endFrame();
  requestAnimationFrame(frame);
}

// A handle for headless play-tests (and curious players in the console).
window.__game = game;

if (shot) {
  stageShot(game, shot, seed);
  // One staged frame now, then the loop keeps the scene alive and animated.
  render(ctx, game);
  window.__gameReady = true;
  window.__shotReady = true;
  requestAnimationFrame(frame);
} else {
  window.__gameReady = true;
  requestAnimationFrame(frame);
}
