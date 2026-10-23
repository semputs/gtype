# GalType (gtype)

Claude's version of GalType, a typing game where hypnotized festival-goers run at you with love confessions and you type their lines to snap them out of it. See the design doc for the full plan (5 stages, bosses, story).

**Play:** https://semput.com/gtype/

## Current build: 2 stages
- **Stage 1 · Main Hall:** Hana, Mio, Rei, Sayaka, Nemu, then the boss **Kaede** (festival committee chair).
- **Stage 2 · Sports Complex:** Chika, Ayame, Haruka, Tomoe, Hana, Sayaka, then the boss **Akira (Super)**.
- Regular girls run or walk at their own speed (Hana and Tomoe sprint, Nemu shuffles). Each has two movement frames, a waist-up **flustered** close-up when she reaches you (1.6 s fuse to still type her word) and her own comical **rejected** pose.
- **Bosses** hover and drift down the hall with a glowing aura. Each finished line, or a line you run out of time on (yellow timer bar), makes her dash a step closer, leaving afterimages. Her **last two lines** she says right in your face as a flustered close-up; running out of time there costs a heart and knocks her back down the hall.
- Clearing stage 1 gives back one heart. "Skip to stage 2" on the title screen jumps straight there. **Slow motion** (bottom left) plays at 35% speed.

Everyone wears the festival whites (white blouse, white mid-thigh skirt, white sneakers) plus their own fixed accessories; club members wear their club gear.

## Files
- `index.html` — page, styles and screens. `game.js` — the game.
- `assets/sprites/<girl>_walk1|walk2|flustered|defeated.webp` — transparent sprites; `meta.js` lists frames whose canvas is taller than walk1.
- `assets/bg/stage1.jpg`, `stage2.jpg` — one-point-perspective backgrounds (horizon at 54% of the height, `hz` in `game.js`).
- `tools/cut.py` — background removal (line art works as a wall, so white clothes survive). `tools/build_sprites.py` — turns chosen renders into aligned sprites (walk2 for regular girls = walk1 mirrored with the head kept).

All art generated in ComfyUI with Animagine XL 4.0 (832×1216 sprites, 1344×768 backgrounds, 28 steps, CFG 5, euler_ancestral). Flustered and rejected frames were partly made image-to-image from each girl's approved run frame to keep her outfit consistent.

## Branches
- `main` — the 2D game.
- `3d` — the parked three.js/VRM version.

## Hosting
Static files. Serve the folder as-is at `/gtype/`; updating is a `git pull`.
