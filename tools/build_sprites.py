"""Turn chosen ComfyUI renders into game sprites.

usage: python3 -I tools/build_sprites.py picks.json raw_dir out_dir
picks.json: { "hana": {"run": "x_hana_run_2", "dash": null, "flus": "...", "defe": "...",
                       "flus_crop": .47, "defe_scale": 1.0}, ... }
- walk1 = run frame; walk2 = dash frame, or the run frame mirrored with the original head pasted back
- run/dash/defeated are scaled so the figure's height matches (defe_scale shrinks crouching poses)
- flustered = the full-body render cropped to waist-up
Writes <c>_<frame>.webp plus meta.js (canvas heights relative to walk1, used by game.js).
"""
import json, os, subprocess, sys
import cv2, numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
picks, raw, out = json.load(open(sys.argv[1])), sys.argv[2], sys.argv[3]
os.makedirs(out, exist_ok=True)
tmp = os.environ.get('CUT_CACHE') or os.path.join(out, '_cut'); os.makedirs(tmp, exist_ok=True)
H = 760  # walk1 canvas height


def cut(name):
    src = os.path.join(raw, name + '_00001_.png'); dst = os.path.join(tmp, name + '.png')
    if not os.path.exists(dst):
        subprocess.run([sys.executable, '-I', os.path.join(HERE, 'cut.py'), src, dst], check=True, capture_output=True)
    return cv2.imread(dst, cv2.IMREAD_UNCHANGED)


def bbox(im):
    ys, xs = np.where(im[:, :, 3] > 40)
    return im[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def body_cx(im, band=(.15, .6)):
    al = (im[:, :, 3] > 40).astype(np.uint8)
    n, lbl, st, _ = cv2.connectedComponentsWithStats(al)
    big = 1 + np.argmax(st[1:, cv2.CC_STAT_AREA])
    m = (lbl == big).astype(float); h = m.shape[0]
    b = m[int(h * band[0]):int(h * band[1])]
    return (b.sum(0) * np.arange(m.shape[1])).sum() / max(b.sum(), 1)


def mirror_keep_head(im):
    h, w = im.shape[:2]; al = im[:, :, 3] > 40
    top = np.where(al.any(1))[0][0]
    hb = al[top:top + int(h * .18)]; hx = (hb.sum(0) * np.arange(w)).sum() / hb.sum()
    pad = int(abs(w - 2 * hx)) + 4
    im = np.pad(im, ((0, 0), (pad, pad), (0, 0))); hx += pad; w = im.shape[1]
    B = cv2.warpAffine(im, np.float32([[-1, 0, 2 * hx], [0, 1, 0]]), (w, h), flags=cv2.INTER_LINEAR, borderValue=(0, 0, 0, 0))
    neck, fade = top + int(h * .2), int(h * .03)
    wy = np.zeros((h, 1), np.float32); wy[:neck - fade] = 1; wy[neck - fade:neck + fade] = np.linspace(1, 0, 2 * fade)[:, None]
    cols = np.where(hb.any(0))[0] + pad
    sx = np.zeros((1, w), np.float32); sx[0, max(0, cols.min() - 6):min(w, cols.max() + 6)] = 1
    sx = cv2.GaussianBlur(sx, (1, 31), 0)
    m = (wy * sx)[..., None]
    return (im.astype(np.float32) * m + B.astype(np.float32) * (1 - m)).astype(np.uint8)


def fit_h(im, h):
    return cv2.resize(im, (max(1, int(im.shape[1] * h / im.shape[0])), int(h)), interpolation=cv2.INTER_AREA if h < im.shape[0] else cv2.INTER_CUBIC)


def centred(im, cx, canvas_h=None):
    h, w = im.shape[:2]; ch = canvas_h or h
    half = int(max(cx, w - cx)) + 2
    c = np.zeros((ch, 2 * half, 4), np.uint8); x0 = int(round(half - cx))
    c[ch - h:, x0:x0 + w] = im
    return c


meta = {}
for c, p in picks.items():
    fig = H * .95
    run = bbox(cut(p['run']))
    walk1 = fit_h(run, fig)
    if p.get('dash'):
        walk2 = fit_h(bbox(cut(p['dash'])), fig * p.get('dash_scale', 1))
    else:
        walk2 = bbox(mirror_keep_head(walk1))
    defe = fit_h(bbox(cut(p['defe'])), fig * p.get('defe_scale', 1))
    frames = {'walk1': walk1, 'walk2': walk2, 'defeated': defe}
    m = {}
    for f, im in frames.items():
        img = centred(im, body_cx(im), max(H, im.shape[0]) if f != 'walk1' else H)
        cv2.imwrite(os.path.join(out, f'{c}_{f}.webp'), img, [cv2.IMWRITE_WEBP_QUALITY, 90])
        if img.shape[0] != H: m[f] = round(img.shape[0] / H, 3)
    # flustered: waist-up crop of a full-body render
    fl = bbox(cut(p['flus'])); fl = fl[:int(fl.shape[0] * p.get('flus_crop', .47))]
    fl = bbox(np.concatenate([fl, np.zeros((1, fl.shape[1], 4), np.uint8)]))
    fl = fit_h(fl, 900)
    cv2.imwrite(os.path.join(out, f'{c}_flustered.webp'), centred(fl, body_cx(fl, (0, .5))), [cv2.IMWRITE_WEBP_QUALITY, 90])
    if m: meta[c] = m
    print(c, 'ok', m)

mp = os.path.join(out, 'meta.js')
open(mp, 'w').write('window.SPRITE_META = ' + json.dumps(meta) + ';\n')
