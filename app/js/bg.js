// Full-screen WebGL backdrop: sunburst rays that grow into a rainbow tunnel of
// Dopakichi silhouettes. Falls back to a CSS conic gradient without WebGL.

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`;
const FRAG = `precision highp float;
uniform vec2 uRes; uniform vec2 uCenter; uniform float uTime, uE, uKick, uFlash, uReach, uHue, uTheme, uFever, uNou;
vec3 hsv(float h, float s, float v){ vec3 k = clamp(abs(mod(h*6. + vec3(0.,4.,2.), 6.) - 3.) - 1., 0., 1.); return v * mix(vec3(1.), k, s); }
float hash(vec2 c){ return fract(sin(dot(c, vec2(127.1, 311.7))) * 43758.5453); }
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
// Dopakichi head silhouette: a wide rounded head with large side ears.
float dopa(vec2 p){
  vec2 q = (p - vec2(0., -0.02)) / vec2(0.2, 0.15);
  float h = (length(q) - 1.) * 0.15;
  float e1 = length(p - vec2(-0.26, 0.01)) - 0.11;
  float e2 = length(p - vec2(0.26, 0.01)) - 0.11;
  return min(h, min(e1, e2));
}
// Beat rings travelling outward (shared).
float beatRings(float r, float t, float E){ return smoothstep(.35, .7, E) * smoothstep(0.035, 0., abs(fract(r * 2.4 - t * 0.8) - .5) - .45); }

// 0: ねこまんだら — pop, cute psychedelia: a pastel kaleidoscope of cats and
// paws that spins with the band, swirls with the dopa and turns into a cat
// tunnel in FEVER. Colours flow smoothly (no strobing).
float sdCat(vec2 p){
  float h = length(p * vec2(1., 1.15)) - .2;
  vec2 q = vec2(abs(p.x), p.y);
  vec2 e = q - vec2(.12, .16);
  float ear = abs(e.x) * .9 + abs(e.y + e.x * .6) - .09;
  return min(h, ear);
}
float sdPaw(vec2 p){
  float d = length((p - vec2(0., -.05)) * vec2(1., 1.2)) - .1;
  d = min(d, length(p - vec2(-.13, .06)) - .045);
  d = min(d, length(p - vec2(-.05, .13)) - .045);
  d = min(d, length(p - vec2(.05, .13)) - .045);
  d = min(d, length(p - vec2(.13, .06)) - .045);
  return d;
}
vec3 classic(vec2 p, float r, float a, float E, float t){
  float e = clamp(E, 0., 1.2);
  float sw = .35 * e + .6 * uFever;
  a += sin(r * 5. - t * (.6 + .8 * e)) * sw;                // swirl
  float n = floor(6. + 6. * clamp(e, 0., 1.)) + 2. * uFever;  // mirrors
  float seg = 6.2832 / n;
  float fa = abs(mod(a + t * (.05 + .25 * e + .6 * uFever), seg) - seg * .5);
  vec2 k = r * vec2(cos(fa), sin(fa));
  // pastel rainbow rings as the base
  float hue = fract(r * .6 - t * (.03 + .08 * e) + uHue + fa * .15);
  vec3 col = hsv(hue, .28 + .3 * smoothstep(.2, 1., e), 1.);
  col = mix(vec3(1., .97, .93), col, smoothstep(.02, .5, e) * .9 + .1);
  // motif grid in log-polar space
  vec2 uv = vec2(log(r + .02) * 2.2 - t * (.25 + .9 * e + 2.2 * uFever), fa * 3.2);
  vec2 cell = floor(uv); vec2 f = fract(uv) - .5;
  float pick = mod(cell.x + cell.y, 2.);
  float d = pick < .5 ? sdCat(vec2(f.y, -f.x) * 1.1) : sdPaw(vec2(f.y, -f.x) * 1.25);
  vec3 mc = hsv(fract(cell.x * .13 + t * (.05 + .1 * e) + uHue + .5), .45 + .2 * e, 1.);
  float m = smoothstep(.012, -.012, d) * smoothstep(.03, .25, r) * smoothstep(.05, .45, e);
  float ol = smoothstep(.025, 0., abs(d + .008)) * smoothstep(.03, .25, r) * smoothstep(.05, .45, e);
  col = mix(col, mc, m * .85);
  col = mix(col, vec3(.35, .3, .55), ol * .55);
  col = mix(col, vec3(1.), beatRings(r, t, E) * .35);
  // FEVER: cats rushing out of the centre
  if (uFever > .01) {
    vec2 tv = vec2(a / 6.2832 * 12., .35 / (r + .02) + t * 2.6);
    vec2 tc = floor(tv); vec2 tf = fract(tv) - .5;
    float td = sdCat(vec2(tf.x, -tf.y) * 1.05);
    vec3 tcol = hsv(fract(tc.x * .09 + tc.y * .21 + t * .3), .5, 1.);
    float tm = smoothstep(.015, -.015, td) * smoothstep(.02, .3, r);
    col = mix(col, tcol, tm * uFever * .9);
  }
  return col;
}

// 1: night sky: twinkling stars -> aurora -> warp through a star field.
vec3 night(vec2 p, float r, float a, float E, float t){
  vec3 col = mix(vec3(.06, .08, .25), vec3(.2, .13, .42), clamp(.5 - p.y, 0., 1.));
  for (int i = 0; i < 2; i++) {
    float sc = i == 0 ? 7. : 13.;
    vec2 q = rot(t * .02 * (.4 + E) * (i == 0 ? 1. : -.6)) * p * sc;
    vec2 c = floor(q); vec2 f = fract(q) - .5;
    float h = hash(c + float(i) * 9.);
    vec2 o = (vec2(hash(c + 1.7), hash(c + 3.1)) - .5) * .6;
    float tw = .55 + .45 * sin(t * (2. + h * 3.) + h * 40.);
    float s = smoothstep(.06 + .07 * h, 0., length(f - o)) * step(.5, h);
    col += vec3(1., .96, .8) * s * tw * (i == 0 ? 1. : .6);
  }
  float au = smoothstep(.45, .8, E) * smoothstep(.3, 0., abs(p.y + .15 * sin(p.x * 3. + t * .6) - .12 * sin(t * .4)));
  col += hsv(fract(p.x * .35 + t * .05 + uHue + .3), .55, 1.) * au * .55;
  col = mix(col, vec3(.95, .9, 1.), beatRings(r, t, E) * .35);
  float tn = smoothstep(.82, 1.08, E);
  if (tn > 0.001) {
    vec2 uv = vec2(a / 6.2832 * 48., .25 / (r + .02) + t * (2.5 + max(0., E - 1.) * 3.));
    vec2 c = floor(uv); float h = hash(c);
    float streak = step(.82, h) * smoothstep(.18, 0., abs(fract(uv.x) - .5)) * smoothstep(.0, .6, fract(uv.y)) * smoothstep(.02, .3, r);
    col += hsv(fract(h * 3. + uHue), .35, 1.) * streak * tn * 1.2;
  }
  return col;
}

// 2: sea: caustics and rising bubbles -> a whirlpool of bubbles.
vec3 sea(vec2 p, float r, float a, float E, float t){
  vec3 col = mix(vec3(.55, .9, .95), vec3(.08, .35, .7), clamp(.5 + p.y * .9, 0., 1.));
  float c = sin(p.x * 11. + t * .9) + sin(p.y * 9. - t * 1.2) + sin((p.x + p.y) * 7. + t * .6);
  col += vec3(.9, 1., 1.) * smoothstep(1.6, 2.6, c) * .35;
  vec2 q = p;
  q = rot(smoothstep(.6, 1.1, E) * (1.5 - r) * 1.8 + t * .15 * smoothstep(.6, 1., E)) * q;
  vec2 uv = q * 6. + vec2(0., t * (.25 + .8 * E));
  vec2 cell = floor(uv); vec2 f = fract(uv) - .5;
  float h = hash(cell);
  f.x += sin(t * 2. + h * 20.) * .12;
  float rad = .12 + .18 * h;
  float d = length(f) - rad;
  float bub = step(.45, h) * smoothstep(.04, 0., abs(d)) * smoothstep(.1, .25, E);
  float shine = step(.45, h) * smoothstep(.05, 0., length(f - vec2(-rad * .4, -rad * .45)) - rad * .12);
  col = mix(col, vec3(1.), (bub * .85 + shine) * smoothstep(.1, .3, E));
  col = mix(col, vec3(.85, 1., 1.), beatRings(r, t, E) * .45);
  float tn = smoothstep(.82, 1.08, E);
  col = mix(col, hsv(fract(a / 6.2832 * 2. + r - t * .2 + uHue), .45, 1.), tn * .35 * smoothstep(.05, .4, r));
  return col;
}

// 3: space: nebula, planets and warp lines -> a spinning rainbow galaxy.
vec3 space(vec2 p, float r, float a, float E, float t){
  vec3 col = vec3(.08, .04, .18);
  float n = sin(p.x * 3. + t * .2) * sin(p.y * 4. - t * .15) + sin((p.x - p.y) * 5. + 1.3);
  col += mix(vec3(.45, .1, .5), vec3(.1, .3, .7), .5 + .5 * sin(p.x * 2. + t * .1)) * smoothstep(-.2, 1.4, n) * .6;
  vec2 q = p * 11.; vec2 cc = floor(q); float h = hash(cc);
  col += vec3(1.) * step(.8, h) * smoothstep(.1, 0., length(fract(q) - .5)) * .8;
  vec2 pl = p - vec2(-.42, -.28 + .02 * sin(t * .5));
  float planet = smoothstep(.13, .12, length(pl));
  float ringP = smoothstep(.012, 0., abs(length(pl * vec2(1., 3.2)) - .2)) * step(.0, -pl.y + .03 * pl.x + .0001) ;
  col = mix(col, mix(vec3(1., .6, .75), vec3(1., .85, .45), pl.y * 3. + .5), planet);
  col = mix(col, vec3(1., .95, .7), ringP * .9);
  vec2 pm = p - vec2(.45, .3);
  col = mix(col, vec3(.55, .8, 1.), smoothstep(.07, .065, length(pm)));
  float warp = smoothstep(.3, .7, E) * step(.9, hash(vec2(floor(a * 30.), 1.))) * smoothstep(.0, .5, fract(r * 1.5 - t * (1. + E)));
  col += vec3(.8, .9, 1.) * warp * .7;
  float tn = smoothstep(.8, 1.08, E);
  if (tn > 0.001) {
    float arm = sin(a * 3. + log(r + .02) * 5. - t * (1.5 + max(0., E - 1.)));
    col = mix(col, hsv(fract(log(r + .02) * .3 + t * .1 + uHue), .7, 1.), tn * smoothstep(.2, .9, arm) * smoothstep(.02, .15, r) * .85);
  }
  return col;
}

// 4: festival: red-white stripes and swinging paper lanterns -> spinning fans.
vec3 festival(vec2 p, float r, float a, float E, float t){
  float st = step(.5, fract((p.x - p.y) * 2.5 + t * .12 * (.4 + E)));
  vec3 col = mix(vec3(1., .97, .92), mix(vec3(1., .86, .86), vec3(.93, .18, .25), smoothstep(.3, .8, E)), st * smoothstep(.1, .5, E));
  // Lantern rows hang from strings at the top half of the screen.
  vec2 uv = vec2(p.x * 5.5, p.y * 4.2 + 1.7);
  vec2 cell = floor(uv); vec2 f = fract(uv) - .5;
  float on = step(abs(cell.y - 1.), .5) * smoothstep(.12, .4, E);
  float sw = sin(t * 1.8 + cell.x * 1.7) * .1 * (.4 + E);
  f = rot(sw) * (f + vec2(0., .5)) - vec2(0., .5);
  vec2 lq = f / vec2(.3, .36);
  float body = smoothstep(1.03, .97, length(lq));
  float cap = step(abs(f.x), .16) * step(.3, abs(f.y)) * step(abs(f.y), .43);
  float rib = smoothstep(.06, 0., abs(fract(lq.y * 2.5) - .5) - .38) * body;
  vec3 lc = mix(vec3(1., .22, .28), vec3(1., .88, .35), step(mod(cell.x, 3.), .5));
  lc = mix(lc, lc * .72, rib) + vec3(1., .85, .5) * .35 * (1. - length(lq)) * (.6 + .4 * uKick);
  col = mix(col, lc, body * on);
  col = mix(col, vec3(.1, .08, .2), (cap + smoothstep(.07, 0., abs(length(lq) - 1.)) * body) * on);
  col = mix(col, vec3(.1, .08, .2), step(abs(f.x), .012) * step(f.y, -.4) * on);
  col = mix(col, vec3(1., .95, .6), beatRings(r, t, E) * .5);
  float tn = smoothstep(.82, 1.08, E);
  if (tn > .001) {
    float fan = smoothstep(-.1, .1, sin(a * 12. - t * 2. + r * 4.)) * smoothstep(.02, .2, r);
    col = mix(col, mix(hsv(fract(r * .6 + t * .12 + uHue), .75, 1.), vec3(1., .95, .85), fan * .6), tn * .8);
  }
  return col;
}

// 5: paper craft: wavy paper bands and polka dots -> spinning paper flowers.
vec3 paper(vec2 p, float r, float a, float E, float t){
  float w = p.y * 5. + sin(p.x * 4. + t * .6) * .35 * (.3 + E);
  float band = floor(w);
  vec3 pal[4];
  pal[0] = vec3(1., .5, .72); pal[1] = vec3(.5, .66, 1.); pal[2] = vec3(1., .82, .3); pal[3] = vec3(.4, .88, .72);
  int bi = int(mod(band, 4.));
  vec3 bc = bi == 0 ? pal[0] : bi == 1 ? pal[1] : bi == 2 ? pal[2] : pal[3];
  vec3 col = mix(vec3(1., .97, .92), bc, smoothstep(.08, .3, E));
  col = mix(col, vec3(.1, .11, .3), smoothstep(.07, 0., abs(fract(w) - .03)) * .85 * smoothstep(.08, .3, E));
  col = mix(col, col * .82, smoothstep(.2, 0., fract(w)) * smoothstep(.08, .3, E));
  vec2 dq = rot(.3) * p * 9.; vec2 df = fract(dq) - .5;
  col = mix(col, vec3(1.), smoothstep(.16, .13, length(df)) * smoothstep(.3, .6, E) * .7);
  col = mix(col, vec3(1.), beatRings(r, t, E) * .4);
  float tn = smoothstep(.8, 1.08, E);
  if (tn > .001) {
    vec2 uv = p * 3.2; vec2 c = floor(uv); vec2 f = (fract(uv) - .5) * rot(t * (hash(c) > .5 ? 1. : -1.) + hash(c) * 6.);
    float fa = atan(f.y, f.x); float fr = length(f);
    float petal = smoothstep(.02, -.02, fr - (.28 + .1 * cos(fa * 5.)));
    col = mix(col, hsv(fract(hash(c) + t * .1 + uHue), .55, 1.), petal * tn);
    col = mix(col, vec3(.1, .11, .3), smoothstep(.025, 0., abs(fr - (.28 + .1 * cos(fa * 5.)))) * tn * .8);
    col = mix(col, vec3(1., .9, .4), smoothstep(.08, .06, fr) * tn);
  }
  return col;
}

void main(){
  vec2 fc = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 p = (fc - uCenter) / uRes.y;
  float E = uE; float t = uTime;
  p *= 1. - 0.06 * uKick * smoothstep(.35, .6, E);
  float r = length(p); float a = atan(p.y, p.x);
  vec3 col;
  if (uTheme < .5) col = classic(p, r, a, E, t);
  else if (uTheme < 1.5) col = night(p, r, a, E, t);
  else if (uTheme < 2.5) col = sea(p, r, a, E, t);
  else if (uTheme < 3.5) col = space(p, r, a, E, t);
  else if (uTheme < 4.5) col = festival(p, r, a, E, t);
  else col = paper(p, r, a, E, t);
  col += vec3(1., .96, .85) * exp(-r * r * 14.) * (.25 + .6 * uKick * E) * (uTheme > .5 && uTheme < 1.5 || uTheme > 2.5 && uTheme < 3.5 ? .5 : 1.);
  col = mix(col, col * vec3(.16, .12, .32), uReach * smoothstep(.08, .5, r));
  // 脳汁: glossy rainbow liquid seeping in from the screen edges as the dopa grows.
  vec2 sp = gl_FragCoord.xy / uRes;
  float edge = min(min(sp.x, 1. - sp.x), min(sp.y, 1. - sp.y));
  float wob = .025 * sin(sp.x * 23. + t * 1.7) + .025 * sin(sp.y * 19. - t * 1.3) + .015 * sin((sp.x + sp.y) * 41. + t * 2.3);
  float ooze = smoothstep(.012, 0., edge - (uNou * .16 + wob * uNou));
  vec3 goo = hsv(fract(sp.x * .7 + sp.y * .5 + t * .06 + uHue), .45, 1.);
  goo += vec3(.35) * smoothstep(.006, 0., abs(edge - (uNou * .16 + wob * uNou) + .01)) * uNou;
  col = mix(col, goo, ooze * uNou);
  col = mix(col, vec3(1.), clamp(uFlash, 0., 1.));
  float alpha = smoothstep(.1, .3, E) * (.32 + .68 * smoothstep(.3, .62, E));
  alpha = max(alpha, uReach * .88);
  alpha = max(alpha, clamp(uFlash, 0., 1.));
  alpha = max(alpha, ooze * uNou * .95);
  alpha = max(alpha, uFever * .95);
  gl_FragColor = vec4(col * alpha, alpha);
}`;

export const THEMES = ['classic', 'night', 'sea', 'space', 'festival', 'paper'];
const FALLBACK = [
  'repeating-conic-gradient(from 0deg at 50% 50%, #3b6bff 0 9deg, #ff7ab6 9deg 18deg)',
  'repeating-conic-gradient(from 0deg at 50% 50%, #1b1d4d 0 9deg, #3b2f7a 9deg 18deg)',
  'repeating-conic-gradient(from 0deg at 50% 50%, #3aa7d8 0 9deg, #8fe3ef 9deg 18deg)',
  'repeating-conic-gradient(from 0deg at 50% 50%, #14082e 0 9deg, #4a1f6e 9deg 18deg)',
  'repeating-conic-gradient(from 0deg at 50% 50%, #ff4f5e 0 9deg, #fff1e0 9deg 18deg)',
  'repeating-conic-gradient(from 0deg at 50% 50%, #ffb8d4 0 9deg, #c4d6ff 9deg 18deg)',
];

export class Backdrop {
  constructor(canvas, fallback) {
    this.canvas = canvas;
    this.fallback = fallback;
    this.state = { E: 0, kick: 0, flash: 0, reach: 0, hue: 0, cx: 0, cy: 0, theme: 0, fever: 0, nou: 0 };
    this.gl = null;
    try { this.init(); } catch (e) { console.warn('webgl off', e); this.gl = null; }
    if (!this.gl) { canvas.style.display = 'none'; fallback.style.display = 'block'; }
  }
  init() {
    const gl = this.canvas.getContext('webgl', { antialias: false, premultipliedAlpha: true, alpha: true, powerPreference: 'high-performance' });
    if (!gl) return;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.u = {};
    for (const n of ['uRes', 'uCenter', 'uTime', 'uE', 'uKick', 'uFlash', 'uReach', 'uHue', 'uTheme', 'uFever', 'uNou']) this.u[n] = gl.getUniformLocation(prog, n);
    this.gl = gl;
    this.canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.gl = null; this.canvas.style.display = 'none'; this.fallback.style.display = 'block'; });
  }
  resize() {
    const dpr = Math.min(1.25, window.devicePixelRatio || 1);
    const w = Math.round(innerWidth * dpr); const h = Math.round(innerHeight * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    this.dpr = dpr;
  }
  // Unlockable backgrounds (id041, id042); the CSS fallback gets matching colours.
  setTheme(name) {
    const i = Math.max(0, THEMES.indexOf(name));
    this.state.theme = i;
    this.fallback.style.background = FALLBACK[i];
  }
  render(t) {
    const s = this.state;
    if (!this.gl) {
      const f = this.fallback;
      f.style.opacity = String(Math.min(1, Math.max(s.reach * 0.8, (s.E - 0.12) * 2)));
      f.style.transform = `rotate(${(t / 1000) * (8 + 40 * s.E)}deg) scale(${1 + s.kick * 0.04})`;
      f.style.filter = s.E > 0.6 ? `hue-rotate(${(t / 20) % 360}deg)` : 'none';
      return;
    }
    this.resize();
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.uniform2f(this.u.uRes, this.canvas.width, this.canvas.height);
    gl.uniform2f(this.u.uCenter, s.cx * this.dpr, s.cy * this.dpr);
    gl.uniform1f(this.u.uTime, t / 1000);
    gl.uniform1f(this.u.uE, s.E);
    gl.uniform1f(this.u.uKick, s.kick);
    gl.uniform1f(this.u.uFlash, s.flash);
    gl.uniform1f(this.u.uReach, s.reach);
    gl.uniform1f(this.u.uHue, s.hue);
    gl.uniform1f(this.u.uTheme, s.theme);
    gl.uniform1f(this.u.uFever, s.fever || 0);
    gl.uniform1f(this.u.uNou, s.nou || 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
