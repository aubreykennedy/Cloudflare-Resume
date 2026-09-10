/* ------------------------------------------------------------------
   chamber.js — a living bubble chamber.

   Charged particles are stepped through a uniform magnetic field
   (pointing out of the screen) and a liquid that slows them down.
   Everything you see follows from four rules:
     1. curvature  ∝ charge / momentum          (Lorentz force)
     2. energy loss ∝ charge² / velocity²        (Bethe–Bloch, roughly)
     3. scattering  ∝ charge / (momentum·velocity)
     4. bubble density (track width) ∝ charge² / velocity²
   Masses are in MeV/c², momenta in MeV/c, distances in CSS pixels.
   The numbers are tuned to look right on a screen, not to be
   quantitatively accurate — treat this as a demonstration, not data.
------------------------------------------------------------------- */
(function (root) {
  'use strict';

  const TAU = Math.PI * 2;
  const K_B = 0.3;          // rad per px per (MeV/c) at unit charge: sets how hard the field bends things
  const DS = 2;             // integration step in px
  const X0 = 1500;          // radiation length for e± in px: big loops shrink fast, small ones linger
  const MARGIN = 24;        // how far outside the canvas a track may wander before it is dropped

  // --- tiny random helpers ------------------------------------------------
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const sign = () => (Math.random() < 0.5 ? -1 : 1);
  function randn() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
  }
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  // --- particle species ---------------------------------------------------
  // tell:  the one-line field guide for a non-physicist.
  // color: only used in "identify" mode; otherwise every track is white.
  const SPECIES = {
    muon: {
      key: 'muon', name: 'Cosmic-ray muon', sym: 'μ', charge: '±1', color: '#a5b4fc',
      tell: 'Long, thin and almost straight, usually entering from above. Heavy and moving near light speed, so the field barely bends it and it passes through the whole chamber.',
      m: 105.7, z: 1, p: [1500, 4500], loss: 0.05, scatter: 0.5, speed: [1500, 2100], delta: 0.0022, gapK: 1.6,
    },
    beam: {
      key: 'beam', name: 'Accelerator beam', sym: 'beam', charge: '+1', color: '#e0e7ff',
      tell: 'A bundle of thin, straight, parallel tracks entering from the left: the accelerator beam. Most pass straight through. Some knock electrons loose (small spirals along the track), and a few hit a nucleus and produce a spray of new tracks.',
      m: 938.3, z: 1, p: [7000, 14000], loss: 0.05, scatter: 0.4, speed: [3800, 4600], delta: 0.0035, gapK: 1.5,
    },
    electron: {
      key: 'electron', name: 'Electron', sym: 'e⁻', charge: '−1', color: '#67e8f9',
      tell: 'Thin and wobbly, curling counter-clockwise into a spiral that tightens as it loses energy. Light enough for the field to bend it strongly.',
      m: 0.511, z: -1, p: [8, 45], loss: 0.03, scatter: 0.35, speed: [650, 950], gapK: 1.6,
    },
    positron: {
      key: 'positron', name: 'Positron', sym: 'e⁺', charge: '+1', color: '#f9a8d4',
      tell: 'Same as an electron but curls clockwise: same mass, opposite charge.',
      m: 0.511, z: 1, p: [8, 45], loss: 0.03, scatter: 0.35, speed: [650, 950], gapK: 1.6,
    },
    alpha: {
      key: 'alpha', name: 'Alpha particle', sym: 'α', charge: '+2', color: '#fbbf24',
      tell: 'Short, thick, bright and straight. A helium nucleus: heavy, slow and highly ionising, so it stops within a few centimetres.',
      m: 3727, z: 2, ke: [3.5, 7.5], loss: 2.7e-5, scatter: 0.03, stiff: 0.3, speed: [220, 320], gapK: 0.9,
    },
    proton: {
      key: 'proton', name: 'Proton', sym: 'p', charge: '+1', color: '#fb923c',
      tell: 'Thick and bright with a gentle clockwise bend, thickening just before it stops. Heavier than an electron, lighter than an alpha.',
      m: 938.3, z: 1, p: [300, 620], loss: 0.05, scatter: 0.5, speed: [800, 1100], delta: 0.0012, gapK: 1.3,
    },
    gamma: {
      key: 'gamma', name: 'Gamma ray → electron + positron', sym: 'γ', charge: '0', color: '#c4b5fd',
      tell: 'Invisible: neutral particles leave no bubbles. It shows up only when it converts to an electron-positron pair: a V that starts from nothing, one arm curling each way.',
      ghost: true, speed: [2200, 2600],
    },
    pion: {
      key: 'pion', name: 'Pion → muon → electron', sym: 'π', charge: '±1', color: '#86efac',
      tell: 'A track with a sharp kink. The pion stops and decays to a short muon track (plus an unseen neutrino); the muon stops and decays to a curling electron.',
      m: 139.6, z: 1, p: [110, 200], loss: 0.05, scatter: 0.5, speed: [700, 900], gapK: 1.5,
    },
    neutron: {
      key: 'neutron', name: 'Neutron → proton recoil', sym: 'n', charge: '0', color: '#f87171',
      tell: 'Invisible. Occasionally it hits a hydrogen nucleus and knocks a proton forward: a short, thick track that starts from nothing, with no partner.',
      ghost: true, speed: [1200, 1600],
    },
    delta: {
      key: 'delta', name: 'Delta ray (knock-on electron)', sym: 'δ', charge: '−1', color: '#67e8f9',
      tell: 'A small spiral branching off a larger track: an atomic electron knocked out by the passing particle.',
      m: 0.511, z: -1, p: [1.5, 6], loss: 0.045, scatter: 0.35, speed: [400, 600], gapK: 1.6,
    },
  };

  // Which species the live chamber spawns, and how often (relative weights).
  const LIVE_MENU = [
    ['muon', 30], ['electron', 16], ['positron', 8], ['alpha', 12],
    ['proton', 10], ['gamma', 12], ['pion', 7], ['neutron', 5],
  ];

  function momentumFromKE(ke, m) { return Math.sqrt(ke * ke + 2 * ke * m); }

  // --- a single track -----------------------------------------------------
  function makeTrack(sim, spec, opts) {
    const t = {
      spec, key: spec.key, label: opts.label || spec.key,
      x: opts.x, y: opts.y, dir: opts.dir,
      m: spec.m || 0, z: opts.z !== undefined ? opts.z : (spec.z || 0),
      p: opts.p || 1,
      lossScale: opts.lossScale || 1,
      ghost: !!spec.ghost,
      speed: opts.speed || rand(spec.speed[0], spec.speed[1]),
      pts: [], len: 0, pending: 0,
      alive: true, born: sim.now, ended: 0,
      decayAt: opts.decayAt || Infinity,
      onEnd: opts.onEnd || null,
      deltas: 0, primary: !!opts.primary,
      gapK: (spec.gapK || 1.5) * rand(0.9, 1.1),
      color: spec.color,
    };
    t.pts.push({ x: t.x, y: t.y, w: width(t) });
    return t;
  }

  function beta(t) {
    const E = Math.sqrt(t.p * t.p + t.m * t.m);
    return t.p / E;
  }

  function width(t) {
    if (t.ghost) return 1;
    const b = Math.max(beta(t), 0.05);
    const ion = (t.z * t.z) / (b * b);
    if (t.key === 'alpha') {
      // alphas: fat from the start, fatter at the end (Bragg peak)
      const ke = Math.sqrt(t.p * t.p + t.m * t.m) - t.m;
      return clamp(3.6 + 2.2 * (1 - ke / (t.ke0 || ke)), 3.6, 5.8);
    }
    return clamp(1.1 + 0.8 * Math.log2(1 + ion / 3), 1.1, 4.4);
  }

  // Advance a track by one step of DS pixels. Returns false when it dies.
  function step(t, sim) {
    const spec = t.spec;
    if (!t.ghost) {
      const b = Math.max(beta(t), 0.02);
      const stiff = spec.stiff || 1;
      const kappa = sim.field ? (K_B * t.z) / (t.p * stiff) : 0;
      let sc = (spec.scatter * Math.abs(t.z) * Math.sqrt(DS)) / (t.p * b);
      sc = Math.min(sc, 0.35);
      t.dir += kappa * DS + randn() * sc;
      // energy loss
      const E = Math.sqrt(t.p * t.p + t.m * t.m);
      let dE = spec.loss * t.lossScale * (t.z * t.z) / (b * b) * DS;
      // electrons and positrons also radiate (bremsstrahlung): loss ∝ energy,
      // which is what turns their circles into tightening spirals
      if (t.m < 1) dE += (E / X0) * DS;
      const E2 = E - dE;
      if (E2 <= t.m + 0.02) { t.p = 0.2; return end(t, sim, 'stopped'); }
      t.p = Math.sqrt(Math.max(E2 * E2 - t.m * t.m, 0.04));
    }
    t.x += Math.cos(t.dir) * DS;
    t.y += Math.sin(t.dir) * DS;
    t.len += DS;
    t.pts.push({ x: t.x, y: t.y, w: width(t) });

    if (t.x < -MARGIN || t.y < -MARGIN || t.x > sim.w + MARGIN || t.y > sim.h + MARGIN) {
      return end(t, sim, 'exited');
    }
    if (t.len >= t.decayAt) return end(t, sim, 'decayed');

    // knock-on electrons off heavy fast tracks
    if (spec.delta && t.deltas < 2 && Math.random() < spec.delta * DS && inside(sim, t.x, t.y, 40)) {
      t.deltas++;
      const d = SPECIES.delta;
      sim.add(makeTrack(sim, d, {
        x: t.x, y: t.y, dir: t.dir + sign() * rand(0.5, 1.4),
        p: rand(d.p[0], d.p[1]), label: 'delta',
      }));
    }
    return true;
  }

  function end(t, sim, why) {
    t.alive = false; t.ended = sim.now; t.why = why;
    if (t.onEnd && why !== 'exited') t.onEnd(t, sim);
    return false;
  }

  function inside(sim, x, y, pad) {
    return x > pad && y > pad && x < sim.w - pad && y < sim.h - pad;
  }

  // --- event factories ----------------------------------------------------
  // Each returns nothing; it adds one or more tracks to the sim.
  // `c` is a compact-mode object for the little specimen canvases.

  function edgeEntry(sim, c) {
    // random point on the border, direction pointing inward ±50°
    const side = Math.floor(rand(0, 4));
    let x, y, dir;
    if (side === 0) { x = rand(0, sim.w); y = -10; dir = Math.PI / 2; }
    else if (side === 1) { x = sim.w + 10; y = rand(0, sim.h); dir = Math.PI; }
    else if (side === 2) { x = rand(0, sim.w); y = sim.h + 10; dir = -Math.PI / 2; }
    else { x = -10; y = rand(0, sim.h); dir = 0; }
    return { x, y, dir: dir + rand(-0.9, 0.9) };
  }
  function topEntry(sim) {
    return { x: rand(sim.w * 0.05, sim.w * 0.95), y: -10, dir: Math.PI / 2 + rand(-0.75, 0.75) };
  }
  function interior(sim, pad) {
    return { x: rand(pad, sim.w - pad), y: rand(pad, sim.h - pad), dir: rand(0, TAU) };
  }

  const EVENTS = {
    beam(sim, c) {
      const s = SPECIES.beam;
      const n = c ? 5 : Math.round(rand(6, 13));
      const cy = c ? sim.h * 0.5 : sim.h * rand(0.35, 0.65);
      const spread = c ? sim.h * 0.35 : sim.h * rand(0.12, 0.28);
      const tilt = c ? 0 : rand(-0.04, 0.04);
      for (let i = 0; i < n; i++) {
        const y = cy + (i / (n - 1) - 0.5) * spread + randn() * 3;
        const t = makeTrack(sim, s, { x: -10, y, dir: tilt + randn() * 0.004, p: rand(s.p[0], s.p[1]), primary: i === 0, label: 'beam' });
        // one in every ~5 beam tracks hits a nucleus somewhere in the chamber
        if (!c && Math.random() < 0.2) {
          t.decayAt = rand(sim.w * 0.2, sim.w * 0.85);
          t.onEnd = (bt, sim) => {
            const k = Math.round(rand(2, 5));
            for (let j = 0; j < k; j++) {
              const spec = j === 0 ? SPECIES.proton : SPECIES.pion;
              const z = j === 0 ? 1 : sign();
              sim.add(makeTrack(sim, spec, {
                x: bt.x, y: bt.y, dir: bt.dir + randn() * 0.45 * (j === 0 ? 0.6 : 1),
                z, p: j === 0 ? rand(400, 900) : rand(150, 700), label: 'star', speed: 1400,
              }));
            }
            // the star is also where a photon might convert nearby
            if (Math.random() < 0.5) {
              sim.add(makeTrack(sim, SPECIES.gamma, {
                x: bt.x, y: bt.y, dir: bt.dir + randn() * 0.5, decayAt: rand(40, 160), label: 'star-gamma',
                onEnd(g, sim) {
                  const total = rand(16, 40), f = rand(0.35, 0.65);
                  sim.add(makeTrack(sim, SPECIES.electron, { x: g.x, y: g.y, dir: g.dir - rand(0.02, 0.1), p: total * f, label: 'pair-electron' }));
                  sim.add(makeTrack(sim, SPECIES.positron, { x: g.x, y: g.y, dir: g.dir + rand(0.02, 0.1), p: total * (1 - f), label: 'pair-positron' }));
                },
              }));
            }
          };
        }
        sim.add(t);
      }
    },
    muon(sim, c) {
      const s = SPECIES.muon;
      const e = c ? { x: -6, y: sim.h * 0.26, dir: 0.2 } : topEntry(sim);
      sim.add(makeTrack(sim, s, { ...e, z: sign(), p: rand(s.p[0], s.p[1]), primary: true }));
    },
    electron(sim, c) { EVENTS._lepton(sim, c, SPECIES.electron); },
    positron(sim, c) { EVENTS._lepton(sim, c, SPECIES.positron); },
    _lepton(sim, c, s) {
      // specimen: start so the spiral ends up in the middle of the little canvas
      const e = c ? { x: sim.w * 0.46, y: sim.h * (s.z < 0 ? 0.64 : 0.36), dir: 0 } : edgeEntry(sim);
      const p = c ? rand(6.5, 10) : rand(s.p[0], s.p[1]);
      sim.add(makeTrack(sim, s, { ...e, p, primary: true }));
    },
    alpha(sim, c) {
      const s = SPECIES.alpha;
      const e = c ? { x: sim.w * 0.36, y: sim.h * 0.5, dir: 0 } : interior(sim, 60);
      const ke = rand(s.ke[0], s.ke[1]);
      const t = makeTrack(sim, s, { ...e, p: momentumFromKE(ke, s.m), primary: true });
      t.ke0 = ke;
      sim.add(t);
    },
    proton(sim, c) {
      const s = SPECIES.proton;
      const e = c ? { x: sim.w * 0.38, y: sim.h * 0.56, dir: -0.15 } : edgeEntry(sim);
      const p = c ? rand(300, 360) : rand(s.p[0], s.p[1]);
      sim.add(makeTrack(sim, s, { ...e, p, primary: true }));
    },
    gamma(sim, c) {
      const s = SPECIES.gamma;
      const e = c ? { x: 4, y: sim.h * 0.5, dir: 0 } : edgeEntry(sim);
      const convertAt = c ? sim.w * 0.38 : rand(80, Math.max(120, Math.min(sim.w, sim.h) * 0.6));
      sim.add(makeTrack(sim, s, {
        ...e, primary: true, decayAt: convertAt,
        onEnd(t, sim) {
          // pair production: share the photon's momentum, small opening angle
          const total = c ? rand(14, 20) : rand(18, 60);
          const f = rand(0.35, 0.65);
          const el = SPECIES.electron, po = SPECIES.positron;
          sim.add(makeTrack(sim, el, { x: t.x, y: t.y, dir: t.dir - rand(0.02, 0.12), p: total * f, label: 'pair-electron' }));
          sim.add(makeTrack(sim, po, { x: t.x, y: t.y, dir: t.dir + rand(0.02, 0.12), p: total * (1 - f), label: 'pair-positron' }));
        },
      }));
    },
    pion(sim, c) {
      const s = SPECIES.pion;
      const e = c ? { x: sim.w * 0.3, y: sim.h * 0.5, dir: 0.05 } : edgeEntry(sim);
      const p = c ? rand(95, 110) : rand(s.p[0], s.p[1]);
      const z = sign();
      sim.add(makeTrack(sim, s, {
        ...e, z, p, primary: true,
        onEnd(t, sim) {
          // π → μ ν  (muon is slow, stubby, and stops)
          const mu = SPECIES.muon;
          sim.add(makeTrack(sim, mu, {
            x: t.x, y: t.y, dir: t.dir + sign() * rand(0.6, 2.2), z,
            p: c ? rand(46, 52) : rand(50, 62), lossScale: 0.55, speed: 260, label: 'decay-muon',
            onEnd(mt, sim) {
              // μ → e ν ν̄  (electron curls away)
              const le = z < 0 ? SPECIES.electron : SPECIES.positron;
              sim.add(makeTrack(sim, le, {
                x: mt.x, y: mt.y, dir: mt.dir + rand(-2.5, 2.5),
                p: c ? rand(5, 8) : rand(9, 30), label: 'decay-electron',
              }));
            },
          }));
        },
      }));
    },
    neutron(sim, c) {
      const s = SPECIES.neutron;
      const e = c ? { x: 4, y: sim.h * 0.5, dir: 0 } : edgeEntry(sim);
      const hitAt = c ? sim.w * 0.42 : rand(80, Math.max(120, Math.min(sim.w, sim.h) * 0.7));
      sim.add(makeTrack(sim, s, {
        ...e, primary: true, decayAt: hitAt,
        onEnd(t, sim) {
          const pr = SPECIES.proton;
          sim.add(makeTrack(sim, pr, {
            x: t.x, y: t.y, dir: t.dir + rand(-0.7, 0.7),
            p: c ? rand(230, 260) : rand(210, 330), label: 'recoil-proton', speed: 500,
          }));
        },
      }));
    },
  };

  // --- the simulation -----------------------------------------------------
  function createSim(w, h, opts) {
    const sim = {
      w, h, now: 0, field: true,
      tracks: [], counts: {}, events: 0,
      hold: opts.hold || 7,     // seconds a finished track stays bright
      fade: opts.fade || 5,     // seconds it takes to disappear after that
      maxTracks: opts.maxTracks || 60,
      rate: opts.rate || 1.6,   // primary events per second
      nextBeam: 1.5,            // seconds until the next beam pulse
      add(t) { this.tracks.push(t); },
    };
    return sim;
  }

  function spawn(sim, key, compact) {
    sim.events++;
    sim.counts[key] = (sim.counts[key] || 0) + 1;
    EVENTS[key](sim, compact);
  }

  function pickLive() {
    let total = 0;
    for (const [, w] of LIVE_MENU) total += w;
    let r = Math.random() * total;
    for (const [k, w] of LIVE_MENU) { r -= w; if (r <= 0) return k; }
    return 'muon';
  }

  // advance every live track by dt seconds
  function advance(sim, dt) {
    sim.now += dt;
    for (let i = 0; i < sim.tracks.length; i++) {
      const t = sim.tracks[i];
      if (!t.alive) continue;
      t.pending += t.speed * dt;
      let guard = 0;
      while (t.pending >= DS && t.alive && guard++ < 4000) {
        t.pending -= DS;
        step(t, sim);
      }
    }
    // reap old tracks
    const life = sim.hold + sim.fade;
    sim.tracks = sim.tracks.filter((t) => t.alive || sim.now - t.ended < life);
  }

  function opacity(sim, t) {
    if (t.alive) return 1;
    const a = sim.now - t.ended;
    if (a < sim.hold) return 1;
    return clamp(1 - (a - sim.hold) / sim.fade, 0, 1);
  }

  // run a track to completion instantly (used for static / reduced-motion mode)
  function finish(sim) {
    let guard = 0;
    while (sim.tracks.some((t) => t.alive) && guard++ < 200) {
      for (const t of sim.tracks) { let g = 0; while (t.alive && g++ < 5000) step(t, sim); }
    }
  }

  // --- rendering ----------------------------------------------------------
  // 'paint' style: same physics, drawn as dry-brush acrylic strokes
  const PAINT = {
    muon: ['#1d4fd6', '#1637b3', '#52b9e6'],
    beam: ['#1aa8a0', '#2a9d8f', '#9bbd3f'],
    electron: ['#e35d9a', '#e0301e', '#f26b1d'],
    positron: ['#f8c51c', '#f26b1d', '#e0301e'],
    alpha: ['#9b1c31', '#e0301e'],
    proton: ['#f26b1d', '#d9b483', '#f8c51c'],
    gamma: ['#7b3fbf', '#e35d9a'],
    pion: ['#1aa8a0', '#1d4fd6', '#7b3fbf'],
    neutron: ['#e0301e', '#9b1c31'],
    delta: ['#e35d9a', '#f8c51c', '#52b9e6'],
  };
  const PAPER = '#f3efe4';
  const WHITE = '#eef4ff';
  const GLOW = 'rgba(210, 225, 255, 0.13)';

  function drawPaper(ctx, w, h) {
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.strokeStyle = 'rgba(80, 60, 30, 0.045)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 6) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 6) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.restore();
  }

  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    if (k < 1) { r *= k; g *= k; b *= k; } else { r += (255 - r) * (k - 1); g += (255 - g) * (k - 1); b += (255 - b) * (k - 1); }
    return `rgb(${r | 0},${g | 0},${b | 0})`;
  }

  // Each track gets a fixed set of bristles the first time it is painted,
  // so the stroke does not shimmer from frame to frame.
  function bristlesFor(t, scale) {
    if (t.bristles) return t.bristles;
    const base = pick(PAINT[t.spec.key] || ['#333']);
    const W = (9 + Math.min(t.pts[0].w, 5.5) * 3.6) * scale;
    const n = 10;
    const list = [];
    for (let i = 0; i < n; i++) {
      list.push({
        off: ((i / (n - 1)) - 0.5) * W * 0.95 + rand(-W * 0.06, W * 0.06),
        lw: (W / n) * rand(0.8, 1.9),
        a: rand(0.4, 0.95),
        col: shade(base, rand(0.72, 1.35)),
        dash: Math.random() < 0.45 ? [rand(24, 140), rand(3, 16)] : null,
        trimA: rand(0, 0.06), trimB: rand(0, 0.08),
        wobble: rand(0.2, 0.6), phase: rand(0, 6.3),
      });
    }
    t.bristles = { W, base, list };
    return t.bristles;
  }

  function drawStroke(ctx, sim, t, scale, alphaMul) {
    const alpha = opacity(sim, t) * alphaMul;
    if (alpha <= 0 || t.ghost || t.pts.length < 4) return;
    const pts = t.pts;
    const { W, base, list } = bristlesFor(t, scale);
    const nx = new Float32Array(pts.length), ny = new Float32Array(pts.length);
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
      nx[i] = -dy / l; ny[i] = dx / l;
    }
    ctx.save();
    ctx.lineJoin = 'round';
    // soft body of the stroke
    ctx.lineCap = 'butt'; ctx.setLineDash([]);
    ctx.globalAlpha = alpha * 0.32;
    ctx.strokeStyle = base; ctx.lineWidth = W * 0.9;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) { if (i === 0) ctx.moveTo(pts[i].x, pts[i].y); else ctx.lineTo(pts[i].x, pts[i].y); }
    ctx.stroke();
    // bristles
    for (const b of list) {
      const i0 = Math.floor(pts.length * b.trimA), i1 = pts.length - 1 - Math.floor(pts.length * b.trimB);
      if (i1 - i0 < 2) continue;
      ctx.globalAlpha = alpha * b.a;
      ctx.strokeStyle = b.col; ctx.lineWidth = b.lw;
      ctx.setLineDash(b.dash || []);
      ctx.beginPath();
      for (let i = i0; i <= i1; i++) {
        const o = b.off * (1 + b.wobble * 0.3 * Math.sin(i * 0.11 + b.phase));
        const x = pts[i].x + nx[i] * o, y = pts[i].y + ny[i] * o;
        if (i === i0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawTrack(ctx, sim, t, identify) {
    const alpha = opacity(sim, t);
    if (alpha <= 0 || t.pts.length < 2) return;
    const color = identify ? t.color : WHITE;

    if (t.ghost) {
      if (!identify) return;
      ctx.save();
      ctx.globalAlpha = alpha * 0.55;
      ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.setLineDash([2, 6]); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(t.pts[0].x, t.pts[0].y);
      for (let i = 1; i < t.pts.length; i++) ctx.lineTo(t.pts[i].x, t.pts[i].y);
      ctx.stroke();
      ctx.restore();
      return;
    }

    // group points into runs of similar width so the track can thicken
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    let i = 0;
    while (i < t.pts.length - 1) {
      const w0 = Math.round(t.pts[i].w * 2) / 2;
      let j = i + 1;
      while (j < t.pts.length - 1 && Math.round(t.pts[j].w * 2) / 2 === w0) j++;
      // halo
      ctx.globalAlpha = alpha;
      ctx.setLineDash([]);
      ctx.strokeStyle = identify ? hexToRgba(color, 0.14) : GLOW;
      ctx.lineWidth = w0 * 3 + 2;
      ctx.beginPath(); ctx.moveTo(t.pts[i].x, t.pts[i].y);
      for (let k = i + 1; k <= j; k++) ctx.lineTo(t.pts[k].x, t.pts[k].y);
      ctx.stroke();
      // beads
      ctx.strokeStyle = color;
      ctx.lineWidth = w0;
      ctx.setLineDash([0.1, Math.max(w0 * t.gapK, 1.6)]);
      ctx.beginPath(); ctx.moveTo(t.pts[i].x, t.pts[i].y);
      for (let k = i + 1; k <= j; k++) ctx.lineTo(t.pts[k].x, t.pts[k].y);
      ctx.stroke();
      i = j;
    }
    ctx.restore();
  }

  function hexToRgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  function drawLabel(ctx, sim, t) {
    const alpha = opacity(sim, t);
    if (alpha <= 0 || t.len < 26) return;
    if (t.label === 'beam' && !t.primary) return;
    const idx = Math.floor(t.pts.length * 0.6);
    const a = t.pts[idx], b = t.pts[Math.min(idx + 1, t.pts.length - 1)];
    const ang = Math.atan2(b.y - a.y, b.x - a.x) - Math.PI / 2;
    const off = 16;
    const lx = a.x + Math.cos(ang) * off, ly = a.y + Math.sin(ang) * off;
    const text = t.spec.sym + '  ' + shortName(t);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = hexToRgba(t.color, 0.6); ctx.lineWidth = 1; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(lx, ly); ctx.stroke();
    ctx.font = '11px "JetBrains Mono", ui-monospace, monospace';
    ctx.textBaseline = 'middle';
    const tw = ctx.measureText(text).width;
    const bx = lx + (Math.cos(ang) < 0 ? -tw - 12 : 4);
    ctx.fillStyle = 'rgba(6,10,70,0.85)';
    ctx.fillRect(bx, ly - 9, tw + 8, 18);
    ctx.fillStyle = t.color;
    ctx.fillText(text, bx + 4, ly);
    ctx.restore();
  }

  function shortName(t) {
    switch (t.label) {
      case 'pair-electron': return 'electron (from γ)';
      case 'pair-positron': return 'positron (from γ)';
      case 'decay-muon': return 'muon (from π)';
      case 'decay-electron': return 'electron (from μ)';
      case 'recoil-proton': return 'proton (hit by n)';
      case 'delta': return 'knock-on electron';
      case 'beam': return 'beam particle';
      case 'star': return t.spec.key === 'proton' ? 'proton (from collision)' : 'pion (from collision)';
      default: return t.spec.name.split(' →')[0].toLowerCase();
    }
  }

  // the guide entry for a track: primary species, or what produced it
  function guideFor(t) {
    if (t.label === 'pair-electron' || t.label === 'pair-positron') return SPECIES.gamma;
    if (t.label === 'decay-muon' || t.label === 'decay-electron') return SPECIES.pion;
    if (t.label === 'recoil-proton') return SPECIES.neutron;
    if (t.label === 'delta') return SPECIES.delta;
    if (t.label === 'star' || t.label === 'star-gamma') return SPECIES.beam;
    return t.spec;
  }

  function drawBackground(ctx, w, h, fiducials) {
    const g = ctx.createRadialGradient(w * 0.5, h * 0.45, 0, w * 0.5, h * 0.45, Math.max(w, h) * 0.75);
    g.addColorStop(0, '#1b2fd6');
    g.addColorStop(0.6, '#1220b0');
    g.addColorStop(1, '#090f6a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // fiducial crosses, like the reference marks etched on a real chamber window
    ctx.save();
    ctx.strokeStyle = 'rgba(220, 230, 255, 0.4)';
    ctx.lineWidth = 1;
    for (const f of fiducials) {
      const x = f[0] * w, y = f[1] * h;
      ctx.beginPath();
      ctx.moveTo(x - 7, y); ctx.lineTo(x + 7, y);
      ctx.moveTo(x, y - 7); ctx.lineTo(x, y + 7);
      ctx.stroke();
    }
    ctx.restore();
  }

  const FIDUCIALS = [[0.08, 0.12], [0.5, 0.09], [0.92, 0.14], [0.06, 0.55], [0.94, 0.58], [0.1, 0.9], [0.5, 0.93], [0.9, 0.9]];

  // nearest track to a point, within r px
  function hitTest(sim, x, y, r) {
    let best = null, bd = r * r;
    for (const t of sim.tracks) {
      if (t.ghost || opacity(sim, t) <= 0.05) continue;
      const pts = t.pts;
      for (let i = 0; i < pts.length; i += 2) {
        const dx = pts[i].x - x, dy = pts[i].y - y;
        const d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = t; }
      }
    }
    return best;
  }

  // --- public controller --------------------------------------------------
  function mount(canvas, options) {
    const opts = Object.assign({ mode: 'live', species: null, rate: 1.6, identify: false, bubbles: true }, options || {});
    const ctx = canvas.getContext('2d');
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const compact = opts.mode === 'specimen';
    let w = 0, h = 0, dpr = 1;
    let sim = null;
    let identify = !!opts.identify;
    let paused = false;
    let last = 0, raf = 0, nextSpawn = 0;
    let boil = [];
    let specimenPhase = 0; // for specimen mode: time at which to respawn
    let dry = null, dryCtx = null, washAcc = 0; // paint style: baked strokes

    function ensureDry() {
      if (!dry) dry = document.createElement('canvas');
      if (dry.width !== canvas.width || dry.height !== canvas.height) {
        dry.width = canvas.width; dry.height = canvas.height;
        dryCtx = dry.getContext('2d');
        dryCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (opts.paper === false) dryCtx.clearRect(0, 0, w, h); else drawPaper(dryCtx, w, h);
        sim.tracks.forEach((t) => { t.baked = false; });
      }
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const nw = Math.max(1, Math.round(rect.width)), nh = Math.max(1, Math.round(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (nw === w && nh === h && canvas.width === Math.round(nw * dpr)) return;
      w = nw; h = nh;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      if (!sim) {
        sim = createSim(w, h, compact ? { hold: 2.2, fade: 0.8, maxTracks: 12 } : { rate: opts.rate, hold: opts.hold, fade: opts.fade, maxTracks: opts.maxTracks });
        sim.field = opts.field !== false;
      } else { sim.w = w; sim.h = h; }
      render();
    }

    function spawnLive() {
      const live = sim.tracks.filter((t) => t.alive).length;
      if (sim.tracks.length > sim.maxTracks || live > 14) return;
      spawn(sim, pickLive(), false);
    }

    function render() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (opts.style === 'paint') {
        ensureDry();
        const scale = opts.strokeScale || 1, am = opts.alpha || 1;
        // finished strokes are painted once onto the dry layer and dropped from the live list
        for (const t of sim.tracks) {
          if (!t.alive && !t.baked) { drawStroke(dryCtx, sim, t, scale, am); t.baked = true; }
        }
        sim.tracks = sim.tracks.filter((t) => !t.baked);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(dry, 0, 0);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        for (const t of sim.tracks) drawStroke(ctx, sim, t, scale, am);
        return;
      }
      drawBackground(ctx, w, h, compact ? [] : FIDUCIALS);
      // background boiling: faint random micro-bubbles
      if (opts.bubbles && !compact) {
        ctx.save();
        for (const b of boil) {
          ctx.globalAlpha = b.a;
          ctx.fillStyle = WHITE;
          ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
        }
        ctx.restore();
      }
      for (const t of sim.tracks) drawTrack(ctx, sim, t, identify);
      if (identify && !compact) for (const t of sim.tracks) if (!t.ghost && t.alive === false || t.len > 60) drawLabel(ctx, sim, t);
    }

    function tick(ts) {
      raf = requestAnimationFrame(tick);
      if (!last) last = ts;
      const dt = Math.min((ts - last) / 1000, 0.05);
      last = ts;
      if (paused) return;
      update(dt);
    }

    // one simulation step of dt seconds: spawn, advance, render
    function update(dt) {
      simulate(dt);
      render();
      if (opts.onFrame) opts.onFrame(stats());
    }

    function simulate(dt) {
      advance(sim, dt);

      if (compact) {
        // one specimen at a time: spawn, let it play out, hold, then clear
        const anyAlive = sim.tracks.some((t) => t.alive);
        if (!sim.tracks.length && sim.now >= specimenPhase) {
          spawn(sim, opts.species, true);
        } else if (!anyAlive && sim.tracks.length && !specimenPhase) {
          specimenPhase = sim.now + sim.hold + sim.fade + 0.2;
        }
        if (specimenPhase && sim.now >= specimenPhase && !sim.tracks.length) specimenPhase = 0;
        if (!sim.tracks.length && specimenPhase === 0) specimenPhase = sim.now + 0.4;
      } else {
        sim.nextBeam -= dt;
        if (sim.nextBeam <= 0 && sim.tracks.length < sim.maxTracks + 20) {
          spawn(sim, 'beam', false);
          const bi = opts.beamInterval || [6, 11];
          sim.nextBeam = rand(bi[0], bi[1]);
        }
        nextSpawn -= dt;
        if (nextSpawn <= 0) {
          spawnLive();
          // Poisson-ish gaps
          nextSpawn = -Math.log(1 - Math.random()) / sim.rate;
        }
        // boil
        if (opts.bubbles) {
          if (Math.random() < 0.6) boil.push({ x: rand(0, w), y: rand(0, h), r: rand(0.4, 1.3), a: rand(0.05, 0.22), life: rand(0.4, 1.4) });
          for (const b of boil) { b.life -= dt; b.a *= 0.985; }
          boil = boil.filter((b) => b.life > 0);
          if (boil.length > 90) boil.splice(0, boil.length - 90);
        }
      }
      // paint: old layers slowly wash out under new ones
      if (opts.style === 'paint' && opts.paper !== false && dryCtx) {
        washAcc += dt;
        if (washAcc > (opts.washEvery || 6)) {
          washAcc = 0;
          dryCtx.save(); dryCtx.globalAlpha = opts.washAlpha || 0.06; dryCtx.fillStyle = PAPER; dryCtx.fillRect(0, 0, w, h); dryCtx.restore();
        }
      }
    }

    function stats() {
      return { events: sim.events, counts: sim.counts, live: sim.tracks.filter((t) => t.alive).length, tracks: sim.tracks.length, field: sim.field };
    }

    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(canvas); else window.addEventListener('resize', resize);
    resize();

    if ((reduced || opts.static) && !compact) {
      // a still picture instead of a movie
      if (opts.beam !== false) spawn(sim, 'beam', false);
      for (let i = 0; i < (opts.count || 22); i++) spawn(sim, pickLive(), false);
      finish(sim);
      sim.tracks.forEach((t) => { t.ended = sim.now; });
      render();
      if (opts.onFrame) opts.onFrame(stats());
    } else if (reduced && compact) {
      spawn(sim, opts.species, true);
      finish(sim);
      render();
    } else {
      if (!compact) { for (let i = 0; i < 5; i++) spawnLive(); }
      raf = requestAnimationFrame(tick);
    }

    return {
      get identify() { return identify; },
      setIdentify(v) { identify = !!v; render(); },
      get paused() { return paused; },
      setPaused(v) { paused = !!v; },
      get field() { return sim.field; },
      setField(v) { sim.field = !!v; },
      clear() { sim.tracks = []; boil = []; render(); },
      advanceBy(seconds) { const n = Math.ceil(seconds / (1 / 60)); for (let i = 0; i < n; i++) simulate(1 / 60); render(); },
      hit(x, y, r) {
        const t = hitTest(sim, x, y, r || 12);
        return t ? { track: t, spec: t.spec, guide: guideFor(t), name: shortName(t) } : null;
      },
      stats,
      species: SPECIES,
      destroy() { cancelAnimationFrame(raf); if (ro) ro.disconnect(); },
    };
  }

  // Any <canvas class="wash"> becomes a faint, static painted background.
  if (typeof document !== 'undefined') {
    const init = () => {
      document.querySelectorAll('canvas.wash').forEach((c) => {
        if (c.dataset.mounted) return;
        c.dataset.mounted = '1';
        mount(c, { style: 'paint', static: true, paper: false, alpha: Number(c.dataset.alpha) || 0.16, strokeScale: Number(c.dataset.scale) || 1.7, count: Number(c.dataset.count) || 16, bubbles: false });
      });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  }

  const api = { mount, SPECIES, LIVE_MENU, _internal: { createSim, spawn, advance, finish, EVENTS } };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Chamber = api;
})(typeof window !== 'undefined' ? window : globalThis);
