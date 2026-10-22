# GalType (gtype)

Claude's version of GalType, a typing game where hypnotized students run at you with love confessions and you type their lines to snap them out of it. See the design doc for the full plan (5 stages, bosses, story).

**Play:** https://semput.com/gtype/

## Current build: Hana animation demo
A 2D test of the sprite animation, with Hana only:
- **Run 1 / Run 2:** two frames that alternate while she runs toward you (`STEP_TIME`, 0.16 s per frame).
- **Flustered:** when she reaches you she cuts to a half-body close-up right in your face, flustered, for 1.6 s (`FRONT_HOLD`). Her bubble turns red with a draining fuse. You can still type her word to save yourself.
- **Defeated:** a comical overreaction to being rejected (wailing, clutching her head, tears flying), shown whenever you finish her word, running or up close.
- **Slow motion** button (bottom left) plays the demo at 35% speed so you can inspect the frames.

## Files
- `index.html` — the whole game, no build step.
- `assets/sprites/hana_walk1.png`, `hana_walk2.png`, `hana_flustered.png`, `hana_defeated.png` — transparent PNGs. The run frames share a 574×760 canvas (same scale, feet on the bottom edge, body centred) so they swap without jumping. The flustered frame is a half-body close-up anchored to the bottom of the screen; the defeated canvas is 1.195× taller to fit the flying tears (`FRAME_H`).

Sprites were generated in ComfyUI (Animagine XL 4.0, 832×1216, 28 steps, CFG 5, euler_ancestral; both run frames share one seed) and cut out with an OpenCV flood-fill script.

## Branches
- `main` — the 2D game (this demo for now).
- `3d` — the parked three.js/VRM version.

## Hosting
Static files. Serve the folder as-is at `/gtype/`; updating is a `git pull`.
