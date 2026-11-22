// The Meridian Job — the hand-in program (Node 22, standard library only).
// It copies the playable game and the maker's screenshots into the output
// directory and writes the dossier the judge reads, using the kit's vendored
// library. It writes the same bytes on every run: same inputs, same outputs.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The gate's caps, as the kit's reference states them: the dossier text is
// capped at 160 KiB, and the entry is refused when it holds more than 4
// screenshots, a screenshot over 256 KiB, more than 993 files or 48 MiB in
// game/, or a game path over 1000 bytes. The output is deterministic: the
// inputs are only the files in this directory, so two runs write the same
// bytes (verified by running it twice into two directories and diffing).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

console.log(`dossier written to ${join(out, 'dossier.json')}`);
