// Share: a cute result card (canvas) + save / copy / Web Share + X, LINE, Facebook, Bluesky, Threads, Instagram.
import { dopakichiSVG } from './dopakichi.js';
import { CATTY_DRAW } from './fx.js';

export const X_URL = 'https://x.com/chihaya_369';
export const HASHTAGS = ['脳汁タイピング', 'ドパにゃん'];
const INK = '#1b1d4d';
const TITLE_COL = ['#ff7ab6', '#8fe3c4', '#ffd23f', '#b8a6ff', '#8fd3ff', '#ff7ab6'];
const CLOUD = 'M60 170 C10 170 10 110 55 105 C45 55 105 35 135 70 C150 20 225 15 245 60 C275 25 345 40 340 95 C395 100 395 175 345 180 C350 235 270 245 245 215 C215 250 150 250 130 215 C95 240 40 225 60 170Z';

const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const hsl = (h, s, l, a = 1) => `hsla(${((h % 360) + 360) % 360},${s}%,${l}%,${a})`;
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function star4(g, x, y, r, col) { g.save(); g.translate(x, y); g.fillStyle = col; g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; const rad = i % 2 ? r * 0.28 : r; g.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); } g.closePath(); g.fill(); g.restore(); }
const svgImg = (pal, cos) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(dopakichiSVG(pal, cos))}`; });
function fitFont(g, text, family, maxW, size) { g.font = `${size}px ${family}`; const w = g.measureText(text).width; return w > maxW ? Math.floor(size * maxW / w) : size; }
function outlined(g, text, x, y, size, fill, { family = '"Dela Gothic One"', stroke = INK, sw = 14, align = 'center', shadow = 0 } = {}) {
  g.font = `${size}px ${family}, "Zen Maru Gothic", sans-serif`; g.textAlign = align; g.textBaseline = 'alphabetic'; g.lineJoin = 'round';
  if (shadow) { g.strokeStyle = stroke; g.lineWidth = sw; g.strokeText(text, x, y + shadow); g.fillStyle = stroke; g.fillText(text, x, y + shadow); }
  g.strokeStyle = stroke; g.lineWidth = sw; g.strokeText(text, x, y); g.fillStyle = fill; g.fillText(text, x, y);
}

function background(g, W, H, tier, seed, cx, cy) {
  const base = g.createLinearGradient(0, 0, W, H);
  base.addColorStop(0, '#ffdcee'); base.addColorStop(0.5, '#fff4cf'); base.addColorStop(1, '#d6f1ff');
  g.fillStyle = base; g.fillRect(0, 0, W, H);
  const R = Math.hypot(W, H); const n = 30 + tier * 3;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2; const a1 = ((i + 0.5) / n) * Math.PI * 2;
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a0) * R, cy + Math.sin(a0) * R); g.lineTo(cx + Math.cos(a1) * R, cy + Math.sin(a1) * R); g.closePath();
    g.fillStyle = hsl((i * 360) / n + tier * 24, 85, 82, 0.3 + tier * 0.02); g.fill();
  }
  for (let k = 1; k <= 6; k++) { g.beginPath(); g.arc(cx, cy, k * (Math.min(W, H) * 0.16), 0, 7); g.strokeStyle = hsl(k * 55 + tier * 20, 90, 75, 0.35); g.lineWidth = 14; g.stroke(); }
  const rnd = rng(seed); const kinds = ['paw', 'neko', 'fish', 'yarn', 'jarashi'];
  const count = Math.round((W * H) / 26000) + tier * 4;
  for (let i = 0; i < count; i++) {
    const x = rnd() * W; const y = rnd() * H; const k = kinds[Math.floor(rnd() * kinds.length)];
    g.save(); g.translate(x, y); g.rotate(rnd() * 6.28); const sc = 1.6 + rnd() * 2.6; g.scale(sc, sc); g.globalAlpha = 0.85;
    const cols = ['#ff9ccc', '#ffd23f', '#8fe3c4', '#b8a6ff', '#8fd3ff', '#ffb38a'];
    CATTY_DRAW[k](g, cols[Math.floor(rnd() * cols.length)]); g.restore();
  }
  for (let i = 0; i < 14 + tier * 4; i++) star4(g, rnd() * W, rnd() * H, 10 + rnd() * 20, ['#fff', '#ffd23f', '#ff9ccc'][i % 3]);
}

function titleSticker(g, x, y, w, scale) {
  const h = w * 0.66;
  g.save(); g.translate(x - w / 2, y); g.scale(w / 400, w / 400);
  g.save(); g.translate(0, 10); g.fillStyle = INK; g.fill(new Path2D(CLOUD)); g.restore();
  g.fillStyle = '#fff4fa'; g.strokeStyle = INK; g.lineWidth = 6; g.lineJoin = 'round'; const P = new Path2D(CLOUD); g.fill(P); g.stroke(P);
  g.restore();
  const u = w / 400;
  const letters = ['ド', 'パ', 'に', 'ゃ', 'ん', '！'];
  const sizes = [1, 1, 0.82, 0.6, 0.82, 0.9];
  const base = 78 * u * scale;
  g.font = `${base}px "Dela Gothic One", sans-serif`;
  const widths = letters.map((c, i) => { g.font = `${base * sizes[i]}px "Dela Gothic One", sans-serif`; return g.measureText(c).width; });
  const total = widths.reduce((a, b) => a + b, 0);
  let cx = x - total / 2;
  letters.forEach((c, i) => {
    g.save(); g.translate(cx + widths[i] / 2, y + 100 * u); g.rotate(((i % 2 ? 1 : -1) * 3) * Math.PI / 180);
    outlined(g, c, 0, 0, base * sizes[i], TITLE_COL[i], { sw: 12 * u * scale + 4, shadow: 6 * u }); g.restore(); cx += widths[i];
  });
  // ぷるんとした「脳汁」: the ruby sits INSIDE the pill, above the word, so it never touches the title letters
  const dx = x; const dy = y + 152 * u;
  g.save(); g.translate(dx, dy);
  const dw = 190 * u * scale; const dh = 84 * u * scale;
  const gr = g.createRadialGradient(-dw * 0.25, -dh * 0.3, 4, 0, 0, dw); gr.addColorStop(0, '#ffb3d6'); gr.addColorStop(0.6, '#ff4f9a'); gr.addColorStop(1, '#c93a86');
  g.beginPath(); g.ellipse(0, 0, dw * 0.5, dh * 0.5, 0, 0, 7); g.fillStyle = INK; g.save(); g.translate(0, 6 * u); g.fill(); g.restore();
  g.fillStyle = gr; g.fill(); g.lineWidth = 6 * u * scale; g.strokeStyle = INK; g.stroke();
  g.beginPath(); g.ellipse(-dw * 0.25, -dh * 0.26, dw * 0.1, dh * 0.07, -0.4, 0, 7); g.fillStyle = 'rgba(255,255,255,.55)'; g.fill();
  g.textAlign = 'center'; g.font = `900 ${dh * 0.17}px "Zen Maru Gothic", sans-serif`; g.fillStyle = '#fff'; g.fillText('のうじる', 0, -dh * 0.17);
  outlined(g, '脳汁', 0, dh * 0.34, dh * 0.52, '#fff', { sw: 8 * u * scale });
  g.restore();
  outlined(g, 'タイピング', x, y + 238 * u, 54 * u * scale, '#8fd3ff', { sw: 10 * u * scale + 2, shadow: 5 * u });
  // catch phrase pill
  const text = 'キーふんじゃった！'; const fs = 30 * u * scale; g.font = `${fs}px "Zen Maru Gothic", sans-serif`;
  const tw = g.measureText(text).width + fs * 1.4;
  g.save(); g.translate(x, y + h * 1.0); g.rotate(-0.03); rr(g, -tw / 2, -fs * 0.9, tw, fs * 1.55, fs * 0.78); g.fillStyle = '#ffd23f'; g.fill(); g.lineWidth = 5 * u * scale; g.strokeStyle = INK; g.stroke();
  g.fillStyle = INK; g.textAlign = 'center'; g.font = `900 ${fs}px "Zen Maru Gothic", sans-serif`; g.fillText(text, 0, fs * 0.2); g.restore();
}

function panel(g, x, y, w, h, tier) {
  g.save();
  g.fillStyle = INK; rr(g, x, y + 16, w, h, 48); g.fill();
  if (tier >= 6) { const gl = g.createLinearGradient(x, y, x + w, y + h); ['#ff7ab6', '#ffd23f', '#8fe3c4', '#8fd3ff', '#b8a6ff'].forEach((c, i) => gl.addColorStop(i / 4, c)); g.strokeStyle = gl; g.lineWidth = 26; rr(g, x - 8, y - 8, w + 16, h + 16, 56); g.stroke(); }
  g.fillStyle = '#fffaf2'; rr(g, x, y, w, h, 48); g.fill(); g.lineWidth = 10; g.strokeStyle = INK; g.stroke();
  g.restore();
}

function chip(g, x, y, w, h, label, value, col) {
  g.save(); g.fillStyle = INK; rr(g, x, y + 6, w, h, 26); g.fill(); g.fillStyle = col; rr(g, x, y, w, h, 26); g.fill(); g.lineWidth = 6; g.strokeStyle = INK; g.stroke();
  g.fillStyle = INK; g.textAlign = 'center'; g.font = `900 ${h * 0.25}px "Zen Maru Gothic", sans-serif`; g.fillText(label, x + w / 2, y + h * 0.33);
  const fs = fitFont(g, value, '"Dela Gothic One", sans-serif', w - 24, h * 0.5);
  g.font = `${fs}px "Dela Gothic One", sans-serif`; g.fillText(value, x + w / 2, y + h * 0.82); g.restore();
}

function gauge(g, x, y, w, h, ratio, tier) {
  g.save(); g.fillStyle = '#fff'; rr(g, x, y, w, h, h / 2); g.fill(); g.lineWidth = 6; g.strokeStyle = INK; g.stroke(); g.clip();
  const fw = Math.max(h, w * Math.min(1, ratio)); const gr = g.createLinearGradient(x, 0, x + w, 0);
  ['#ff9ccc', '#ffd23f', '#8fe3c4', '#8fd3ff', '#b8a6ff'].forEach((c, i) => gr.addColorStop(i / 4, c));
  g.fillStyle = gr; rr(g, x, y, fw, h, h / 2); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 10; for (let i = -h; i < fw; i += 34) { g.beginPath(); g.moveTo(x + i, y + h); g.lineTo(x + i + h, y); g.stroke(); }
  g.restore();
  g.save(); g.lineWidth = 6; g.strokeStyle = INK; rr(g, x, y, w, h, h / 2); g.stroke(); g.restore();
  void tier;
}

export async function renderCard(d, fmt = 'portrait') {
  try { await Promise.all(['"Dela Gothic One"', '900 30px "Zen Maru Gothic"', '700 30px "Zen Maru Gothic"'].map((f) => document.fonts.load(f.includes('px') ? f : `30px ${f}`, 'ドパにゃん脳汁タイピング0123456789'))); } catch (e) { /* ignore */ }
  const wide = fmt === 'wide';
  const W = wide ? 1200 : 1080; const H = wide ? 630 : 1350;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const tier = Math.max(0, Math.min(8, d.rankIndex));
  background(g, W, H, tier, d.score * 7 + tier, wide ? W * 0.3 : W / 2, wide ? H * 0.5 : H * 0.36);
  const crown = tier >= 5 ? 'crown' : null;
  const [gin, sumi] = await Promise.all([svgImg('pink', crown), svgImg('sumi', null)]);
  const rank = d.rank; const score = String(d.score);
  const fmtKps = d.kps.toFixed(1); const acc = `${Math.round(d.acc * 100)}%`;
  const nameLine = d.name ? `${d.name} さんの けっか` : 'きょうの けっか';
  // One panel routine for both formats: every y position is computed from the previous one, so nothing overlaps.
  const panelAt = (x, y, w, u, draw) => {
    const rankFs = fitFont(g, rank, '"Dela Gothic One", sans-serif', w - 90 * u, 116 * u);
    const scoreFs = fitFont(g, score, '"Dela Gothic One", sans-serif', w - 200 * u, 100 * u);
    const chipH = 88 * u; const gaugeH = 20 * u;
    const nameB = y + 52 * u; const labelB = y + 96 * u;
    const rankB = labelB + 14 * u + rankFs * 0.88;
    const scoreLab = rankB + 54 * u; const scoreB = scoreLab + 14 * u + scoreFs * 0.88;
    const chipsY = scoreB + 30 * u; const gaugeY = chipsY + chipH + 24 * u;
    const h = gaugeY + gaugeH + 30 * u - y;
    if (!draw) return h;
    panel(g, x, y, w, h, tier);
    g.textAlign = 'center';
    g.fillStyle = INK; g.font = `900 ${34 * u}px "Zen Maru Gothic", sans-serif`;
    const nf = fitFont(g, nameLine, '900 "Zen Maru Gothic", sans-serif', w - 80 * u, 34 * u); g.font = `900 ${nf}px "Zen Maru Gothic", sans-serif`; g.fillText(nameLine, x + w / 2, nameB);
    g.fillStyle = '#6b6f9e'; g.font = `900 ${27 * u}px "Zen Maru Gothic", sans-serif`; g.fillText('ねこ段位', x + w / 2, labelB);
    const gr = g.createLinearGradient(x + 40 * u, 0, x + w - 40 * u, 0); ['#ff4f6d', '#ff9a3c', '#ffd23f', '#3fdcb0', '#3b6bff', '#a77bff'].forEach((col, i, a2) => gr.addColorStop(i / (a2.length - 1), col));
    outlined(g, rank, x + w / 2, rankB, rankFs, gr, { sw: 16 * u, shadow: 7 * u });
    for (let i = 0; i < 4 + tier; i++) star4(g, x + w / 2 + Math.sin(i * 2.3) * (w * 0.42), y + 100 * u + Math.abs(Math.cos(i * 1.7)) * rankFs * 0.9, (11 + (i % 3) * 6) * u, ['#fff', '#ffd23f', '#ff9ccc'][i % 3]);
    g.fillStyle = '#6b6f9e'; g.font = `900 ${29 * u}px "Zen Maru Gothic", sans-serif`; g.fillText('脳汁スコア', x + w / 2, scoreLab);
    outlined(g, score, x + w / 2, scoreB, scoreFs, '#ff7ab6', { sw: 14 * u, shadow: 6 * u });
    const gap = 16 * u; const cw = (w - 80 * u - gap * 2) / 3;
    chip(g, x + 40 * u, chipsY, cw, chipH, '打 / 秒', fmtKps, '#dff7ea'); chip(g, x + 40 * u + cw + gap, chipsY, cw, chipH, '正確率', acc, '#e2ebff'); chip(g, x + 40 * u + (cw + gap) * 2, chipsY, cw, chipH, '最大コンボ', String(d.combo), '#ffe0ec');
    gauge(g, x + 40 * u, gaugeY, w - 80 * u, gaugeH, d.score / 600, tier);
    return h;
  };
  if (!wide) {
    titleSticker(g, W / 2, 8, 560, 1.0);
    const px = 90; const pw = W - 180; const py = 420;
    const ph = panelAt(px, py, pw, 1, true);
    const ribbonTop = H - 64;
    // ribbon
    g.fillStyle = INK; g.fillRect(0, ribbonTop, W, 64);
    g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = '900 28px "Zen Maru Gothic", sans-serif';
    g.fillText(`#脳汁タイピング　${d.date}`, W / 2, H - 38);
    g.fillStyle = '#ffd23f'; g.font = '900 24px "Zen Maru Gothic", sans-serif'; g.fillText('企画・原案 ちはや  @chihaya_369', W / 2, H - 12);
    // cats stand on the ribbon, below the panel; the dopa badge sits between them
    const room = ribbonTop - (py + ph) - 8;
    const gh = Math.min(330, room); const sh = gh * 0.93;
    if (gin) g.drawImage(gin, 110, ribbonTop - gh, gh * 0.93, gh);
    if (sumi) g.drawImage(sumi, W - 110 - sh * 0.93, ribbonTop - sh, sh * 0.93, sh);
    const bx = W / 2; const by = ribbonTop - gh * 0.45;
    g.save(); g.translate(bx, by); g.rotate(-0.04); g.fillStyle = INK; rr(g, -150, -46 + 6, 300, 92, 46); g.fill(); g.fillStyle = '#ffd23f'; rr(g, -150, -46, 300, 92, 46); g.fill(); g.lineWidth = 6; g.strokeStyle = INK; g.stroke();
    g.fillStyle = INK; g.textAlign = 'center'; g.font = '900 26px "Zen Maru Gothic", sans-serif'; g.fillText('ドパ', 0, -8); const df = fitFont(g, String(d.dopa), '"Dela Gothic One", sans-serif', 250, 44); g.font = `${df}px "Dela Gothic One", sans-serif`; g.fillText(String(d.dopa), 0, 32); g.restore();
    star4(g, bx - 190, by - 70, 24, '#fff'); star4(g, bx + 200, by - 30, 18, '#ffd23f'); star4(g, bx + 30, by - 118, 14, '#ff9ccc');
  } else {
    titleSticker(g, 330, 22, 520, 0.9);
    const ph = panelAt(0, 0, 540, 0.8, false);
    const px = 630; const pw = 540; const py = Math.max(24, (H - ph) / 2);
    panelAt(px, py, pw, 0.8, true);
    if (gin) g.drawImage(gin, 40, 328, 250, 268);
    if (sumi) g.drawImage(sumi, 300, 348, 220, 236);
    g.textAlign = 'center'; g.fillStyle = INK; g.font = '900 20px "Zen Maru Gothic", sans-serif'; g.fillText('#脳汁タイピング　企画・原案 ちはや @chihaya_369', px + pw / 2, py + ph + 22 > H - 6 ? H - 8 : py + ph + 22);
  }
  return c;
}
const fmtDopaLabel = (d) => `ドパ ${d.dopa}`;

// ---------------------------------------------------------------- modal
const isTouchDevice = () => matchMedia('(pointer: coarse)').matches || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
export function shareUrl(site) { return site || (location.origin + location.pathname.replace(/index\.html$/, '')); }
export function shareText(d) { return `${d.name ? `${d.name}の` : ''}ねこ段位「${d.rank}」／脳汁スコア ${d.score}！ ${d.kps.toFixed(1)}打/秒・正確率${Math.round(d.acc * 100)}%・${d.combo}コンボ 🐾`; }

export function initShare({ $, $$, toast, audio, vib, getData, site }) {
  const box = $('#share'); const img = $('#share-img'); const load = $('#share-load'); const note = $('#share-note');
  let fmt = 'portrait'; let blobs = {}; let urls = {}; let data = null; let busy = 0;
  const say = (t) => { note.textContent = t; };
  async function make(f) {
    if (blobs[f]) return blobs[f];
    const cv = await renderCard(data, f);
    const blob = await new Promise((res) => cv.toBlob(res, 'image/png'));
    blobs[f] = blob; urls[f] = URL.createObjectURL(blob);
    return blob;
  }
  async function show() {
    const my = ++busy; load.hidden = false; img.style.opacity = 0.25;
    await make(fmt);
    if (my !== busy) return;
    img.src = urls[fmt]; load.hidden = true; img.style.opacity = 1;
    $$('#share [data-fmt]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.fmt === fmt)));
  }
  function open(d) {
    data = d; Object.values(urls).forEach((u) => URL.revokeObjectURL(u)); blobs = {}; urls = {};
    box.hidden = false; say(''); audio.unlock(); audio.play('blip', audio.now(), { m: 88, v: 0.1 });
    $('#share-save').textContent = isTouchDevice() ? '📥 がぞうを ほぞん' : '📥 がぞうを ほぞん（ダウンロード）';
    show();
  }
  function close() { box.hidden = true; }
  const fileOf = async () => new File([await make(fmt)], `noujiru-typing-${data.rank}.png`, { type: 'image/png' });
  async function nativeShare(withFile = true) {
    const url = shareUrl(site); const text = `${shareText(data)} #${HASHTAGS.join(' #')}`;
    try {
      const file = withFile ? await fileOf() : null;
      const payload = { title: 'ドパにゃん！ 脳汁タイピング', text, url };
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) payload.files = [file];
      if (navigator.share) { await navigator.share(payload); return true; }
    } catch (e) { if (e && e.name === 'AbortError') return true; }
    return false;
  }
  function download() {
    const a = document.createElement('a'); a.href = urls[fmt]; a.download = `noujiru-typing-${data.rank}.png`; document.body.appendChild(a); a.click(); a.remove();
  }
  async function copyImage() {
    try {
      if (!navigator.clipboard || !window.ClipboardItem) return false;
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': make(fmt) })]);
      return true;
    } catch (e) { return false; }
  }
  const touch = isTouchDevice();
  const fullText = () => `${shareText(data)}\n${shareUrl(site)}\n#${HASHTAGS.join(' #')}`;
  const actions = {
    async save() {
      await make(fmt); download();
      say(touch ? 'がぞうを ほぞんしたよ！（ひらかない ときは がぞうを ながおし）' : 'がぞうを ダウンロードしたよ！');
    },
    async copy() { say((await copyImage()) ? 'がぞうを コピーしたよ！ SNSで ペーストしてね' : 'この ブラウザでは コピーできないよ。「ほぞん」を つかってね'); },
    async text() { try { await navigator.clipboard.writeText(fullText()); say('ほんぶんと URLを コピーしたよ！'); } catch (e) { say(fullText()); } },
    async url() { const u = shareUrl(site); try { await navigator.clipboard.writeText(u); say('URLを コピーしたよ！'); } catch (e) { say(u); } },
    // Phones only: one hand-off that carries the picture AND the text to whichever app is picked.
    async native() { if (!(await nativeShare(true))) say('この ブラウザでは つかえないよ。「ほぞん」を つかってね'); },
  };
  if (!(touch && navigator.share)) { const b = $('#share-send'); if (b) b.hidden = true; }
  $('#share-close').addEventListener('click', () => { audio.play('blip', audio.now(), { m: 72, v: 0.08 }); close(); });
  box.addEventListener('pointerdown', (e) => { if (e.target === box) close(); });
  addEventListener('keydown', (e) => { if (!box.hidden && e.key === 'Escape') { close(); e.stopImmediatePropagation(); } }, true);
  box.querySelectorAll('[data-fmt]').forEach((b) => b.addEventListener('click', () => { fmt = b.dataset.fmt; audio.play('blip', audio.now(), { m: 84, v: 0.08 }); show(); }));
  box.querySelectorAll('[data-sh]').forEach((b) => b.addEventListener('click', async () => { audio.play('blip', audio.now(), { m: 90, v: 0.1 }); vib(15); if (!data) return; try { await actions[b.dataset.sh](); } catch (e) { say('うまく いかなかったよ…'); } }));
  return { open: () => open(getData()), close, isOpen: () => !box.hidden };
}
