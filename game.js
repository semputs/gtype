(() => {
'use strict';
const $ = (id) => document.getElementById(id);
const stage = $('stage'), canvas = $('hall'), actors = $('actors');
const SPR = (c, e) => `assets/sprites/${c}_${e}.webp`;
const FRAMES = ['walk1', 'walk2', 'flustered', 'defeated'];
const FRONT_HOLD = 1.6;   // seconds a girl stays flustered in your face before the hit
let timeScale = 1;

/* ---------- cast ----------
   dur: seconds to cross the hall · step: seconds per movement frame · hop: bounce while moving
   size: height relative to the standard girl · fH: canvas height per frame relative to walk1 (from tools/build_sprites.py) */
const CAST = {
  hana:   { name: 'Hana', dur: 6.5, step: .16, hop: 1, words: ['yay','go go','hey','wow','run','jump','dash','cheer','zoom','fight','race','yes','sprint','high five','lets go','ready','win','catch me','faster','pump up','bounce','kick off','quick','burst','energy','top speed','vroom','hustle','next lap','on fire'] },
  mio:    { name: 'Mio', dur: 10.5, step: .34, fade: true, words: ['um','hello','sorry','excuse me','um hi','notice me','its nothing','please','maybe','thank you','nevermind','oh no','eep','hi there','i made cookies','wait up'] },
  rei:    { name: 'Rei', dur: 14, step: .38, words: ['serendipity','ephemeral','melancholy','eloquent','bibliophile','introspection','metaphorical','juxtaposition','quintessential','labyrinthine','perspicacious','onomatopoeia','incandescent','soliloquy','mellifluous'] },
  sayaka: { name: 'Sayaka', dur: 9, step: .22, hop: .6, words: ['baka','hmph','not like i care','dont get the wrong idea','whatever','idiot','its not for you','as if','fine then','i just happened to pass','dont stare','geez','so annoying','you wish','zip it'] },
  nemu:   { name: 'Nemu', dur: 13, step: .5, words: ['yawn','sleepy','five more minutes','pillow','dream','snooze','nap time','so warm','zzz','cozy','blanket','good night','mmm','nod off','lullaby'] },
  chika:  { name: 'Chika', dur: 8, step: .2, hop: .5, words: ['cake','strawberry','whipped cream','taste this','bake','sugar','sweet','cupcake','frosting','oven mitt','vanilla','pancake','try a bite','sprinkles','fresh from the oven'] },
  ayame:  { name: 'Ayame', dur: 10, step: .4, words: ['destiny','the stars say','fate','crystal','omen','tarot','moonlight','curse','spirit','prophecy','red string','eclipse','the cards agree','zodiac','hex'] },
  haruka: { name: 'Haruka', dur: 7.5, step: .2, hop: .8, words: ['say cheese','smile','click','one more','flash','pose','candid','snap','focus','perfect shot','zoom in','photo op','scoop','headline','exclusive'] },
  tomoe:  { name: 'Tomoe', dur: 6, step: .15, hop: 1, words: ['men','kote','do','kiai','ippon','hajime','strike','duel','honor','bushido','spar','yaa','zanshin','discipline','again'] },
  kaede:  { name: 'Kaede', boss: true, title: 'Festival committee chair', lines: ['you there stop right now','the festival committee needs your help','do you know who you are talking to','my schedule has no room for feelings','fine i admit your typing is impressive'] },
  akira:  { name: 'Akira (Super)', boss: true, size: 1.08, title: 'Powered up past her limit', lines: ['my power level is rising','this is not even my final form','i trained a thousand days for this moment','please accept my protein shake of love','with these arms i will carry you to the festival'] }
};
const META = window.SPRITE_META || {};
const ROSTER = ['hana','mio','rei','sayaka','nemu','chika','ayame','haruka','tomoe','kaede','akira'];

function makeWave(cast, n, gap) {
  // a shuffled spawn list that never repeats the same girl twice in a row
  const out = []; let tt = .6, prev = '';
  for (let i = 0; i < n; i++) {
    const pick = cast.filter(c => c !== prev); const c = pick[Math.floor(Math.random() * pick.length)];
    out.push([c, tt]); prev = c; tt += gap * (.75 + Math.random() * .5) * (1 - i / n * .3);
  }
  return out;
}
const STAGES = [
  { label: 'Stage 1 · Main Hall', sub: 'The festival hall · get ready', bg: 'assets/bg/stage1.jpg', hz: .54, cast: ['hana','mio','rei','sayaka','nemu'], n: 16, gap: 2.3, boss: 'kaede' },
  { label: 'Stage 2 · Sports Complex', sub: 'The gym corridor · it gets faster', bg: 'assets/bg/stage2.jpg', hz: .54, cast: ['chika','ayame','haruka','tomoe','hana','sayaka'], n: 18, gap: 2.0, boss: 'akira' }
];
for (const s of STAGES) { if (META.bg && META.bg[s.bg]) s.hz = META.bg[s.bg]; s.img = new Image(); s.img.onload = () => fit(); s.img.src = s.bg; }
for (const c of ROSTER) for (const f of FRAMES) { const i = new Image(); i.src = SPR(c, f); }
const LANES = [-0.82, -0.42, 0, 0.42, 0.82];

/* ---------- sizing & background ---------- */
let W = 0, H = 0, stageIdx = 0;
function fit() {
  const availW = Math.max(200, document.documentElement.clientWidth - 32);
  const availH = Math.max(150, window.innerHeight - 24);
  const w = Math.min(availW, availH * 16 / 9, 1600);
  stage.style.width = w + 'px'; W = w; H = w * 9 / 16;
  stage.style.setProperty('--u', (w / 100) + 'px');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawBg(ctx);
  for (const g of girls) place(g);
}
function drawBg(c) {
  const s = STAGES[stageIdx], img = s.img;
  c.fillStyle = '#3b2a4f'; c.fillRect(0, 0, W, H);
  if (img.complete && img.naturalWidth) {
    const k = Math.max(W / img.naturalWidth, H / img.naturalHeight), iw = img.naturalWidth * k, ih = img.naturalHeight * k;
    c.drawImage(img, (W - iw) / 2, (H - ih) / 2, iw, ih);
  }
  const g = c.createRadialGradient(W / 2, H * s.hz, H * .25, W / 2, H * s.hz, W * .75);
  g.addColorStop(0, 'rgba(40,20,50,0)'); g.addColorStop(1, 'rgba(40,20,50,.32)');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
}
const HZ = () => STAGES[stageIdx].hz;

/* ---------- audio ---------- */
let ac = null, muted = false;
try { muted = localStorage.getItem('galtype-muted') === '1'; } catch (e) {}
function audio() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (ac && ac.state === 'suspended') ac.resume(); }
function tone(freq, dur, type = 'square', vol = .05, when = 0, slide = 0) {
  if (muted || !ac) return;
  const t = ac.currentTime + when, o = ac.createOscillator(), gn = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(gn).connect(ac.destination); o.start(t); o.stop(t + dur + .02);
}
const sfx = {
  key: () => tone(1100 + Math.random() * 200, .04, 'square', .025),
  bad: () => tone(160, .14, 'sawtooth', .05, 0, 90),
  clear: () => { [660, 880, 1320].forEach((f, i) => tone(f, .1, 'triangle', .06, i * .05)); },
  hit: () => { tone(520, .35, 'sawtooth', .05, 0, 120); tone(260, .4, 'square', .03, .05, 80); },
  dash: () => tone(300, .18, 'sawtooth', .04, 0, 900),
  boss: () => { [330, 330, 440, 523].forEach((f, i) => tone(f, .16, 'square', .045, i * .14)); },
  win: () => { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, .16, 'triangle', .07, i * .11)); },
  lose: () => { [440, 349, 294, 220].forEach((f, i) => tone(f, .22, 'triangle', .06, i * .16)); }
};

/* ---------- state ---------- */
let girls = [], target = null, running = false, paused = false, phase = 'title';
let t = 0, last = 0, waveIdx = 0, boss = null, wobbleT = 0, WAVE = [];
let score = 0, combo = 0, bestCombo = 0, composure = 100, hearts = 3;
let goodKeys = 0, badKeys = 0, playTime = 0, uid = 0;

function newGame(from = 0) {
  score = 0; combo = 0; bestCombo = 0; hearts = 3; goodKeys = 0; badKeys = 0; playTime = 0;
  running = true; paused = false;
  $('title').hidden = true; $('results').hidden = true; $('pause').hidden = true; $('hud').hidden = false;
  startStage(from);
  last = performance.now(); focusKbd();
  requestAnimationFrame(loop);
}
function clearActors() { for (const g of girls) g.el.remove(), g.bub.remove(); girls = []; target = null; boss = null; }
function startStage(i) {
  clearActors(); stageIdx = i; const s = STAGES[i];
  WAVE = makeWave(s.cast, s.n, s.gap);
  t = -1.8; waveIdx = 0; composure = 100; wobbleT = 0; stage.classList.remove('wobble');
  $('stagebar').textContent = s.label; $('btimer').hidden = true;
  renderHud(); echo(); fit();
  phase = 'wave';
  banner(s.label.split(' · ')[0], s.sub, 1900);
}

function pickWord(c) {
  const used = new Set(girls.filter(live).map(g => g.word[0]));
  const recent = new Set(girls.map(g => g.word));
  const pool = CAST[c].words.filter(w => !used.has(w[0]) && !recent.has(w));
  const list = pool.length ? pool : CAST[c].words.filter(w => !used.has(w[0]));
  return list.length ? list[Math.floor(Math.random() * list.length)] : null;
}
function spawn(c) {
  const word = pickWord(c); if (!word) return false;
  const free = LANES.filter(l => !girls.some(g => live(g) && Math.abs(g.lane - l) < .1));
  const lane = (free.length ? free : LANES)[Math.floor(Math.random() * (free.length || LANES.length))];
  const g = mkGirl(c, word, lane);
  g.dur = CAST[c].dur * (stageIdx ? .9 : 1) * (1 - Math.min(.2, t / 200));
  girls.push(g); renderBubble(g); return true;
}
function mkGirl(c, word, lane) {
  const el = document.createElement('div'); el.className = 'girl';
  el.innerHTML = `<div class="shadow"></div><img alt="" src="${SPR(c, 'walk1')}">`;
  const bub = document.createElement('div'); bub.className = 'bubble';
  actors.append(el, bub);
  return { id: ++uid, c, word, typed: 0, lane, p: 0, dur: 10, boost: 0, state: 'walk', el, bub, img: el.querySelector('img'), face: '', animT: Math.random() * .6, frontT: 0, fadeT: Math.random() * 6, outT: 0, line: 0 };
}
function setFace(g, face) {
  if (g.face === face) return;
  g.face = face; g.img.src = SPR(g.c, face);
  const m = META[g.c] && META[g.c][face];
  g.img.style.height = ((m || 1) * 100) + '%';
}
const live = (g) => g.state === 'walk' || g.state === 'front';

function place(g) {
  g.el.classList.toggle('close', !!g.close);
  if (g.close) {
    const k = g.state === 'hit' ? 1 + g.outT * .5 : Math.min(1, .8 + g.frontT * 1.6);
    const sh = H * .84 * k, x = W / 2 + g.lane * W * .41, y0 = H - sh;
    g.el.style.height = sh + 'px'; g.el.style.transform = `translate(${x}px, ${y0}px)`;
    g.el.style.zIndex = 1500; g.bub.style.zIndex = 4000;
    const bw = g.bub.offsetWidth || 0;
    g.bub.style.left = Math.max(bw / 2 + W * .01, Math.min(W - bw / 2 - W * .01, x)) + 'px';
    g.bub.style.top = Math.max(H * .15, y0 + H * .01) + 'px';
    return;
  }
  const hz = HZ(), e = Math.max(0, g.p), ease = e * e * .35 + e * .65;
  const footY = H * hz + (H * 1.02 - H * hz) * ease;
  const scale = (.2 + .82 * ease) * (CAST[g.c].size || 1);
  const x = W / 2 + g.lane * W * (.16 + .26 * ease);
  const hop = g.state === 'walk' && g.face === 'walk2' ? H * .008 * scale * (CAST[g.c].hop || 0) : 0;
  const sh = H * .86 * scale;
  g.el.style.height = sh + 'px'; g.el.style.width = sh * .6 + 'px';
  g.el.style.transform = `translate(${x}px, ${footY - sh - hop}px)`;
  g.el.style.zIndex = Math.round(g.p * 1000);
  g.bub.style.zIndex = 2000 + Math.round(g.p * 1000) + (g === target ? 1000 : 0);
  const top = META[g.c] && META[g.c].top && META[g.c].top[g.face] || .99;
  const by = Math.max(H * .17, footY - sh * top - hop - H * .012);
  const bw = g.bub.offsetWidth || 0;
  g.bub.style.left = Math.max(bw / 2 + W * .01, Math.min(W - bw / 2 - W * .01, x)) + 'px';
  g.bub.style.top = by + 'px';
}

function renderBubble(g) {
  const w = g.word, i = g.typed;
  const esc = (s) => s.split('').map(ch => ch === ' ' ? '<span class="sp"> </span>' : `<span>${ch}</span>`).join('');
  const done = w.slice(0, i), cur = w.slice(i, i + 1), rest = w.slice(i + 1);
  const curHtml = cur === ' ' ? '<span class="cur sp">&nbsp;</span>' : `<span class="cur">${cur}</span>`;
  const label = g.boss ? `${CAST[g.c].name} · line ${g.line + 1} of ${CAST[g.c].lines.length}` : CAST[g.c].name;
  g.bub.innerHTML = `<span class="name">${label}</span><span class="done">${esc(done).replace(/class="sp"/g, 'class="done sp"')}</span>${cur ? curHtml : ''}<span class="rest">${esc(rest)}</span>`;
  g.bub.classList.toggle('target', g === target);
  g.bub.classList.toggle('boss', !!g.boss);
}

/* ---------- HUD ---------- */
const HEART = '<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.5 3 5 6.4 5c2.1 0 3.5 1.2 4.3 2.4l1.3 1.8 1.3-1.8C14.1 6.2 15.5 5 17.6 5 21 5 23.1 8.5 21.6 11.8 19.5 16.4 12 21 12 21z" fill="#ff5c97" stroke="#fff" stroke-width="1.6"/></svg>';
function renderHud() {
  $('score').textContent = score.toLocaleString();
  $('combo').textContent = combo >= 3 ? `Combo ×${combo}` : '';
  const bar = $('bar'); bar.querySelector('i').style.width = Math.max(0, composure) + '%'; bar.classList.toggle('low', composure < 35);
  $('hearts').innerHTML = [0, 1, 2].map(i => `<span class="${i < hearts ? '' : 'lost'}">${HEART}</span>`).join('');
}
function bumpCombo() { const cb = $('combo'); cb.classList.remove('pop'); void cb.offsetWidth; cb.classList.add('pop'); }
function echo() {
  const e = $('echo');
  e.innerHTML = (target ? target.word.slice(0, target.typed).replace(/ /g, '&nbsp;') : '') + '<span class="caret"></span>';
}
let bannerTimer = 0;
function banner(big, small, ms) {
  const b = $('banner'); b.innerHTML = `<div class="big">${big}</div>${small ? `<div class="small">${small}</div>` : ''}`;
  b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); b.hidden = false;
  clearTimeout(bannerTimer); bannerTimer = setTimeout(() => { b.hidden = true; }, ms);
}
function floatText(x, y, text, bad) {
  const f = document.createElement('div'); f.className = 'float' + (bad ? ' bad' : ''); f.textContent = text;
  f.style.left = x + 'px'; f.style.top = y + 'px'; f.style.zIndex = 5000; actors.append(f);
  setTimeout(() => f.remove(), 950);
}
function flash() { const f = $('flash'); f.style.transition = 'none'; f.style.opacity = '.45'; requestAnimationFrame(() => { f.style.transition = 'opacity .45s'; f.style.opacity = '0'; }); }

/* ---------- typing ---------- */
function typeChar(ch) {
  if ((phase !== 'wave' && phase !== 'boss') || paused || t < 0) return;
  if (!target) {
    const cands = girls.filter(g => live(g) && g.typed === 0 && g.word[0] === ch && !(g.boss && g.dashT > 0 && g.entering));
    if (!cands.length) { miss(null); return; }
    cands.sort((a, b) => b.p - a.p); target = cands[0];
    girls.forEach(renderBubble);
  }
  if (target.word[target.typed] === ch) {
    target.typed++; goodKeys++; combo++; bestCombo = Math.max(bestCombo, combo);
    score += 10 + Math.min(combo, 50);
    if (combo % 10 === 0) bumpCombo();
    sfx.key();
    if (target.typed >= target.word.length) finishWord(target); else renderBubble(target);
  } else miss(target);
  renderHud(); echo();
}
function miss(g) {
  badKeys++; combo = 0; sfx.bad(); composure -= g ? 9 : 5;
  if (g && !g.boss) g.boost = 1.2;
  if (g) { g.bub.classList.remove('shake'); void g.bub.offsetWidth; g.bub.classList.add('shake'); }
  if (composure <= 0) { composure = 40; wobbleT = 4; stage.classList.add('wobble'); banner('Flustered!', 'Letters won’t sit still', 1400); }
  renderHud();
}
function finishWord(g) {
  const bonus = 60 + Math.round((1 - Math.min(1, g.p)) * 140) + g.word.length * 8;
  score += bonus; composure = Math.min(100, composure + 6);
  const r = g.bub.getBoundingClientRect(), s = stage.getBoundingClientRect();
  floatText(r.left - s.left + r.width / 2, r.top - s.top, '+' + bonus);
  target = null;
  if (g.boss) { bossLine(g); return; }
  defeat(g); sfx.clear();
}
function defeat(g) { g.state = 'out'; g.outT = 0; g.close = false; setFace(g, 'defeated'); g.bub.style.opacity = '0'; g.bub.classList.remove('danger'); }
function dropTarget() { if (target) { target.typed = 0; renderBubble(target); } target = null; echo(); }

/* ---------- bosses: she stands and talks; every finished line (or a line you run out of time on) she dashes closer ---------- */
const BOSS_STEPS = [.25, .42, .58, .74, .9];
function lineTime(g) { return (2.2 + g.word.length * .3) * (1 - g.line * .06) * (stageIdx ? .9 : 1); }
function startBoss() {
  const s = STAGES[stageIdx], c = s.boss, cfg = CAST[c];
  phase = 'boss';
  $('stagebar').textContent = `Boss · ${cfg.name}`;
  banner('Boss!', `${cfg.name} · ${cfg.title}`, 2200); sfx.boss();
  const g = mkGirl(c, cfg.lines[0], 0); g.boss = true; g.line = 0; g.k = 0; g.p = -.2; g.from = -.2; g.to = BOSS_STEPS[0];
  g.dashT = .6; g.dashLen = .6; g.entering = true; g.lineT = 0; g.delay = 2.2;
  boss = g; girls.push(g); renderBubble(g); setFace(g, 'walk2');
  $('btimer').hidden = false;
}
function bossDash(g, k) {
  g.k = Math.min(k, BOSS_STEPS.length - 1); g.from = g.p; g.to = BOSS_STEPS[g.k];
  g.dashT = .35; g.dashLen = .35; setFace(g, 'walk2'); sfx.dash();
}
function bossLine(g) {
  const cfg = CAST[g.c];
  g.line++; g.state = 'walk'; g.close = false; g.bub.classList.remove('danger');
  if (g.line >= cfg.lines.length) {
    defeat(g); g.outHold = 2.2; sfx.win(); $('btimer').hidden = true; phase = 'end';
    setTimeout(() => stageIdx + 1 < STAGES.length ? stageClear() : endGame(true), 2000);
    return;
  }
  sfx.clear();
  g.word = cfg.lines[g.line]; g.typed = 0; g.lineT = 0; renderBubble(g);
  bossDash(g, g.k + 1);
}
function bossTimeout(g) {
  if (target === g) target = null;
  g.typed = 0; g.lineT = 0; renderBubble(g); echo();
  if (g.k >= BOSS_STEPS.length - 1) { // already right in front of you: she gets you
    g.close = true; g.state = 'front'; g.frontT = FRONT_HOLD - .6; setFace(g, 'flustered'); g.bub.classList.add('danger');
  } else { floatText(W / 2, H * .5, 'Too slow!', true); combo = 0; composure = Math.max(0, composure - 12); renderHud(); bossDash(g, g.k + 1); }
}
function stageClear() {
  phase = 'between'; banner('Stage clear!', 'Next: ' + STAGES[stageIdx + 1].label.split(' · ')[1], 2400);
  hearts = Math.min(3, hearts + 1); renderHud();
  setTimeout(() => { if (running) startStage(stageIdx + 1); }, 2600);
}

/* ---------- loop ---------- */
function loop(now) {
  if (!running) return;
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (!paused) step(dt * timeScale);
  requestAnimationFrame(loop);
}
function step(dt) {
  t += dt; if (t > 0 && phase !== 'end' && phase !== 'between') playTime += dt;
  if (wobbleT > 0) { wobbleT -= dt; if (wobbleT <= 0) stage.classList.remove('wobble'); }
  if (phase === 'wave') {
    while (waveIdx < WAVE.length && t >= WAVE[waveIdx][1]) {
      if (girls.filter(live).length >= 4) { WAVE[waveIdx][1] += .5; break; }
      if (spawn(WAVE[waveIdx][0])) waveIdx++; else { WAVE[waveIdx][1] += .4; break; }
    }
    if (waveIdx >= WAVE.length && !girls.length) startBoss();
  }
  for (const g of girls.slice()) {
    if (g.boss && g.state === 'walk') { stepBoss(g, dt); place(g); continue; }
    if (g.state === 'walk') {
      const mul = 1 + (g.boost > 0 ? .9 : 0);
      g.boost = Math.max(0, g.boost - dt);
      g.p += dt / g.dur * mul;
      if (CAST[g.c].fade) { g.fadeT += dt; const o = .5 + .5 * Math.sin(g.fadeT * 2.4); g.bub.style.opacity = String(Math.max(g === target ? .35 : .08, o)); }
      g.animT += dt * mul;
      setFace(g, Math.floor(g.animT / CAST[g.c].step) % 2 ? 'walk2' : 'walk1');
      if (g.p >= 1) { g.p = 1; g.state = 'front'; g.frontT = 0; g.close = true; setFace(g, 'flustered'); g.bub.classList.add('danger'); }
    } else if (g.state === 'front') {
      g.frontT += dt;
      g.bub.style.setProperty('--fuse', String(Math.max(0, 1 - g.frontT / FRONT_HOLD)));
      if (g.frontT >= FRONT_HOLD) { hitBy(g); continue; }
    } else if (g.state === 'out') {
      g.outT += dt; const hold = g.outHold || .7;
      if (g.outT > hold) g.p -= dt * .12;
      g.el.style.opacity = String(Math.max(0, 1 - Math.max(0, g.outT - hold) / .6));
      if (g.outT > hold + .6) { g.el.remove(); g.bub.remove(); girls.splice(girls.indexOf(g), 1); continue; }
    } else if (g.state === 'hit') {
      g.outT += dt; g.p = 1 + g.outT * .25;
      g.el.style.opacity = String(Math.max(0, 1 - g.outT / .7)); g.bub.style.opacity = '0';
      if (g.outT > .7) { g.el.remove(); g.bub.remove(); girls.splice(girls.indexOf(g), 1); continue; }
    }
    place(g);
  }
}
function stepBoss(g, dt) {
  if (g.dashT > 0) {
    g.dashT -= dt; const k = 1 - Math.max(0, g.dashT) / g.dashLen, e = 1 - (1 - k) * (1 - k);
    g.p = g.from + (g.to - g.from) * e;
    if (g.dashT <= 0) { g.entering = false; setFace(g, 'walk1'); }
    return;
  }
  setFace(g, 'walk1');
  if (g.delay > 0) { g.delay -= dt; $('btimer').firstElementChild.style.transform = 'scaleX(1)'; return; }
  g.lineT += dt; const lim = lineTime(g), left = Math.max(0, 1 - g.lineT / lim);
  const bt = $('btimer'); bt.firstElementChild.style.transform = `scaleX(${left})`; bt.classList.toggle('low', left < .3);
  if (g.lineT >= lim) bossTimeout(g);
}
function hitBy(g) {
  hearts--; combo = 0; composure = Math.max(0, composure - 20); flash(); sfx.hit();
  floatText(W / 2, H * .55, g.boss ? 'Gotcha!' : 'Too slow!', true);
  if (target === g) target = null;
  if (g.boss) { g.close = false; g.state = 'walk'; g.bub.classList.remove('danger'); g.p = .9; g.lineT = 0; g.typed = 0; renderBubble(g); bossDash(g, 2); g.from = .9; }
  else { g.state = 'hit'; g.outT = 0; g.bub.classList.remove('danger'); }
  renderHud(); echo();
  if (hearts <= 0) { phase = 'end'; sfx.lose(); setTimeout(() => endGame(false), 900); }
}
function endGame(won) {
  running = false; phase = 'results'; $('btimer').hidden = true;
  const mins = Math.max(playTime, 1) / 60, wpm = Math.round(goodKeys / 5 / mins);
  const acc = goodKeys + badKeys ? Math.round(goodKeys / (goodKeys + badKeys) * 100) : 0;
  let grade = 'C';
  if (won) grade = acc >= 96 && hearts === 3 ? 'S' : acc >= 90 && hearts >= 2 ? 'A' : 'B';
  $('rtitle').textContent = won ? 'All clear!' : 'You got flustered';
  $('grade').textContent = won ? grade : '—';
  $('rscore').textContent = score.toLocaleString(); $('rwpm').textContent = wpm;
  $('racc').textContent = acc + '%'; $('rcombo').textContent = bestCombo;
  $('results').hidden = false; $('hud').hidden = true;
  try { const best = +localStorage.getItem('galtype-best') || 0; if (score > best) localStorage.setItem('galtype-best', String(score)); } catch (e) {}
}
function setPause(p) {
  if (phase !== 'wave' && phase !== 'boss') return;
  paused = p; $('pause').hidden = !p; if (!p) { last = performance.now(); focusKbd(); }
}

/* ---------- title roster ---------- */
$('roster').innerHTML = ROSTER.map(c => `<figure class="${CAST[c].boss ? 'boss' : ''}"><img src="${SPR(c, 'walk1')}" alt="${CAST[c].name}"><figcaption>${CAST[c].name.replace(' (Super)', '')}</figcaption></figure>`).join('');

/* ---------- input ---------- */
const kbd = $('kbd');
function focusKbd() { try { kbd.focus({ preventScroll: true }); } catch (e) {} }
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (phase === 'title' || phase === 'results') { if (e.key === 'Enter') { e.preventDefault(); audio(); newGame(0); } return; }
  if (e.key === 'Escape') { e.preventDefault(); setPause(!paused); return; }
  if (paused) { if (e.key === 'Enter') setPause(false); return; }
  if (e.key === 'Backspace') { e.preventDefault(); dropTarget(); return; }
  if (e.key.length === 1) { e.preventDefault(); const ch = e.key.toLowerCase(); if (/^[a-z ]$/.test(ch)) typeChar(ch); }
});
kbd.addEventListener('input', () => { const v = kbd.value; kbd.value = ''; for (const ch of v.toLowerCase()) if (/^[a-z ]$/.test(ch)) typeChar(ch); });
stage.addEventListener('pointerdown', (e) => { if (!e.target.closest('button')) focusKbd(); });
$('start').addEventListener('click', () => { audio(); newGame(0); });
$('start2').addEventListener('click', () => { audio(); newGame(1); });
$('again').addEventListener('click', () => { audio(); newGame(0); });
$('resume').addEventListener('click', () => setPause(false));
const slowBtn = $('slow');
slowBtn.addEventListener('click', () => { timeScale = timeScale === 1 ? .35 : 1; slowBtn.setAttribute('aria-pressed', String(timeScale !== 1)); slowBtn.textContent = timeScale === 1 ? 'Slow motion' : 'Slow motion on'; focusKbd(); });
const muteBtn = $('mute');
function syncMute() { muteBtn.textContent = muted ? 'Sound off' : 'Sound on'; muteBtn.setAttribute('aria-pressed', String(!muted)); }
muteBtn.addEventListener('click', () => { muted = !muted; try { localStorage.setItem('galtype-muted', muted ? '1' : '0'); } catch (e) {} syncMute(); audio(); focusKbd(); });
syncMute();
document.addEventListener('visibilitychange', () => { if (document.hidden) setPause(true); });
window.addEventListener('resize', fit);
window.__gt = { get phase() { return phase; }, get girls() { return girls; }, get stage() { return stageIdx; } };
fit(); renderHud();
})();
