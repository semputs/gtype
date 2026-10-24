# Cut an anime figure off a (near-)white background.
# usage: python3 -I cut.py in.png out.png
# Line art acts as a wall: background = near-white pixels reachable from the border
# without crossing (slightly thickened) lines, so white clothes inside outlines survive.
import sys, cv2, numpy as np

src, dst = sys.argv[1], sys.argv[2]
img = cv2.imread(src, cv2.IMREAD_COLOR)
h, w = img.shape[:2]
f = img.astype(np.int16)
mx, mn = f.max(2), f.min(2)
sat = mx - mn
gray = f.mean(2)

bglike = (mn >= 228) & (sat <= 18)
# non-white backdrops (flat greys): anything close to the border's median colour
border_px = np.concatenate([f[0], f[-1], f[:, 0], f[:, -1]])
bgcol = np.median(border_px, 0)
if bgcol.min() < 228:
    bglike |= (np.abs(f - bgcol).max(2) <= 22) & (sat <= 22)
# floor shadows: soft low-saturation greys near the bottom
yy = np.arange(h)[:, None] * np.ones((1, w))
shadow = (yy > h * .78) & (gray >= 145) & (sat <= 45)
bglike |= shadow

barrier = ~bglike
barrier = cv2.dilate(barrier.astype(np.uint8), np.ones((7, 7), np.uint8)) > 0
free = (bglike & ~barrier).astype(np.uint8)

n, lbl = cv2.connectedComponents(free, connectivity=4)
border = set(np.unique(np.concatenate([lbl[0], lbl[-1], lbl[:, 0], lbl[:, -1]]))) - {0}
bg = np.isin(lbl, list(border))
# enclosed gaps (between arms and body etc.): large, very pure white pockets
for i in range(1, n):
    if i in border:
        continue
    m = lbl == i
    a = int(m.sum())
    # pockets are background only when they're the exact generated backdrop colour and big;
    # flat white clothing pockets usually carry a faint tint, so require near-perfect 255 and low saturation
    if a > w * h * .006 and np.percentile(mn[m], 5) >= 253 and sat[m].max() <= 3:
        bg |= m
    # on a flat grey backdrop the pockets are that grey instead
    elif bgcol.min() < 228 and a > w * h * .006 and np.percentile(np.abs(f[m] - bgcol).max(1), 95) <= 10:
        bg |= m
    # between the legs, a floor-shading gradient can leave a light grey pocket; no white clothing sits that low
    elif a > w * h * .004 and np.nonzero(m)[0].mean() > h * .6 and np.percentile(mn[m], 5) >= 200 and np.percentile(sat[m], 95) <= 14:
        bg |= m
bg = cv2.dilate(bg.astype(np.uint8), np.ones((7, 7), np.uint8)) > 0
bg &= bglike

fg = (~bg).astype(np.uint8)
# drop specks, keep anything sizeable (props, tears)
n2, l2, st, _ = cv2.connectedComponentsWithStats(fg, connectivity=8)
keep = np.zeros_like(fg)
big = st[1:, cv2.CC_STAT_AREA].max() if n2 > 1 else 0
for i in range(1, n2):
    if st[i, cv2.CC_STAT_AREA] >= max(400, big * .002):
        keep[l2 == i] = 1
alpha = cv2.GaussianBlur(keep.astype(np.float32), (3, 3), 0)
# remove white halo: un-mix edge pixels from the white background
a = alpha[..., None]
col = img.astype(np.float32)
un = np.where(a > .05, (col - (1 - a) * (bgcol if bgcol.min() < 228 else 255)) / np.maximum(a, .05), col)
out = np.dstack([np.clip(un, 0, 255).astype(np.uint8), (alpha * 255).astype(np.uint8)])
cv2.imwrite(dst, out)
print(f"{src.split('/')[-1]}: fg {keep.mean() * 100:.0f}%")
