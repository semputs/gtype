# GalType 3D

A 3D version of GalType: girls walk down a school hallway toward you, each with a line in a speech bubble. Type it before she reaches you.

**Play:** https://semput.com/gtype/

## How to play
- Type the word in a girl's speech bubble. Your first letter locks onto her; finish the word and she turns and walks off.
- Typos break your combo, drain **Composure**, and make that girl hurry. Hit zero composure and the letters start wobbling.
- If a girl reaches you, you lose a heart. Three hearts per run.
- `Backspace` drops your current target · `Esc` pauses.

| | Style | Look |
|---|---|---|
| **Hana** | short, fast words; she runs | orange hair with buns, coral top |
| **Mio** | her text fades in and out | grey hair, teal beret, mint top |
| **Rei** | long words; slow walk | navy hair, glasses, lavender top |
| **Kaede** (boss) | four full sentences, faster each line | wine-red hair, pink top, gold armband |

## How it's built
- `index.html` is the whole game (HTML, CSS, JavaScript). No build step.
- 3D: [three.js](https://threejs.org) r180 and [three-vrm](https://github.com/pixiv/three-vrm) (pixiv), both MIT licensed, vendored in `lib/` so the game has no outside dependencies except Google Fonts.
- All four characters share one base model (`assets/base.vrm`). The game recolours hair, top, shorts and eyes per character at load time and adds a small accessory (buns, beret, glasses, armband). Walking, running and poses are animated in code; faces use the model's built-in VRM expressions (normal, flustered = surprised, defeated = sad).
- The hallway is built from simple shapes and canvas-drawn textures in code.

## Credits
- Base 3D model: "VRM1_Constraint_Twist_Sample" © 2022 pixiv Inc., from the VRM Consortium's official samples (github.com/vrm-c/vrm-specification), under the VRM Public License 1.0. Its licence allows modification and redistribution, including commercial use, with no credit required (credited anyway). Textures were downscaled to 1024px for faster loading.
- three.js © three.js authors (MIT) · three-vrm © pixiv Inc. (MIT).

## Hosting
Static files only. Serve the folder as-is at `/gtype/`. The server should send `.vrm` files with any binary content type (for example `application/octet-stream`).

## Swapping in your own characters later
Make a character in VRoid Studio, export it as `.vrm`, and the loader can take it in place of `base.vrm` (one file per character would need a small code change in `loadPool()` and `dress()`).
