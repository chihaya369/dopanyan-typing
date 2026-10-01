// Procedural audio engine: every sound is synthesized with Web Audio.
// All sound goes through play(name, when, params). In live mode it is rendered
// immediately; in capture mode it is only logged so that the exact same score
// can be rendered offline (OfflineAudioContext) and muxed into a video.

const midiHz = (m) => 440 * 2 ** ((m - 69) / 12);

// ---------------------------------------------------------------- graph
export function makeGraph(ctx) {
  const g = { ctx };
  g.master = ctx.createGain();
  g.master.gain.value = 0.72;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 3.2; comp.attack.value = 0.004; comp.release.value = 0.18;
  const limit = ctx.createDynamicsCompressor();
  limit.threshold.value = -2.5; limit.knee.value = 0; limit.ratio.value = 20; limit.attack.value = 0.001; limit.release.value = 0.06;
  g.master.connect(comp); comp.connect(limit); limit.connect(ctx.destination);

  g.drums = ctx.createGain(); g.drums.gain.value = 0.9; g.drums.connect(g.master);
  g.duck = ctx.createGain(); g.duck.connect(g.master);
  g.musicFilter = ctx.createBiquadFilter(); g.musicFilter.type = 'lowpass'; g.musicFilter.frequency.value = 18000; g.musicFilter.Q.value = 0.9;
  g.musicFilter.connect(g.duck);
  g.music = ctx.createGain(); g.music.gain.value = 0.8; g.music.connect(g.musicFilter);
  g.sfx = ctx.createGain(); g.sfx.gain.value = 0.85; g.sfx.connect(g.master);

  // Reverb from a generated stereo impulse response.
  const len = Math.floor(ctx.sampleRate * 2.4);
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.6 * (i < 300 ? i / 300 : 1);
  }
  g.rev = ctx.createGain(); g.rev.gain.value = 0.42;
  const conv = ctx.createConvolver(); conv.buffer = ir;
  const revHp = ctx.createBiquadFilter(); revHp.type = 'highpass'; revHp.frequency.value = 260;
  g.rev.connect(revHp); revHp.connect(conv); conv.connect(g.master);

  // Dotted-eighth delay (retimed by the engine when the tempo changes).
  g.dly = ctx.createGain(); g.dly.gain.value = 0.3;
  g.delay = ctx.createDelay(2); g.delay.delayTime.value = 0.375;
  const fb = ctx.createGain(); fb.gain.value = 0.36;
  const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 3200;
  g.dly.connect(g.delay); g.delay.connect(dlp); dlp.connect(fb); fb.connect(g.delay); dlp.connect(g.master);

  const nlen = ctx.sampleRate * 2;
  g.noise = ctx.createBuffer(1, nlen, ctx.sampleRate);
  const nd = g.noise.getChannelData(0);
  for (let i = 0; i < nlen; i++) nd[i] = Math.random() * 2 - 1;
  return g;
}

// ---------------------------------------------------------------- helpers
function env(g, t, { a = 0.005, peak = 1, d = 0.2, s = 0, hold = 0, r = 0.1 } = {}) {
  const gain = g.ctx.createGain();
  const p = gain.gain;
  p.setValueAtTime(0.0001, t);
  p.linearRampToValueAtTime(peak, t + a);
  if (s > 0) {
    p.setTargetAtTime(peak * s, t + a, d / 3);
    p.setValueAtTime(peak * s, t + a + hold);
    p.exponentialRampToValueAtTime(0.0001, t + a + hold + r);
  } else {
    p.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  return gain;
}
function osc(g, type, f, t, stop, detune = 0) {
  const o = g.ctx.createOscillator();
  o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
  o.start(t); o.stop(stop);
  return o;
}
function noise(g, t, stop) {
  const n = g.ctx.createBufferSource();
  n.buffer = g.noise; n.loop = true;
  n.start(t, Math.random() * 1.5); n.stop(stop);
  return n;
}
function filt(g, type, f, q = 0.7) {
  const b = g.ctx.createBiquadFilter();
  b.type = type; b.frequency.value = f; b.Q.value = q;
  return b;
}
function pan(g, v) {
  const p = g.ctx.createStereoPanner ? g.ctx.createStereoPanner() : g.ctx.createGain();
  if (p.pan) p.pan.value = v;
  return p;
}
function send(g, node, rev = 0, dly = 0) {
  if (rev) { const s = g.ctx.createGain(); s.gain.value = rev; node.connect(s); s.connect(g.rev); }
  if (dly) { const s = g.ctx.createGain(); s.gain.value = dly; node.connect(s); s.connect(g.dly); }
}

// ---------------------------------------------------------------- instruments
export const SYNTH = {
  kick(g, t, { v = 1 }) {
    const o = osc(g, 'sine', 170, t, t + 0.5);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.11);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.4);
    const e = env(g, t, { a: 0.002, peak: 1.05 * v, d: 0.42 });
    o.connect(e); e.connect(g.drums);
    const n = noise(g, t, t + 0.02); const hp = filt(g, 'highpass', 2500); const ne = env(g, t, { a: 0.001, peak: 0.35 * v, d: 0.015 });
    n.connect(hp); hp.connect(ne); ne.connect(g.drums);
  },
  clap(g, t, { v = 1 }) {
    for (let i = 0; i < 3; i++) {
      const tt = t + i * 0.011;
      const n = noise(g, tt, tt + 0.25); const bp = filt(g, 'bandpass', 1350, 0.9);
      const e = env(g, tt, { a: 0.001, peak: (i === 2 ? 0.75 : 0.45) * v, d: i === 2 ? 0.2 : 0.03 });
      n.connect(bp); bp.connect(e); e.connect(g.drums); send(g, e, 0.35);
    }
    const o = osc(g, 'triangle', 200, t, t + 0.1); const oe = env(g, t, { peak: 0.2 * v, d: 0.07 });
    o.connect(oe); oe.connect(g.drums);
  },
  snare(g, t, { v = 0.6 }) {
    const n = noise(g, t, t + 0.18); const bp = filt(g, 'bandpass', 1900, 0.6);
    const e = env(g, t, { a: 0.001, peak: v, d: 0.12 });
    n.connect(bp); bp.connect(e); e.connect(g.drums); send(g, e, 0.2);
    const o = osc(g, 'triangle', 230, t, t + 0.08); const oe = env(g, t, { peak: v * 0.4, d: 0.05 });
    o.connect(oe); oe.connect(g.drums);
  },
  hat(g, t, { v = 0.3, open = false }) {
    const n = noise(g, t, t + (open ? 0.35 : 0.06)); const hp = filt(g, 'highpass', open ? 6500 : 8200);
    const e = env(g, t, { a: 0.001, peak: v, d: open ? 0.26 : 0.035 });
    const p = pan(g, open ? -0.15 : 0.25);
    n.connect(hp); hp.connect(e); e.connect(p); p.connect(g.drums);
  },
  shaker(g, t, { v = 0.08 }) {
    const n = noise(g, t, t + 0.08); const bp = filt(g, 'bandpass', 6200, 1.4);
    const e = env(g, t, { a: 0.012, peak: v, d: 0.05 });
    const p = pan(g, 0.35);
    n.connect(bp); bp.connect(e); e.connect(p); p.connect(g.drums);
  },
  crash(g, t, { v = 0.5 }) {
    const n = noise(g, t, t + 2.4); const hp = filt(g, 'highpass', 4200);
    const e = env(g, t, { a: 0.002, peak: v, d: 2.2 });
    n.connect(hp); hp.connect(e); e.connect(g.drums); send(g, e, 0.3);
    const n2 = noise(g, t, t + 1.2); const bp = filt(g, 'bandpass', 9000, 3); const e2 = env(g, t, { peak: v * 0.5, d: 1.1 });
    n2.connect(bp); bp.connect(e2); e2.connect(g.drums);
  },
  impact(g, t, { v = 1 }) {
    const o = osc(g, 'sine', 90, t, t + 1.6);
    o.frequency.exponentialRampToValueAtTime(28, t + 1.4);
    const e = env(g, t, { a: 0.003, peak: 1.1 * v, d: 1.5 });
    o.connect(e); e.connect(g.drums);
    const n = noise(g, t, t + 1.2); const lp = filt(g, 'lowpass', 900); const ne = env(g, t, { peak: 0.6 * v, d: 1.0 });
    lp.frequency.exponentialRampToValueAtTime(120, t + 1);
    n.connect(lp); lp.connect(ne); ne.connect(g.drums); send(g, ne, 0.5);
  },
  riser(g, t, { dur = 2, v = 0.35 }) {
    const n = noise(g, t, t + dur + 0.1); const bp = filt(g, 'bandpass', 300, 2.5);
    bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(7000, t + dur);
    const e = g.ctx.createGain(); e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(v, t + dur); e.gain.linearRampToValueAtTime(0.0001, t + dur + 0.08);
    n.connect(bp); bp.connect(e); e.connect(g.sfx); send(g, e, 0.4);
    const o = osc(g, 'sawtooth', 180, t, t + dur + 0.1); o.frequency.exponentialRampToValueAtTime(1400, t + dur);
    const lp = filt(g, 'lowpass', 2400); const oe = g.ctx.createGain();
    oe.gain.setValueAtTime(0.0001, t); oe.gain.exponentialRampToValueAtTime(v * 0.25, t + dur); oe.gain.linearRampToValueAtTime(0.0001, t + dur + 0.08);
    o.connect(lp); lp.connect(oe); oe.connect(g.sfx);
  },
  swoosh(g, t, { v = 0.3, up = true, dur = 0.35 }) {
    const n = noise(g, t, t + dur + 0.05); const bp = filt(g, 'bandpass', up ? 500 : 5000, 1.8);
    bp.frequency.exponentialRampToValueAtTime(up ? 5000 : 400, t + dur);
    const e = env(g, t, { a: dur * 0.6, peak: v, d: dur * 0.4 });
    const p = pan(g, 0); if (p.pan) { p.pan.setValueAtTime(up ? -0.7 : 0.7, t); p.pan.linearRampToValueAtTime(up ? 0.7 : -0.7, t + dur); }
    n.connect(bp); bp.connect(e); e.connect(p); p.connect(g.sfx); send(g, e, 0.25);
  },
  bass(g, t, { m, dur = 0.2, v = 0.5 }) {
    const f = midiHz(m);
    const o1 = osc(g, 'sawtooth', f, t, t + dur + 0.15); const o2 = osc(g, 'square', f / 2, t, t + dur + 0.15);
    const lp = filt(g, 'lowpass', 180, 6);
    lp.frequency.setValueAtTime(180, t); lp.frequency.exponentialRampToValueAtTime(1100, t + 0.02); lp.frequency.exponentialRampToValueAtTime(260, t + dur);
    const e = env(g, t, { a: 0.004, peak: v, d: dur, s: 0.6, hold: dur * 0.6, r: 0.08 });
    const m2 = g.ctx.createGain(); m2.gain.value = 0.5;
    o1.connect(lp); o2.connect(m2); m2.connect(lp); lp.connect(e); e.connect(g.music);
  },
  pad(g, t, { notes, dur = 2, v = 0.08, bright = 900 }) {
    const e = env(g, t, { a: 0.35, peak: v, d: 0.4, s: 0.85, hold: dur, r: 0.6 });
    const lp = filt(g, 'lowpass', bright, 0.8);
    lp.connect(e); e.connect(g.music); send(g, e, 0.5);
    for (const m of notes) for (const dt of [-9, 9]) {
      const o = osc(g, 'sawtooth', midiHz(m), t, t + dur + 1.2, dt);
      o.connect(lp);
    }
  },
  // Cat voices: a formant-swept sawtooth "nya" and a low purr.
  meow(g, t, { m = 76, v = 0.12, dur = 0.34, down = false, pan: pv = 0 }) {
    const f = midiHz(m);
    const o = osc(g, 'sawtooth', f, t, t + dur + 0.05);
    o.frequency.setValueAtTime(f * (down ? 1.15 : 0.9), t);
    o.frequency.linearRampToValueAtTime(f * (down ? 1.05 : 1.12), t + dur * 0.35);
    o.frequency.exponentialRampToValueAtTime(f * (down ? 0.7 : 0.88), t + dur);
    const vib = osc(g, 'sine', 7, t, t + dur + 0.05); const vg = g.ctx.createGain(); vg.gain.value = f * 0.012; vib.connect(vg); vg.connect(o.frequency);
    const bp = filt(g, 'bandpass', 900, 3.5);
    bp.frequency.setValueAtTime(700, t); bp.frequency.linearRampToValueAtTime(1900, t + dur * 0.3); bp.frequency.exponentialRampToValueAtTime(800, t + dur);
    const bp2 = filt(g, 'bandpass', 2800, 5);
    const e = env(g, t, { a: 0.03, peak: v, d: dur });
    const p = pan(g, pv);
    o.connect(bp); o.connect(bp2); bp.connect(e); bp2.connect(e); e.connect(p); p.connect(g.sfx); send(g, e, 0.2);
  },
  purr(g, t, { v = 0.2, dur = 0.9 }) {
    const n = noise(g, t, t + dur + 0.05);
    const lp = filt(g, 'lowpass', 260, 1.5);
    const am = g.ctx.createGain(); am.gain.value = 0;
    const lfo = osc(g, 'sine', 26, t, t + dur + 0.05); const lg = g.ctx.createGain(); lg.gain.value = 0.5; lfo.connect(lg); lg.connect(am.gain);
    const e = env(g, t, { a: 0.08, peak: v, d: dur });
    n.connect(lp); lp.connect(am); am.connect(e); e.connect(g.sfx);
  },
  pluck(g, t, { m, v = 0.2, dur = 0.5, pan: pv = 0 }) {
    const f = midiHz(m);
    const o = osc(g, 'sine', f, t, t + dur + 0.1); const o2 = osc(g, 'sine', f * 4, t, t + 0.12);
    const e = env(g, t, { a: 0.002, peak: v, d: dur }); const e2 = env(g, t, { a: 0.001, peak: v * 0.35, d: 0.06 });
    const p = pan(g, pv);
    o.connect(e); o2.connect(e2); e2.connect(p); e.connect(p); p.connect(g.music); send(g, e, 0.3);
  },
  arp(g, t, { m, v = 0.08 }) {
    const o = osc(g, 'square', midiHz(m), t, t + 0.25);
    const lp = filt(g, 'lowpass', 3800, 2); lp.frequency.setValueAtTime(3800, t); lp.frequency.exponentialRampToValueAtTime(700, t + 0.14);
    const e = env(g, t, { a: 0.002, peak: v, d: 0.16 });
    const p = pan(g, Math.sin(m * 1.7) * 0.5);
    o.connect(lp); lp.connect(e); e.connect(p); p.connect(g.music); send(g, e, 0.15, 0.55);
  },
  stab(g, t, { notes, v = 0.12, dur = 0.2 }) {
    const lp = filt(g, 'lowpass', 5200, 1.2); lp.frequency.setValueAtTime(5200, t); lp.frequency.exponentialRampToValueAtTime(900, t + dur + 0.1);
    const e = env(g, t, { a: 0.003, peak: v, d: dur + 0.1 });
    lp.connect(e); e.connect(g.music); send(g, e, 0.35, 0.2);
    for (const m of notes) for (const dt of [-18, -7, 0, 7, 18]) {
      const o = osc(g, 'sawtooth', midiHz(m), t, t + dur + 0.25, dt);
      o.connect(lp);
    }
  },
  lead(g, t, { m, dur = 0.2, v = 0.1 }) {
    const f = midiHz(m);
    const o1 = osc(g, 'sawtooth', f, t, t + dur + 0.2, -6); const o2 = osc(g, 'square', f, t, t + dur + 0.2, 6);
    const lfo = osc(g, 'sine', 5.5, t, t + dur + 0.2); const lg = g.ctx.createGain(); lg.gain.value = 9;
    lfo.connect(lg); lg.connect(o1.detune); lg.connect(o2.detune);
    const lp = filt(g, 'lowpass', 3400, 1);
    const e = env(g, t, { a: 0.008, peak: v, d: 0.1, s: 0.7, hold: dur, r: 0.12 });
    o1.connect(lp); o2.connect(lp); lp.connect(e); e.connect(g.music); send(g, e, 0.3, 0.35);
  },
  choir(g, t, { notes, dur = 2, v = 0.06 }) {
    const out = env(g, t, { a: 0.5, peak: v, d: 0.5, s: 0.9, hold: dur, r: 0.8 });
    out.connect(g.music); send(g, out, 0.7);
    for (const fq of [[730, 6], [1090, 7], [2440, 9]]) {
      const bp = filt(g, 'bandpass', fq[0], fq[1]); const fg = g.ctx.createGain(); fg.gain.value = fq[0] === 730 ? 1.3 : 0.7;
      bp.connect(fg); fg.connect(out);
      for (const m of notes) { const o = osc(g, 'sawtooth', midiHz(m), t, t + dur + 1.5, (m % 5) * 4 - 8); o.connect(bp); }
    }
  },
  bell(g, t, { m, v = 0.2, dur = 1.1, pan: pv = 0 }) {
    const f = midiHz(m);
    const car = osc(g, 'sine', f, t, t + dur + 0.1);
    const mod = osc(g, 'sine', Math.min(20000, f * 3.5), t, t + dur + 0.1);
    const mg = g.ctx.createGain(); mg.gain.setValueAtTime(f * 2.2, t); mg.gain.exponentialRampToValueAtTime(f * 0.1, t + dur * 0.6);
    mod.connect(mg); mg.connect(car.frequency);
    const e = env(g, t, { a: 0.002, peak: v, d: dur });
    const p = pan(g, pv);
    car.connect(e); e.connect(p); p.connect(g.sfx); send(g, e, 0.35, 0.3);
  },
  // ---- voices for the unlockable songs (id041, id043) ----
  chip(g, t, { m, dur = 0.14, v = 0.08, pan: pv = 0 }) {
    const o = osc(g, 'square', midiHz(m), t, t + dur + 0.05);
    const e = env(g, t, { a: 0.002, peak: v, d: 0.05, s: 0.6, hold: dur, r: 0.03 });
    const p = pan(g, pv);
    o.connect(e); e.connect(p); p.connect(g.music); send(g, e, 0.08, 0.25);
  },
  tri(g, t, { m, dur = 0.2, v = 0.35 }) {
    const o = osc(g, 'triangle', midiHz(m), t, t + dur + 0.05);
    const e = env(g, t, { a: 0.002, peak: v, d: 0.05, s: 0.8, hold: dur, r: 0.04 });
    o.connect(e); e.connect(g.music);
  },
  noiseHat(g, t, { v = 0.12 }) {
    const n = noise(g, t, t + 0.06); const hp = filt(g, 'highpass', 6000, 0.7);
    const e = env(g, t, { a: 0.001, peak: v, d: 0.04 });
    n.connect(hp); hp.connect(e); e.connect(g.drums);
  },
  taiko(g, t, { v = 0.9, m = 45 }) {
    const o = osc(g, 'sine', midiHz(m + 12), t, t + 0.7);
    o.frequency.exponentialRampToValueAtTime(midiHz(m), t + 0.12);
    const e = env(g, t, { a: 0.002, peak: v, d: 0.55 });
    const n = noise(g, t, t + 0.12); const bp = filt(g, 'bandpass', 900, 0.8); const ne = env(g, t, { a: 0.001, peak: v * 0.35, d: 0.08 });
    o.connect(e); e.connect(g.drums); n.connect(bp); bp.connect(ne); ne.connect(g.drums); send(g, e, 0.25);
  },
  kane(g, t, { v = 0.08 }) {
    const hp = filt(g, 'highpass', 2500, 1); const e = env(g, t, { a: 0.001, peak: v, d: 0.22 });
    for (const f of [1870, 2640, 3310]) { const o = osc(g, 'square', f, t, t + 0.3); o.connect(hp); }
    hp.connect(e); e.connect(g.drums); send(g, e, 0.2);
  },
  shamisen(g, t, { m, v = 0.12, pan: pv = 0 }) {
    const f = midiHz(m);
    const o = osc(g, 'sawtooth', f * 1.01, t, t + 0.4); o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
    const hp = filt(g, 'highpass', 320, 0.7); const lp = filt(g, 'lowpass', 4200, 3);
    lp.frequency.setValueAtTime(4200, t); lp.frequency.exponentialRampToValueAtTime(900, t + 0.2);
    const e = env(g, t, { a: 0.001, peak: v, d: 0.28 }); const p = pan(g, pv);
    o.connect(hp); hp.connect(lp); lp.connect(e); e.connect(p); p.connect(g.music); send(g, e, 0.25);
  },
  fue(g, t, { m, dur = 0.3, v = 0.09 }) {
    const f = midiHz(m);
    const o = osc(g, 'sine', f, t, t + dur + 0.25);
    const lfo = osc(g, 'sine', 5, t, t + dur + 0.25); const lg = g.ctx.createGain(); lg.gain.value = 14;
    lfo.connect(lg); lg.connect(o.detune);
    const e = env(g, t, { a: 0.03, peak: v, d: 0.1, s: 0.85, hold: dur, r: 0.15 });
    const n = noise(g, t, t + dur + 0.2); const bp = filt(g, 'bandpass', f * 2, 3); const ng = g.ctx.createGain(); ng.gain.value = 0.25;
    o.connect(e); n.connect(bp); bp.connect(ng); ng.connect(e); e.connect(g.music); send(g, e, 0.45, 0.25);
  },
  brass(g, t, { notes, m, dur = 0.2, v = 0.1 }) {
    const list = notes || [m];
    const lp = filt(g, 'lowpass', 600, 1.4);
    lp.frequency.setValueAtTime(500, t); lp.frequency.exponentialRampToValueAtTime(2800, t + 0.05); lp.frequency.exponentialRampToValueAtTime(1300, t + dur + 0.1);
    const e = env(g, t, { a: 0.02, peak: v, d: 0.08, s: 0.75, hold: dur, r: 0.1 });
    lp.connect(e); e.connect(g.music); send(g, e, 0.3);
    for (const n of list) for (const dt of [-6, 6]) { const o = osc(g, 'sawtooth', midiHz(n), t, t + dur + 0.3, dt); o.connect(lp); }
  },
  tuba(g, t, { m, dur = 0.25, v = 0.4 }) {
    const o = osc(g, 'square', midiHz(m), t, t + dur + 0.1); const lp = filt(g, 'lowpass', 420, 1);
    const e = env(g, t, { a: 0.015, peak: v, d: 0.05, s: 0.8, hold: dur, r: 0.06 });
    o.connect(lp); lp.connect(e); e.connect(g.music);
  },
  glock(g, t, { m, v = 0.12, pan: pv = 0 }) {
    const f = midiHz(m);
    const o = osc(g, 'sine', f, t, t + 0.9); const o2 = osc(g, 'sine', f * 2.76, t, t + 0.3);
    const e = env(g, t, { a: 0.001, peak: v, d: 0.8 }); const e2 = env(g, t, { a: 0.001, peak: v * 0.4, d: 0.15 });
    const p = pan(g, pv);
    o.connect(e); o2.connect(e2); e.connect(p); e2.connect(p); p.connect(g.music); send(g, e, 0.3);
  },
  saw(g, t, { notes, m, dur = 0.2, v = 0.06, bright = 2600 }) {
    const list = notes || [m];
    const lp = filt(g, 'lowpass', bright, 0.9);
    const e = env(g, t, { a: 0.004, peak: v, d: 0.08, s: 0.7, hold: dur, r: 0.12 });
    lp.connect(e); e.connect(g.music); send(g, e, 0.35, 0.3);
    for (const n of list) for (const dt of [-14, -5, 5, 14]) { const o = osc(g, 'sawtooth', midiHz(n), t, t + dur + 0.3, dt); o.connect(lp); }
  },
  sub(g, t, { m, dur = 0.3, v = 0.5 }) {
    const o = osc(g, 'sine', midiHz(m + 12), t, t + dur + 0.1); o.frequency.exponentialRampToValueAtTime(midiHz(m), t + 0.05);
    const e = env(g, t, { a: 0.003, peak: v, d: 0.05, s: 0.9, hold: dur, r: 0.08 });
    o.connect(e); e.connect(g.music);
  },
  blip(g, t, { m, v = 0.16 }) {
    const f = midiHz(m);
    const o = osc(g, 'triangle', f * 1.02, t, t + 0.14); o.frequency.exponentialRampToValueAtTime(f, t + 0.03);
    const o2 = osc(g, 'sine', f * 2, t, t + 0.06);
    const e = env(g, t, { a: 0.001, peak: v, d: 0.11 }); const e2 = env(g, t, { a: 0.001, peak: v * 0.4, d: 0.03 });
    o.connect(e); o2.connect(e2); e.connect(g.sfx); e2.connect(g.sfx); send(g, e, 0.12);
  },
  pop(g, t, { v = 0.16, f = 520 }) {
    const o = osc(g, 'sine', f, t, t + 0.1); o.frequency.exponentialRampToValueAtTime(f * 2.4, t + 0.05);
    const e = env(g, t, { a: 0.001, peak: v, d: 0.07 });
    o.connect(e); e.connect(g.sfx);
  },
  thud(g, t, { v = 0.25 }) {
    const o = osc(g, 'sine', 210, t, t + 0.12); o.frequency.exponentialRampToValueAtTime(90, t + 0.08);
    const e = env(g, t, { a: 0.001, peak: v, d: 0.09 });
    o.connect(e); e.connect(g.sfx);
  },
  boing(g, t, { v = 0.3 }) {
    const o = osc(g, 'sine', 320, t, t + 0.6); o.frequency.setValueAtTime(320, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.5);
    const lfo = osc(g, 'sine', 16, t, t + 0.6); const lg = g.ctx.createGain(); lg.gain.setValueAtTime(90, t); lg.gain.exponentialRampToValueAtTime(8, t + 0.5);
    lfo.connect(lg); lg.connect(o.frequency);
    const e = env(g, t, { a: 0.003, peak: v, d: 0.55 });
    o.connect(e); e.connect(g.sfx); send(g, e, 0.2);
  },
  bwomp(g, t, { v = 0.25 }) {
    for (const [i, m] of [[0, 55], [0.16, 50]]) {
      const o = osc(g, 'sawtooth', midiHz(m), t + i, t + i + 0.4); o.frequency.exponentialRampToValueAtTime(midiHz(m - 3), t + i + 0.3);
      const lp = filt(g, 'lowpass', 1400, 4); lp.frequency.setValueAtTime(1400, t + i); lp.frequency.exponentialRampToValueAtTime(300, t + i + 0.3);
      const e = env(g, t + i, { a: 0.005, peak: v, d: 0.3 });
      o.connect(lp); lp.connect(e); e.connect(g.sfx);
    }
  },
  whistle(g, t, { from = 600, to = 1500, dur = 0.25, v = 0.1 }) {
    const o = osc(g, 'sine', from, t, t + dur + 0.05); o.frequency.exponentialRampToValueAtTime(to, t + dur);
    const lfo = osc(g, 'sine', 7, t, t + dur + 0.05); const lg = g.ctx.createGain(); lg.gain.value = 18; lfo.connect(lg); lg.connect(o.frequency);
    const e = env(g, t, { a: 0.02, peak: v, d: dur });
    o.connect(e); e.connect(g.sfx); send(g, e, 0.2);
  },
  coin(g, t, { v = 0.1, m = 83 }) {
    for (const [i, mm] of [[0, m], [0.07, m + 5]]) {
      const o = osc(g, 'square', midiHz(mm), t + i, t + i + (i ? 0.35 : 0.08));
      const e = env(g, t + i, { a: 0.001, peak: v, d: i ? 0.32 : 0.07 });
      o.connect(e); e.connect(g.sfx); send(g, e, 0.15);
    }
  },
  // Automation "instruments"
  duck(g, t, { depth = 0.4, dur = 0.22 }) {
    const p = g.duck.gain;
    p.cancelScheduledValues(t); p.setValueAtTime(depth, t); p.setTargetAtTime(1, t + 0.01, dur / 3);
  },
  filter(g, t, { f = 18000, ramp = 0.3 }) {
    const p = g.musicFilter.frequency;
    p.cancelScheduledValues(t); p.setTargetAtTime(f, t, ramp / 3);
  },
  musicGain(g, t, { v = 0.8, ramp = 0.2 }) {
    const p = g.music.gain;
    p.cancelScheduledValues(t); p.setTargetAtTime(v, t, ramp / 3);
  },
  delayTime(g, t, { s }) { g.delay.delayTime.setTargetAtTime(s, t, 0.05); },
};

// ---------------------------------------------------------------- score
// "Neko funjatta" (Der Flohwalzer): anonymous 19th-century folk piano piece,
// public domain. 16 bars of 16 sixteenths in F-sharp major; each event is
// [step, hand, midi...]; "R" right hand (pickups and chord hits), "L" left hand.
const I = 'I'; const V = 'V';
const NEKO_H = [I, I, I, V, V, V, V, I, I, I, I, V, V, V, V, I];
const NEKO_LH = [54, 54, 54, 49, 49, 49, 49, 54, 70, 70, 70, 75, 75, 75, 75, 70];
const NEKO_LH12 = { 2: 51, 6: 51, 10: 73, 14: 73 };
function nekoBar(b) {
  const ev = [];
  const hit = NEKO_H[b] === I ? [58, 66] : [59, 65];
  const prevHit = NEKO_H[(b + 15) % 16] === I ? [58, 66] : [59, 65];
  const turn = b === 3 || b === 7 || b === 11 || b === 15;
  if (turn) ev.push([0, 'H', ...prevHit]); else { ev.push([0, 'R', 63]); ev.push([2, 'R', 61]); }
  ev.push([4, 'L', NEKO_LH[b]]);
  ev.push([8, 'H', ...hit]);
  if (NEKO_LH12[b]) ev.push([12, 'L', NEKO_LH12[b]]); else ev.push([12, 'H', ...hit]);
  return ev;
}
const NEKO = Array.from({ length: 16 }, (_, b) => nekoBar(b));
const chordI = { root: 6, tones: [58, 61, 66], bass: 42 };
const chordV = { root: 1, tones: [56, 59, 61, 65], bass: 37 };
export const NEKO_PROG = NEKO_H.map((h) => (h === I ? chordI : chordV));
// The melody as one event per keystroke (typing edition): [bar, hand, ...midi]
export const NEKO_SEQ = NEKO.flatMap((ev, bar) => ev.map(([, hand, ...notes]) => ({ bar, hand, notes, chord: NEKO_PROG[bar] })));
// More public-domain tunes (traditional / 18th-19th century). One number = one keystroke.
const C = { root: 0, tones: [60, 64, 67], bass: 36 }; const F = { root: 5, tones: [57, 60, 65], bass: 41 }; const G = { root: 7, tones: [55, 59, 62, 65], bass: 43 };
const Am = { root: 9, tones: [57, 60, 64], bass: 45 }; const E7 = { root: 4, tones: [56, 59, 62, 64], bass: 40 }; const Dm = { root: 2, tones: [57, 62, 65], bass: 38 };
const TUNE_SRC = {
  kira: { name: 'きらきら星', set: [C, F, G], m: '60 60 67 67 69 69 67 65 65 64 64 62 62 60 67 67 65 65 64 64 62 67 67 65 65 64 64 62 60 60 67 67 69 69 67 65 65 64 64 62 62 60' },
  chocho: { name: 'ちょうちょう', set: [C, F, G], m: '67 64 64 65 62 62 60 62 64 65 67 67 67 67 64 64 65 62 62 60 64 67 67 60 62 62 62 62 62 64 65 64 64 64 64 64 65 67 67 64 64 65 62 62 60 64 67 67 60' },
  kaeru: { name: 'かえるの がっしょう', set: [C, F, G], m: '60 62 64 65 64 62 60 64 65 67 69 67 65 64 60 60 60 60 60 60 62 62 64 64 65 65 64 62 60' },
  mary: { name: 'メリーさんの ひつじ', set: [C, G], m: '64 62 60 62 64 64 64 62 62 62 64 67 67 64 62 60 62 64 64 64 64 62 62 64 62 60' },
  london: { name: 'ロンドン橋', set: [C, G], m: '67 69 67 65 64 65 67 62 64 65 64 65 67 67 69 67 65 64 65 67 62 67 64 60' },
  joy: { name: 'よろこびの うた', set: [C, G, F], m: '64 64 65 67 67 65 64 62 60 60 62 64 64 62 62 64 64 65 67 67 65 64 62 60 60 62 64 62 60 60 62 62 64 60 62 64 65 64 60 62 64 65 64 62 60 62 55 64 64 65 67 67 65 64 62 60 60 62 64 62 60 60' },
  saints: { name: '聖者の行進', set: [C, F, G], m: '60 64 65 67 60 64 65 67 60 64 65 67 64 60 64 62 64 64 62 60 60 64 67 67 65 64 65 67 64 60 62 60' },
  yankee: { name: 'アルプス一万尺', set: [C, G, F], m: '60 60 62 64 60 64 62 55 60 60 62 64 60 59 60 60 62 64 65 64 62 60 59 55 57 59 60 60' },
  camptown: { name: '草競馬', set: [C, G], m: '67 67 64 67 69 67 64 64 62 64 62 67 67 64 67 69 67 64 62 64 62 60' },
  turkey: { name: 'トルコ行進曲', set: [Am, E7, Dm, C], m: '71 69 68 69 72 74 72 71 72 76 77 76 75 76 83 81 80 81 83 81 80 81 84 81 84 83 81 79 81' },
};
// One chord per group of 4 notes (chosen by how many of the notes it contains, sticky to the
// previous chord). A chord that changes on every key sounded jittery on every arrangement.
function harmonize(notes, set) {
  const pcs = (c) => c.tones.map((t) => ((t % 12) + 12) % 12);
  const out = []; let prev = set[0];
  for (let i = 0; i < notes.length; i += 4) {
    const grp = notes.slice(i, i + 4).map((m) => ((m % 12) + 12) % 12);
    let best = prev; let bs = -1;
    for (const c of set) {
      const cp = pcs(c);
      const sc = grp.filter((n) => cp.includes(n)).length * 10 + (c === prev ? 3 : 0) + (grp[0] !== undefined && cp[0] === grp[0] ? 2 : 0);
      if (sc > bs) { bs = sc; best = c; }
    }
    prev = best;
    for (let j = 0; j < 4 && i + j < notes.length; j++) out.push(best);
  }
  return out;
}
export const TUNES = { neko: { name: 'ねこふんじゃった', seq: null } };
for (const [key, t] of Object.entries(TUNE_SRC)) {
  const notes = t.m.split(' ').map(Number);
  const ch = harmonize(notes, t.set);
  TUNES[key] = { name: t.name, seq: notes.map((m, i) => ({ notes: [m - 12], chord: ch[i] })) };
}
const PLAYER_VOICE = { classic: ['pluck', 'glock'], chip: ['chip', 'chip'], matsuri: ['shamisen', 'fue'], brass: ['glock', 'brass'], electro: ['pluck', 'lead'] };
// Voice per song style: [melody synth, chord-hit synth]
const NEKO_VOICE = { classic: ['pluck', 'pluck'], chip: ['chip', 'chip'], matsuri: ['shamisen', 'shamisen'], brass: ['glock', 'brass'], electro: ['pluck', 'saw'] };
function nekoStep(e, song, step, t, L, k) {
  const bar = Math.floor(step / 16) % 16;
  const s = step % 16;
  const [mel, hitV] = NEKO_VOICE[song] || NEKO_VOICE.classic;
  const loud = (0.75 + 0.25 * Math.min(1, L / 6)) * 1.9 * (MEL_TRIM[song] || 1);
  for (const [at, hand, ...notes] of NEKO[bar]) {
    if (at !== s) continue;
    const up = 12 + k;
    if (hand === 'H') {
      if (L >= 2 || song !== 'classic') notes.forEach((m, i) => e.play(hitV, t, { m: m + up, notes: [m + up], dur: e.stepDur * 1.2, v: (hitV === 'saw' ? 0.035 : hitV === 'brass' ? 0.06 : 0.1) * loud, pan: i ? 0.25 : -0.25 }));
      else e.play(mel, t, { m: notes[1] + up, dur: e.stepDur * 1.6, v: 0.13 * loud });
    } else {
      const m = notes[0] + up;
      e.play(mel, t, { m, dur: e.stepDur * (hand === 'L' ? 3 : 1.8), v: (mel === 'chip' ? 0.07 : mel === 'shamisen' ? 0.14 : 0.16) * loud });
      if (L >= 6) e.play(mel === 'chip' ? 'chip' : 'glock', t, { m: m + 12, dur: e.stepDur * 1.4, v: 0.05 });
      if (L >= 8) e.play(song === 'matsuri' ? 'fue' : 'lead', t, { m: m + 12, dur: e.stepDur * 1.6, v: 0.06 });
    }
  }
}
const PROG = [
  { root: 0, tones: [60, 64, 67], bass: 36 },
  { root: 7, tones: [59, 62, 67], bass: 43 },
  { root: 9, tones: [57, 60, 64], bass: 45 },
  { root: 5, tones: [57, 60, 65], bass: 41 },
];
const HOOK = [
  [76, null, 79, 84, 83, null, 79, null], [74, null, 79, 83, 81, null, 79, 74],
  [76, null, 81, 84, 83, 81, 79, 76], [77, null, 81, 84, 86, 84, 81, 79],
];
const MARIMBA = [0, 1, 2, 1, 3, 2, 1, 2];

// ---------------------------------------------------------------- unlockable songs (id041, id043)
// Every song keeps the same growth as the original: a gentle layer first,
// then kick, bass, claps, hats, arpeggio, stabs, a lead hook and a choir as
// the level rises; the game's tempo, key changes and reach roll apply too.
// Melodies are original.
const chord = (root, q, bass) => ({ root, tones: q.map((x) => 60 + root + x).map((m) => (m > 67 ? m - 12 : m)), bass: 36 + ((root + 12) % 12) });
const DRUMS = {
  pop(e, s, bar, t, L) {
    const kick = (L >= 3 && s % 4 === 0) || (L >= 1 && (s === 0 || s === 8));
    if (kick) { e.play('kick', t, { v: L < 3 ? 0.65 : 0.95 }); e.kicks.push(t); if (L >= 6) e.play('duck', t, { depth: 0.35, dur: e.stepDur * 3 }); }
    if (L >= 3 && (s === 4 || s === 12)) e.play('clap', t, { v: 0.8 });
    if (L >= 4 && s % 4 === 2) e.play('hat', t, { v: 0.22, open: L >= 7 });
    if (L >= 6 && s % 2 === 1) e.play('hat', t, { v: 0.08 });
    if (L >= 5 && bar === 3 && s >= 12) e.play('snare', t, { v: 0.2 + (s - 12) * 0.1 });
  },
};
export const SONGS = {
  chip: {
    name: '8ビット', prog: [chord(0, [0, 4, 7]), chord(9, [0, 3, 7]), chord(5, [0, 4, 7]), chord(7, [0, 4, 7])],
    hook: [[72, 76, 79, 76, 84, null, 79, 76], [72, 76, 81, 76, 79, null, 76, 72], [77, 81, 84, 81, 79, 77, 76, 74], [79, 83, 86, 83, 84, null, 79, null]],
    step(e, s, bar, t, L, ch, k) {
      if (L <= 7) e.play('tri', t, { m: ch.tones[[0, 1, 2, 1][(s >> 1) % 4]] + 12 + k, dur: e.stepDur * 0.8, v: 0.06 * (1 - L / 9) + 0.015 });
      const kick = (L >= 3 && s % 4 === 0) || (L >= 1 && (s === 0 || s === 8));
      if (kick) { e.play('kick', t, { v: L < 3 ? 0.55 : 0.8 }); e.kicks.push(t); }
      if (L >= 3 && (s === 4 || s === 12)) e.play('snare', t, { v: 0.5 });
      if (L >= 4 && s % 2 === 0) e.play('noiseHat', t, { v: s % 4 ? 0.1 : 0.06 });
      if (L >= 2 && s % 2 === 0) e.play('tri', t, { m: ch.bass + k + (s % 4 ? 12 : 0), dur: e.stepDur * 1.5, v: 0.4 });
      if (L >= 5) e.play('chip', t, { m: ch.tones[[0, 1, 2, 1][s % 4]] + 24 + k, dur: e.stepDur * 0.6, v: 0.045, pan: s % 2 ? 0.4 : -0.4 });
      if (L >= 6 && (s === 2 || s === 10)) ch.tones.forEach((m) => e.play('chip', t, { m: m + 12 + k, dur: e.stepDur * 1.5, v: 0.03 }));
      if (L >= 8 && s % 2 === 0) { const m = null; if (m) e.play('chip', t, { m: m + k, dur: e.stepDur * 1.6, v: 0.07 }); }
      if (L >= 9 && s === 0) e.play('crash', t, { v: 0.25 });
    },
  },
  matsuri: {
    name: 'おまつり', prog: [chord(2, [0, 5, 7]), chord(2, [0, 3, 7]), chord(7, [0, 5, 7]), chord(9, [0, 3, 7])],
    hook: [[74, 76, 79, null, 81, 79, 76, 74], [76, 79, 81, 83, 81, null, 79, 76], [79, 81, 83, 86, 83, 81, 79, null], [81, 79, 76, 74, 76, null, 74, null]],
    step(e, s, bar, t, L, ch, k) {
      if (s % 2 === 0 && L <= 7) e.play('shamisen', t, { m: ch.tones[[0, 2, 1, 2, 0, 1, 2, 1][(s >> 1) % 8]] + 12 + k, v: 0.06 * (1 - L / 10) + 0.015, pan: s % 4 ? 0.3 : -0.3 });
      if (L >= 1 && (s === 0 || s === 8)) { e.play('taiko', t, { v: 0.9 }); e.kicks.push(t); }
      if (L >= 3 && (s === 6 || s === 10 || s === 14)) { e.play('taiko', t, { v: 0.55, m: 50 }); }
      if (L >= 1 && s % 4 === 2) e.play('kane', t, { v: 0.05 + 0.01 * L });
      if (L >= 3 && (s === 4 || s === 12)) e.play('clap', t, { v: 0.7 });
      if (L >= 2 && s % 4 === 0) e.play('bass', t, { m: ch.bass + k, dur: e.stepDur * 3, v: 0.4 });
      if (L >= 5) e.play('shamisen', t, { m: ch.tones[s % 3] + 24 + k, v: 0.06, pan: s % 2 ? 0.5 : -0.5 });
      if (L >= 6 && s % 8 === 4) e.play('stab', t, { notes: ch.tones.map((m) => m + 12 + k), v: 0.06 });
      if (L >= 8 && s % 2 === 0) { const m = null; if (m) e.play('fue', t, { m: m + k, dur: e.stepDur * 1.8, v: 0.1 }); }
      if (L >= 9 && s === 0) e.play('choir', t, { notes: ch.tones.map((m) => m + 12 + k), dur: e.stepDur * 15, v: 0.045 });
      if (L >= 5 && bar === 3 && s >= 12) e.play('taiko', t, { v: 0.4 + (s - 12) * 0.12, m: 52 });
    },
  },
  brass: {
    name: 'ブラスバンド', prog: [chord(0, [0, 4, 7]), chord(5, [0, 4, 7]), chord(7, [0, 4, 7]), chord(0, [0, 4, 7])],
    hook: [[67, null, 72, 74, 76, null, 72, null], [77, null, 76, 74, 72, null, 69, null], [71, 72, 74, 76, 77, 76, 74, 71], [72, null, 76, null, 79, null, 84, null]],
    step(e, s, bar, t, L, ch, k) {
      if (s % 2 === 0 && L <= 7) e.play('glock', t, { m: ch.tones[[0, 1, 2, 1][(s >> 1) % 4]] + 24 + k, v: 0.05 * (1 - L / 9) + 0.015, pan: s % 4 ? 0.3 : -0.3 });
      const kick = (L >= 3 && s % 4 === 0) || (L >= 1 && (s === 0 || s === 8));
      if (kick) { e.play('kick', t, { v: L < 3 ? 0.6 : 0.85 }); e.kicks.push(t); }
      if (L >= 3 && (s === 4 || s === 12)) e.play('snare', t, { v: 0.45 });
      if (L >= 4 && (s === 14 || s === 15)) e.play('snare', t, { v: 0.2 });
      if (L >= 4 && s % 4 === 2) e.play('hat', t, { v: 0.14 });
      if (L >= 2 && s % 4 === 0) e.play('tuba', t, { m: ch.bass + k + (s % 8 ? 7 : 0), dur: e.stepDur * 1.6, v: 0.42 });
      if (L >= 5 && s % 2 === 0) e.play('glock', t, { m: ch.tones[(s >> 1) % 3] + 24 + k, v: 0.05 });
      if (L >= 6 && s % 4 === 2) e.play('brass', t, { notes: ch.tones.map((m) => m + 12 + k), dur: e.stepDur * 0.9, v: 0.07 });
      if (L >= 8 && s % 2 === 0) { const m = null; if (m) e.play('brass', t, { m: m + k, dur: e.stepDur * 1.7, v: 0.1 }); }
      if (L >= 9 && s === 0) e.play('crash', t, { v: 0.3 });
    },
  },
  electro: {
    name: 'エレクトロ', prog: [chord(9, [0, 3, 7]), chord(5, [0, 4, 7]), chord(0, [0, 4, 7]), chord(7, [0, 4, 7])],
    hook: [[81, null, 76, 81, 84, null, 83, 81], [77, null, 72, 77, 81, null, 79, 77], [76, null, 72, 76, 79, 81, 79, 76], [79, null, 74, 79, 83, 84, 86, null]],
    step(e, s, bar, t, L, ch, k) {
      if (s % 2 === 0 && L <= 7) e.play('pluck', t, { m: ch.tones[[0, 2, 1, 2][(s >> 1) % 4]] + 12 + k, v: 0.06 * (1 - L / 9) + 0.015, dur: 0.3, pan: s % 4 ? 0.35 : -0.35 });
      const kick = (L >= 2 && s % 4 === 0) || (L >= 1 && (s === 0 || s === 8));
      if (kick) { e.play('kick', t, { v: 0.95 }); e.kicks.push(t); if (L >= 4) e.play('duck', t, { depth: 0.45, dur: e.stepDur * 3 }); }
      if (L >= 3 && (s === 4 || s === 12)) e.play('clap', t, { v: 0.75 });
      if (L >= 4 && s % 4 === 2) e.play('hat', t, { v: 0.2, open: true });
      if (L >= 5 && s % 2 === 1) e.play('hat', t, { v: 0.07 });
      if (L >= 2 && s % 4 === 2) e.play('sub', t, { m: ch.bass + k, dur: e.stepDur * 1.6, v: 0.45 });
      if (L >= 5) e.play('saw', t, { m: ch.tones[[0, 1, 2, 1, 0, 2, 1, 2][s % 8]] + 24 + k, dur: e.stepDur * 0.5, v: 0.03, bright: 1800 + 200 * L });
      if (L >= 6 && (s === 0 || s === 6 || s === 12)) e.play('saw', t, { notes: ch.tones.map((m) => m + 12 + k), dur: e.stepDur * 1.2, v: 0.04 });
      if (L >= 8 && s % 2 === 0) { const m = null; if (m) e.play('lead', t, { m: m + k, dur: e.stepDur * 1.5, v: 0.075 }); }
      if (L >= 9 && s === 0) e.play('pad', t, { notes: ch.tones.map((m) => m + 12 + k), dur: e.stepDur * 15, v: 0.06, bright: 3000 });
      if (L >= 5 && bar === 3 && s >= 8) e.play('snare', t, { v: 0.12 + (s - 8) * 0.06 });
    },
  },
};
void DRUMS;

// Mix: the tune must stay on top. Everything the band plays is turned down against the melody (measured: the band was
// 10-17 dB louder than the tune). Drums keep their punch, harmony instruments sit far back, and when the player stops
// typing for a few seconds the band thins out to the drums (spec 8.1).
const DRUMSET = new Set(['kick', 'snare', 'clap', 'hat', 'noiseHat', 'taiko', 'kane', 'shaker', 'crash']);
const BASSSET = new Set(['bass', 'sub', 'tuba', 'tri']);
const MEL_GAIN = 3.0;
// Per-arrangement trim, from offline measurements, so every arrangement's tune sits ~1 dB above its band.
const MEL_TRIM = { classic: 1.9, chip: 0.45, matsuri: 2.6, brass: 1.1, electro: 2.4 };
function bandMul(name, e) {
  if (DRUMSET.has(name)) return 0.45;
  const idle = e.player && e.lastHit && (e.now() - e.lastHit > 4);
  if (idle) return 0.06;
  if (BASSSET.has(name)) return 0.5;
  return 0.2;
}
export class AudioEngine {
  constructor({ capture = false } = {}) {
    this.capture = capture;
    this.log = [];
    this.ctx = null;
    this.g = null;
    this.muted = false;
    this.level = 0;
    this.key = 0;
    this.bpm = 112;
    this.reach = false;
    this.reachStart = 0;
    this.playing = false;
    this.step = 0;
    this.nextTime = 0;
    this.kicks = [];
    this.beats = [];
    this.combo = 0;
    this.volume = 1;
    this.song = 'classic';
    this.player = false; // typing: the melody advances one note per correct key
    this.melIdx = 0;
    this.tune = 'neko';
    this.mata = false;
    this.band = false; this.lastHit = 0;
  }
  setSong(key) { this.song = SONGS[key] ? key : 'classic'; }
  get prog() { return NEKO_PROG; }

  unlock() {
    if (this.capture) return;
    if (this.needRebuild && this.ctx && this.ctx.state !== 'running') { this.rebuild(); return; }
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC({ latencyHint: 'interactive' });
      this.g = makeGraph(this.ctx);
      this.g.master.gain.value = this.muted ? 0 : 0.72 * this.volume;
    }
    if (this.ctx.state !== 'running') { try { const r = this.ctx.resume(); if (r && r.then) r.then(() => this.kick(), () => {}); } catch (e) { /* ignore */ } }
    else this.kick();
  }

  // A silent 1-sample buffer un-sticks iOS output after the page was in the background.
  kick() {
    try { const b = this.ctx.createBuffer(1, 1, 22050); const src = this.ctx.createBufferSource(); src.buffer = b; src.connect(this.ctx.destination); src.start(0); } catch (e) { /* ignore */ }
    this.nextTime = this.now() + 0.05;
  }

  // Back from another app: resume, and if the context is dead build a new one on the next tap.
  wake() {
    if (this.capture || !this.ctx) return;
    this.unlock();
    setTimeout(() => {
      if (!this.ctx) return;
      if (this.ctx.state !== 'running') { this.needRebuild = true; }
    }, 500);
  }

  rebuild() {
    try { this.ctx && this.ctx.close(); } catch (e) { /* ignore */ }
    this.ctx = null; this.g = null; this.needRebuild = false;
    this.unlock();
  }

  now() { return this.capture ? performance.now() / 1000 : (this.ctx ? this.ctx.currentTime : performance.now() / 1000); }

  play(name, when, p = {}) {
    if (this.band && p.v != null) p = { ...p, v: p.v * bandMul(name, this) };
    if (this.capture) { this.log.push([name, when, p]); return; }
    if (!this.ctx || !this.g) return;
    try { SYNTH[name](this.g, Math.max(when, this.ctx.currentTime), p); } catch (e) { console.warn(name, e); }
  }

  setMuted(m) {
    this.muted = m;
    if (this.g) this.g.master.gain.setTargetAtTime(m ? 0 : 0.72 * this.volume, this.ctx.currentTime, 0.03);
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    this.setMuted(this.muted);
  }

  get stepDur() { return 60 / this.bpm / 4; }

  startMusic() {
    if (this.playing) return;
    this.playing = true;
    this.step = 0;
    this.nextTime = this.now() + 0.06;
  }
  stopMusic() { this.playing = false; if (this.onStop) this.onStop(); }

  setLevel(level, bpm) {
    this.level = level;
    if (bpm) this.bpm = bpm;
    this.play('delayTime', this.now(), { s: this.stepDur * 3 });
  }

  // Jump the sequencer onto a downbeat right now (used for drops).
  downbeat() {
    this.step = Math.ceil(this.step / 16) * 16;
    this.nextTime = this.now() + 0.01;
  }

  update() {
    if (!this.playing) return;
    const horizon = this.now() + 0.12;
    if (this.nextTime < this.now() - 0.25) this.nextTime = this.now() + 0.02;
    while (this.nextTime < horizon) {
      this.scheduleStep(this.step, this.nextTime);
      this.nextTime += this.stepDur;
      this.step += 1;
    }
  }

  setTune(key) { this.tune = TUNES[key] ? key : 'neko'; this.melIdx = 0; }
  get seq() { return this.tune === 'neko' ? NEKO_SEQ : TUNES[this.tune].seq; }
  chord(step = this.step) {
    const seq = this.seq;
    if (this.player) return seq[this.melIdx % seq.length].chord;
    if (this.tune !== 'neko') return seq[(Math.floor(step / 8) * 4) % seq.length].chord;
    return this.prog[Math.floor(step / 16) % this.prog.length];
  }

  // One correct key = the next note of the tune, right now. Returns true when a loop completes.
  hitNote(E = 0, combo = 0) {
    const seq = this.seq;
    const ev = seq[this.melIdx % seq.length];
    const t = this.now();
    const k = this.key + 12;
    const L = this.level;
    const [mel, hi] = PLAYER_VOICE[this.song] || PLAYER_VOICE.classic;
    this.lastHit = t;
    const v = (0.15 + 0.05 * Math.min(1, combo / 30)) * MEL_GAIN * (MEL_TRIM[this.song] || 1);
    ev.notes.forEach((m, i) => {
      const mm = m + k + (ev.hand === 'L' ? 0 : 0);
      this.play(mel, t, { m: mm, dur: 0.28, v: ev.notes.length > 1 ? v * 0.7 : v, pan: ev.notes.length > 1 ? (i ? 0.25 : -0.25) : 0 });
      if (L >= 5) this.play(hi, t, { m: mm + 12, dur: 0.22, v: (0.05 + 0.03 * Math.min(1, E)) * 1.6 });
      if (L >= 8 && i === ev.notes.length - 1) this.play('bell', t, { m: mm + 24, v: 0.04, dur: 0.4 });
    });
    if (L >= 7 && ev.hand !== 'H') this.play(mel, t, { m: ev.notes[0] + k - 12, dur: 0.22, v: 0.1 });   // octave below: always in key
    if (this.mata) {   // マタタビ: a wobbling detuned double, a shimmering bell and a woozy slide
      const wob = Math.sin(this.melIdx * 0.9) * 0.35;
      ev.notes.forEach((m) => {
        this.play(mel, t + 0.012, { m: m + k + wob + 0.25, dur: 0.3, v: 0.09, pan: -0.4 });
        this.play('bell', t, { m: m + k + 19 + ((this.melIdx % 3) * 2), v: 0.05, dur: 0.6, pan: 0.4 });
      });
      if (this.melIdx % 4 === 0) this.play('whistle', t, { from: 500 + (this.melIdx % 8) * 60, to: 1300, dur: 0.22, v: 0.03 });
    }
    this.melIdx += 1;
    return this.melIdx % seq.length === 0;
  }

  scheduleStep(step, t) {
    this.band = false;
    try { this._sched(step, t); } finally { this.band = false; }
  }

  _sched(step, t) {
    const s = step % 16;
    const bar = Math.floor(step / 16) % 4;
    const L = this.level;
    const k = this.key;
    const ch = this.player || this.tune !== 'neko' ? this.chord(step) : this.prog[Math.floor(step / 16) % this.prog.length];
    if (!this.reach && !this.player) {
      if (this.tune === 'neko') nekoStep(this, this.song, step, t, L, k);
      else if (s % 2 === 0) {
        const seq = this.seq; const ev = seq[Math.floor(step / 2) % seq.length];
        const [mel] = PLAYER_VOICE[this.song] || PLAYER_VOICE.classic;
        ev.notes.forEach((m) => this.play(mel, t, { m: m + 12 + k, dur: this.stepDur * 1.8, v: 0.2 }));
      }
    }
    this.band = true;   // from here on: the band (quieter than the tune)
    if (s % 4 === 0) this.beats.push({ t, beat: Math.floor(step / 4) });
    if (this.beats.length > 64) this.beats.shift();
    if (this.kicks.length > 64) this.kicks.shift();

    if (this.reach) {
      const el = Math.min(1, (t - this.reachStart) / 2.5);
      this.play('snare', t, { v: 0.12 + 0.5 * el });
      if (el > 0.5 && s % 2 === 1) this.play('snare', t + this.stepDur / 2, { v: 0.1 + 0.4 * el });
      if (s % 8 === 0) { this.play('kick', t, { v: 0.8 }); this.kicks.push(t); }
      if (s === 0) this.play('pad', t, { notes: chordV.tones.map((m) => m + k), dur: this.stepDur * 16, v: 0.08, bright: 700 + 1400 * el });
      if (s % 4 === 0) this.play('bass', t, { m: chordV.bass + k, dur: this.stepDur * 3, v: 0.4 });
      return;
    }
    if (this.song !== 'classic') {
      const song = SONGS[this.song];
      song.step(this, s, bar, t, L, ch, k);
      if (s === 0) this.play('pad', t, { notes: ch.tones.map((m) => m + k), dur: this.stepDur * 15, v: 0.03 + 0.03 * Math.min(L, 8) / 8, bright: 600 + 200 * L });
      return;
    }

    // Marimba arpeggio: the gentle "educational" layer, fades as the show grows.
    if (s % 2 === 0 && L <= 7) {
      const idx = MARIMBA[(s / 2) % 8];
      const m = idx === 3 ? ch.tones[0] + 12 : ch.tones[idx];
      this.play('pluck', t, { m: m + k, v: 0.06 * (1 - L / 9), dur: 0.35, pan: idx % 2 ? 0.3 : -0.3 });
    }
    this.play('shaker', t, { v: (s % 2 ? 0.06 : 0.035) * (0.6 + L / 12) });
    if (s === 0) this.play('pad', t, { notes: ch.tones.map((m) => m + k), dur: this.stepDur * 15, v: 0.05 + 0.035 * Math.min(L, 8) / 8, bright: 650 + 260 * L });

    const kick = (L >= 3 && s % 4 === 0) || (L >= 1 && (s === 0 || s === 8));
    if (kick) {
      this.play('kick', t, { v: L < 3 ? 0.65 : 0.95 });
      this.kicks.push(t); if (this.kicks.length > 64) this.kicks.shift();
      if (L >= 6) this.play('duck', t, { depth: 0.35, dur: this.stepDur * 3 });
    }
    if (L >= 2) {
      if (L >= 7 && s % 2 === 0) this.play('bass', t, { m: ch.bass + k + (s % 4 ? 12 : 0), dur: this.stepDur * 1.6, v: 0.42 });
      else if (L < 7 && s % 4 === 0) this.play('bass', t, { m: ch.bass + k, dur: this.stepDur * 3, v: 0.45 });
    }
    if (L >= 3 && (s === 4 || s === 12)) this.play('clap', t, { v: 0.8 });
    if (L >= 4 && s % 4 === 2) this.play('hat', t, { v: 0.22, open: L >= 7 });
    if (L >= 6 && s % 2 === 1) this.play('hat', t, { v: 0.08 });
    if (L >= 5) {
      const pattern = [0, 1, 2, 3, 2, 1, 2, 3];
      const i = pattern[s % 8];
      const m = i === 3 ? ch.tones[0] + 12 : ch.tones[i];
      this.play('arp', t, { m: m + 12 + (s >= 8 && L >= 8 ? 12 : 0) + k, v: 0.06 });
    }
    if (L >= 6 && s % 4 === 2) this.play('stab', t, { notes: ch.tones.map((m) => m + 12 + k), v: 0.075 });
    if (L >= 8 && s % 2 === 0) {
      const m = null;
      if (m) this.play('lead', t, { m: m + k, dur: this.stepDur * 1.7, v: 0.075 });
    }
    if (L >= 9 && s === 0) this.play('choir', t, { notes: ch.tones.map((m) => m + 12 + k), dur: this.stepDur * 15, v: 0.05 });
    if (L >= 9 && s === 0 && bar === 0) this.play('crash', t, { v: 0.3 });
    if (L >= 5 && bar === 3 && s >= 12) this.play('snare', t, { v: 0.2 + (s - 12) * 0.1 });
  }

  // Beat info for visuals: phase within the current beat and a kick pulse.
  pulse(t = this.now()) {
    let kp = 0;
    for (let i = this.kicks.length - 1; i >= 0; i--) {
      if (this.kicks[i] <= t) { kp = Math.exp(-(t - this.kicks[i]) * 9); break; }
    }
    let phase = 0; let beat = 0;
    for (let i = this.beats.length - 1; i >= 0; i--) {
      if (this.beats[i].t <= t) { phase = (t - this.beats[i].t) / (this.stepDur * 4); beat = this.beats[i].beat; break; }
    }
    return { kick: kp, phase: Math.min(1, phase), beat };
  }

  // ------------------------------------------------------------ sound effects
  tone(i) { const ch = this.chord(); return ch.tones[i % 3] + 12 * Math.floor(i / 3) + this.key; }

  keyTap(combo) { this.play('blip', this.now(), { m: Math.min(96, this.tone(combo) + 12), v: 0.13 }); }
  grab() { this.play('pop', this.now(), { v: 0.1, f: 480 + Math.random() * 120 }); }
  place() { this.play('thud', this.now(), { v: 0.1 }); this.play('glock', this.now(), { m: 96 + (Math.random() < 0.5 ? 0 : 2), v: 0.035 }); }
  meow(m = 76, v = 0.12) { this.play('meow', this.now(), { m: m + this.key, v }); }
  erase() { this.play('swoosh', this.now(), { v: 0.18, up: false, dur: 0.18 }); }

  correct(combo, E) {
    const t = this.now();
    const base = Math.min(96, this.tone(combo) + 12);
    this.play('bell', t, { m: base, v: 0.15 + 0.08 * E, dur: 0.9 });
    this.play('bell', t + 0.06, { m: base + 7, v: 0.1 + 0.06 * E, dur: 0.8, pan: 0.3 });
    if (E > 0.3) this.play('bell', t + 0.12, { m: base + 12, v: 0.08 + 0.06 * E, dur: 0.9, pan: -0.3 });
    if (E > 0.55) { this.play('coin', t + 0.02, { v: 0.05 + 0.04 * E, m: 83 + this.key }); this.play('crash', t, { v: 0.12 * E }); }
  }

  clear(E) {
    const t = this.now();
    const ch = this.chord();
    const root = ch.tones[0] + this.key;
    this.play('meow', t + 0.02, { m: root + 24, v: 0.08 + 0.05 * E, dur: 0.3, pan: -0.3 });
    if (E > 0.5) this.play('meow', t + 0.16, { m: root + 31, v: 0.06 + 0.04 * E, dur: 0.26, pan: 0.3 });
    if (E > 0.8) this.play('purr', t, { v: 0.25 });
    const arp = [0, 4, 7, 12, 16, 19, 24];
    const n = 3 + Math.round(E * 4);
    for (let i = 0; i < n; i++) this.play('bell', t + i * 0.055, { m: root + 12 + arp[i], v: 0.12 + 0.05 * E, dur: 1.2, pan: (i % 2 ? 1 : -1) * 0.4 });
    this.play('pluck', t, { m: root, v: 0.2, dur: 0.8 });
    if (E > 0.2) this.play('stab', t, { notes: [root, root + 4, root + 7, root + 12].map((m) => m + 12), v: 0.08 + 0.08 * E, dur: 0.35 });
    if (E > 0.35) { this.play('crash', t, { v: 0.25 + 0.25 * E }); this.play('kick', t, { v: 0.9 }); }
    if (E > 0.55) {
      this.play('impact', t, { v: 0.5 + 0.4 * E });
      const fan = [7, 12, 16, 19, 24];
      fan.forEach((m, i) => this.play('lead', t + 0.08 + i * 0.07, { m: root + 12 + m, dur: i === 4 ? 0.5 : 0.06, v: 0.08 }));
      this.play('duck', t, { depth: 0.3, dur: 0.6 });
    }
    if (E > 0.8) {
      for (let i = 0; i < 8; i++) this.play('coin', t + 0.1 + i * 0.05, { v: 0.05, m: 79 + this.key + (i % 3) * 5 });
      this.play('choir', t, { notes: [root + 12, root + 16, root + 19, root + 24], dur: 1.2, v: 0.07 });
    }
  }

  wrong(E) {
    const t = this.now();
    this.play('meow', t + 0.05, { m: 70 + this.key, v: 0.09, dur: 0.42, down: true });
    // Comic, not punishing: a springy boing, light ducking, no "fail" horn.
    this.play('boing', t, { v: 0.22 + 0.12 * E });
    this.play('duck', t, { depth: 0.22, dur: 0.25 });
  }

  setReach(on) {
    if (on === this.reach) return;
    this.reach = on;
    const t = this.now();
    if (on) {
      this.reachStart = t;
      this.play('filter', t, { f: 900, ramp: 0.4 });
      this.play('riser', t, { dur: 2.6, v: 0.22 });
      this.play('swoosh', t, { v: 0.25, up: true, dur: 0.4 });
    } else {
      this.play('filter', t, { f: 18000, ramp: 0.05 });
    }
  }

  reachHit(E) {
    const t = this.now();
    this.play('impact', t, { v: 1 });
    this.play('crash', t, { v: 0.6 });
    this.play('kick', t, { v: 1 });
    const root = this.chord().tones[0] + this.key;
    this.play('stab', t, { notes: [root, root + 4, root + 7, root + 12, root + 16].map((m) => m + 12), v: 0.18, dur: 0.6 });
    this.play('choir', t, { notes: [root + 12, root + 16, root + 19, root + 24], dur: 1.6, v: 0.08 });
    this.downbeat();
  }

  cutin() { this.play('swoosh', this.now(), { v: 0.22, up: true, dur: 0.3 }); }
  jump(h = 1) { this.play('whistle', this.now(), { from: 500, to: 900 + 700 * h, dur: 0.18 + 0.1 * h, v: 0.07 }); }
  land() { this.play('thud', this.now(), { v: 0.14 }); }
  clapHands() { const t = this.now(); this.play('clap', t, { v: 0.35 }); }
  unit(E) {
    const t = this.now();
    this.play('bell', t, { m: 84 + this.key, v: 0.2, dur: 1.4 });
    this.play('bell', t + 0.12, { m: 91 + this.key, v: 0.18, dur: 1.6 });
    for (let i = 0; i < 5; i++) this.play('coin', t + 0.05 + i * 0.06, { v: 0.05, m: 84 + i * 2 + this.key });
    if (E > 0.5) this.play('crash', t, { v: 0.25 });
  }
  jingle() {
    const t = this.now();
    [60, 64, 67, 72, 76].forEach((m, i) => this.play('pluck', t + i * 0.08, { m: m + 12, v: 0.22, dur: 0.6 }));
    this.play('bell', t + 0.42, { m: 96, v: 0.14, dur: 1.4 });
  }
  finale() {
    const t = this.now();
    const root = this.chord().tones[0] + this.key;
    this.play('impact', t, { v: 1.1 });
    this.play('crash', t, { v: 0.7 });
    this.play('choir', t, { notes: [root + 12, root + 16, root + 19, root + 24, root + 28], dur: 3, v: 0.1 });
    this.play('stab', t, { notes: [root, root + 4, root + 7, root + 12].map((m) => m + 12), v: 0.2, dur: 0.9 });
    [0, 4, 7, 12, 16, 19, 24, 28, 31].forEach((m, i) => this.play('bell', t + 0.2 + i * 0.06, { m: root + 24 + m, v: 0.1, dur: 1.4, pan: (i % 2 ? 0.5 : -0.5) }));
    for (let i = 0; i < 14; i++) this.play('coin', t + 0.3 + i * 0.05, { v: 0.045, m: 79 + (i % 4) * 4 + this.key });
    this.downbeat();
  }
  tick(last) { this.play('blip', this.now(), { m: last ? 96 : 84, v: 0.14 }); }
  gong() {
    const t = this.now();
    this.play('impact', t, { v: 0.9 });
    this.play('bell', t, { m: 48 + this.key, v: 0.3, dur: 3 });
    this.play('crash', t, { v: 0.5 });
  }
}

// Render a captured log offline and return a 16-bit PCM WAV ArrayBuffer.
export async function renderLog(log, { start = 0, duration, sampleRate = 48000 } = {}) {
  const ctx = new OfflineAudioContext(2, Math.ceil(sampleRate * duration), sampleRate);
  const g = makeGraph(ctx);
  for (const [name, when, p] of log) {
    const t = when - start;
    if (t < -0.5 || t > duration) continue;
    try { SYNTH[name](g, Math.max(0, t), p); } catch (e) { console.warn('render', name, e); }
  }
  const buf = await ctx.startRendering();
  return toWav(buf);
}

function toWav(buf) {
  const ch = buf.numberOfChannels; const len = buf.length; const sr = buf.sampleRate;
  const out = new ArrayBuffer(44 + len * ch * 2);
  const v = new DataView(out);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + len * ch * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, ch, true); v.setUint32(24, sr, true);
  v.setUint32(28, sr * ch * 2, true); v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, len * ch * 2, true);
  const data = []; for (let c = 0; c < ch; c++) data.push(buf.getChannelData(c));
  let o = 44;
  for (let i = 0; i < len; i++) for (let c = 0; c < ch; c++) { const s = Math.max(-1, Math.min(1, data[c][i])); v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2; }
  return out;
}
