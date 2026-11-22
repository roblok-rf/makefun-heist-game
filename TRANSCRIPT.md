# TRANSCRIPT.md — The Meridian Job build notes

## What was built

"The Meridian Job", a top-down stealth heist game in three heists (Gallery /
Vault Below / Penthouse), written fresh in this session after the bounty opened
(Sun 22 Nov 2026, 12:59 +07). The bounty leaderboard was empty at build time,
so the ATM study drew on the judge's criteria, the house starter, and the
sibling stealth bounty's winning patterns (see MODELS.md).

- Guards with yellow vision cones: patrol → `?` suspicious → `!` chase, with
  line-of-sight blocked by walls, slower spotting on cover rugs and while the
  thief sneaks.
- Sweeping cameras with red cones that feed the alarm directly.
- Hold-E cracking of the gold target case (2.5 s, loud), loot cases, coin
  lures (click to throw), smoke bombs (Q), alarm meter (55 hunted, 100 busted),
  Ghost / Clean / time score bonuses.
- Title, briefing, pause, caught, getaway and final-score screens; WebAudio
  synth effects, no audio files, no network requests, all assets under game/.

## Files

- `game/index.html`, `game/src/config.js` (tuning + 3 heist maps), `rng.js`,
  `input.js`, `audio.js`, `world.js` (simulation), `render.js` (canvas + HUD +
  screens), `shots.js` (deterministic scenes), `main.js` (loop + state machine)
- `main.ts` (hand-in program), `serve.ts` (local server), `shots.json`
- `README.md`, `MODELS.md` (15 concepts, model 11 = this game), `LICENSE` (MIT)

## Verification

- All three heist maps validated as exactly 32×18 tiles with one player start,
  one target, one exit and loot (Node check).
- `node --check` clean on every game module, `main.ts` and `serve.ts`.
- Served locally and loaded in headless Chrome (Chrome-for-Testing via
  Playwright): `?shot=start`, `?shot=play` and `?shot=end` each render with
  zero console errors and zero page errors; `window.__shotReady` set on all
  three scenes. `window.__errors` (a page-error trap in main.js) stayed empty.
- Play-tested headlessly with scripted input: movement, sneak, coin throw,
  smoke, cracking to completion, guard suspicion rising to chase, and the
  alarm climbing — no errors, and the caught/getaway transitions fire.
- `MAKEFUN_OUTPUT_DIR=out node main.ts` run twice into two directories:
  byte-identical outputs (dossier.json included).

## Notes

- `vendor/makefun-game.ts` is the kit's copy, unchanged (sha256 verified).
- `screenshots/` is left empty here on purpose: the parent renders the three
  shots from `shots.json` (1280×720 JPEG, each under 256 KiB) and commits them.
- No bundle, check or submission was run from this session. No payment, no
  seed phrase, no private key involved.
