// Generated sound: everything is synthesised with Web Audio, there are no sound files.
// The AudioContext exists only while something can be heard. When everything is muted it is closed,
// so the game never interrupts music the player listens to from another app.

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

// Music per chapter: root note, scale, tempo, tone. Slow, quiet, a few notes.
const SCALES = {
  majPent: [0, 2, 4, 7, 9], lydian: [0, 2, 4, 6, 7, 9, 11], dorian: [0, 2, 3, 5, 7, 9, 10],
  minPent: [0, 3, 5, 7, 10], aeolian: [0, 2, 3, 5, 7, 8, 10], phrygian: [0, 1, 3, 5, 7, 8, 10],
  whole: [0, 2, 4, 6, 8, 10], harmMin: [0, 2, 3, 5, 7, 8, 11],
};
const MUSIC = {
  1: { root: 60, scale: 'majPent', bpm: 66, wave: 'triangle', chords: [0, 3, 4, 3], density: 0.55, bright: 1800 },
  2: { root: 62, scale: 'lydian', bpm: 76, wave: 'square', chords: [0, 1, 4, 0], density: 0.5, bright: 1300 },
  3: { root: 57, scale: 'dorian', bpm: 58, wave: 'sine', chords: [0, 3, 0, 4], density: 0.4, bright: 1100 },
  4: { root: 59, scale: 'minPent', bpm: 72, wave: 'triangle', chords: [0, 2, 3, 0], density: 0.5, bright: 1500 },
  5: { root: 56, scale: 'aeolian', bpm: 54, wave: 'sine', chords: [0, 5, 3, 4], density: 0.35, bright: 900 },
  6: { root: 55, scale: 'minPent', bpm: 84, wave: 'triangle', chords: [0, 0, 3, 2], density: 0.65, bright: 1200 },
  7: { root: 53, scale: 'phrygian', bpm: 80, wave: 'sawtooth', chords: [0, 1, 0, 4], density: 0.55, bright: 800 },
  8: { root: 50, scale: 'harmMin', bpm: 52, wave: 'sine', chords: [0, 3, 4, 0], density: 0.3, bright: 700 },
  9: { root: 58, scale: 'whole', bpm: 62, wave: 'triangle', chords: [0, 2, 1, 3], density: 0.5, bright: 1600 },
  10: { root: 48, scale: 'aeolian', bpm: 48, wave: 'sine', chords: [0, 5, 3, 0], density: 0.3, bright: 650 },
};

// Minimal gap between two plays of the same effect (seconds), so hundreds of events do not pile up.
const MIN_GAP = { shot: 0.07, hit: 0.09, death: 0.06, coin: 0.08, cannon: 0.12, explode: 0.1, frost: 0.25, heroHit: 0.15, leak: 0.25, click: 0.03, zap: 0.1, trap: 0.15, teleport: 0.3, wreck: 0.2, steal: 0.2 };

class GameAudio {
  constructor() {
    this.ctx = null;
    this.musicVol = 0.6;
    this.sfxVol = 0.8;
    this.mute = true;        // until the player answers "Zapnout zvuk?"
    this.chapter = 0;
    this.speed = 1;
    this.last = {};
    this.voices = 0;
    this.timer = null;
    this.step = 0;
    this.nextT = 0;
    this.hidden = false;
  }

  get audible() { return !this.mute && (this.musicVol > 0 || this.sfxVol > 0); }

  // Called with the saved settings at start and on every change. Must be called from a user gesture
  // when it may switch the sound on (iOS only allows audio to start after a touch).
  configure({ music, sfx, mute }) {
    if (music !== undefined) this.musicVol = clamp01(music / 100);
    if (sfx !== undefined) this.sfxVol = clamp01(sfx / 100);
    if (mute !== undefined) this.mute = !!mute;
    if (!this.audible) { this.shutdown(); return; }
    if (this.ctx) this.applyVolumes();
  }

  // First touch: create the context when sound is wanted.
  unlock() {
    if (!this.audible || this.hidden) return;
    if (!this.ctx) this.start();
    else if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
  }

  start() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      const ctx = new AC({ latencyHint: 'interactive' });
      this.ctx = ctx;
      this.master = ctx.createGain();
      // Gentle limiter so many effects at once never clip.
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16; comp.knee.value = 18; comp.ratio.value = 6; comp.attack.value = 0.004; comp.release.value = 0.2;
      this.master.connect(comp); comp.connect(ctx.destination);
      this.sfxBus = ctx.createGain(); this.sfxBus.connect(this.master);
      this.musicBus = ctx.createGain();
      this.musicFilter = ctx.createBiquadFilter(); this.musicFilter.type = 'lowpass'; this.musicFilter.frequency.value = 1500;
      this.musicBus.connect(this.musicFilter); this.musicFilter.connect(this.master);
      // Short noise buffer shared by all noisy effects.
      const len = Math.floor(ctx.sampleRate * 1.0);
      this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      let seed = 1337;
      for (let i = 0; i < len; i++) { seed = (seed * 16807) % 2147483647; d[i] = (seed / 1073741823.5) - 1; }
      this.applyVolumes();
      this.voices = 0;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      if (this.chapter) this.startMusic();
    } catch (e) { this.ctx = null; }
  }

  shutdown() {
    this.stopMusic();
    if (this.ctx) { try { this.ctx.close(); } catch (e) { /* ignore */ } }
    this.ctx = null;
  }

  applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.sfxBus.gain.setTargetAtTime(this.sfxVol * 0.9, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.musicVol * 0.5, t, 0.2);
    if (this.musicVol <= 0) this.stopMusic(); else if (this.chapter && !this.timer) this.startMusic();
  }

  // Game in the background: stop everything, come back on return.
  setHidden(h) {
    this.hidden = h;
    if (!this.ctx) return;
    if (h) { this.stopMusic(); this.ctx.suspend().catch(() => {}); }
    else if (this.audible) { this.ctx.resume().catch(() => {}); if (this.chapter) this.startMusic(); }
  }

  setSpeed(n) { this.speed = n; }

  // ---------- effects ----------

  env(gainNode, t, a, d, peak) {
    const g = gainNode.gain;
    g.setValueAtTime(0.0001, t);
    g.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    g.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  tone({ f, f2, type = 'sine', a = 0.005, d = 0.15, vol = 0.3, t0 = 0, bus }) {
    const ctx = this.ctx, t = ctx.currentTime + t0;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + a + d);
    this.env(g, t, a, d, vol);
    o.connect(g); g.connect(bus || this.sfxBus);
    o.start(t); o.stop(t + a + d + 0.03);
    const counted = !bus; // music notes do not use up the effect voices
    if (counted) this.voices++;
    o.onended = () => { if (counted) this.voices--; g.disconnect(); };
  }

  noiseHit({ f = 1000, f2, q = 1, type = 'bandpass', a = 0.003, d = 0.15, vol = 0.3, t0 = 0 }) {
    const ctx = this.ctx, t = ctx.currentTime + t0;
    const s = ctx.createBufferSource(), flt = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = this.noise; s.loop = true;
    flt.type = type; flt.Q.value = q;
    flt.frequency.setValueAtTime(f, t);
    if (f2) flt.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t + a + d);
    this.env(g, t, a, d, vol);
    s.connect(flt); flt.connect(g); g.connect(this.sfxBus);
    s.start(t, Math.random() * 0.5); s.stop(t + a + d + 0.03);
    this.voices++;
    s.onended = () => { this.voices--; g.disconnect(); };
  }

  play(name, v = 1) {
    if (!this.ctx || this.sfxVol <= 0 || this.hidden || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const fast = this.speed >= 8 ? 3 : this.speed >= 4 ? 1.8 : 1;
    const gap = (MIN_GAP[name] || 0) * fast;
    if (gap && now - (this.last[name] || -9) < gap) return;
    const maxVoices = this.speed >= 8 ? 8 : this.speed >= 4 ? 12 : 18;
    const important = name === 'boss' || name === 'lose' || name === 'leak' || name === 'chapter' || name === 'waveStart';
    if (this.voices >= maxVoices && !important) return;
    this.last[name] = now;
    const r = 0.94 + Math.random() * 0.12; // small pitch variation
    switch (name) {
      case 'click': this.tone({ f: 660, f2: 880, type: 'triangle', d: 0.05, vol: 0.12 * v }); break;
      case 'deny': this.tone({ f: 190, f2: 140, type: 'triangle', d: 0.14, vol: 0.2 * v }); break;
      case 'shot': this.noiseHit({ f: 2600 * r, f2: 900, q: 2, d: 0.06, vol: 0.1 * v }); this.tone({ f: 520 * r, f2: 300, type: 'triangle', d: 0.07, vol: 0.07 * v }); break;
      case 'hit': this.tone({ f: 300 * r, f2: 180, type: 'sine', d: 0.05, vol: 0.07 * v }); break;
      case 'cannon': this.tone({ f: 150 * r, f2: 48, type: 'sine', d: 0.22, vol: 0.4 * v }); this.noiseHit({ f: 700, f2: 150, type: 'lowpass', d: 0.14, vol: 0.2 * v }); break;
      case 'explode': this.noiseHit({ f: 900 * r, f2: 90, type: 'lowpass', d: 0.32, vol: 0.32 * v }); this.tone({ f: 90, f2: 40, type: 'sine', d: 0.26, vol: 0.28 * v }); break;
      case 'frost': this.tone({ f: 1500 * r, f2: 2300, type: 'sine', a: 0.02, d: 0.3, vol: 0.06 * v }); this.tone({ f: 2250 * r, f2: 3100, type: 'sine', a: 0.03, d: 0.25, vol: 0.035 * v }); this.noiseHit({ f: 6000, q: 0.7, type: 'highpass', a: 0.02, d: 0.22, vol: 0.03 * v }); break;
      case 'death': this.tone({ f: 380 * r, f2: 120, type: 'sine', d: 0.11, vol: 0.14 * v }); this.noiseHit({ f: 1200, f2: 400, q: 1.5, d: 0.07, vol: 0.05 * v }); break;
      case 'coin': this.tone({ f: 1320 * r, type: 'triangle', d: 0.07, vol: 0.09 * v }); this.tone({ f: 1760 * r, type: 'triangle', d: 0.16, vol: 0.09 * v, t0: 0.06 }); break;
      case 'gold': for (let i = 0; i < 4; i++) this.tone({ f: midi(84 + [0, 4, 7, 12][i]), type: 'triangle', d: 0.14, vol: 0.09 * v, t0: i * 0.07 }); break;
      case 'build': this.tone({ f: 170, f2: 70, type: 'sine', d: 0.16, vol: 0.34 * v }); this.noiseHit({ f: 500, f2: 200, type: 'lowpass', d: 0.1, vol: 0.14 * v }); this.tone({ f: 620, type: 'triangle', d: 0.05, vol: 0.05 * v, t0: 0.02 }); break;
      case 'sell': this.tone({ f: 700, f2: 350, type: 'triangle', d: 0.12, vol: 0.12 * v }); this.tone({ f: 1320, type: 'triangle', d: 0.1, vol: 0.08 * v, t0: 0.1 }); this.tone({ f: 1760, type: 'triangle', d: 0.16, vol: 0.08 * v, t0: 0.17 }); break;
      case 'merge': for (let i = 0; i < 4; i++) this.tone({ f: midi(67 + [0, 4, 7, 12][i]), type: 'triangle', d: 0.2, vol: 0.13 * v, t0: 0.12 + i * 0.06 }); this.noiseHit({ f: 400, f2: 4000, q: 1, a: 0.14, d: 0.1, vol: 0.06 * v }); break;
      case 'leak': this.tone({ f: 330, f2: 110, type: 'sawtooth', d: 0.42, vol: 0.14 * v }); this.tone({ f: 247, f2: 82, type: 'sine', d: 0.5, vol: 0.2 * v }); break;
      case 'heroHit': this.tone({ f: 880 * r, f2: 500, type: 'square', d: 0.05, vol: 0.05 * v }); this.noiseHit({ f: 3200, q: 3, d: 0.04, vol: 0.06 * v }); break;
      case 'strike': this.noiseHit({ f: 500, f2: 3000, q: 1, a: 0.06, d: 0.05, vol: 0.12 * v }); this.tone({ f: 1100, f2: 500, type: 'square', d: 0.12, vol: 0.09 * v, t0: 0.07 }); this.tone({ f: 120, f2: 50, type: 'sine', d: 0.25, vol: 0.34 * v, t0: 0.07 }); break;
      case 'heroDown': this.tone({ f: 500, f2: 90, type: 'triangle', d: 0.6, vol: 0.16 * v }); break;
      case 'heroUp': this.tone({ f: 260, f2: 780, type: 'triangle', d: 0.3, vol: 0.14 * v }); break;
      case 'waveStart': this.tone({ f: midi(55), type: 'triangle', a: 0.03, d: 0.3, vol: 0.16 * v }); this.tone({ f: midi(62), type: 'triangle', a: 0.03, d: 0.45, vol: 0.16 * v, t0: 0.16 }); break;
      case 'waveEnd': for (let i = 0; i < 3; i++) this.tone({ f: midi(72 + [0, 4, 7][i]), type: 'triangle', d: 0.24, vol: 0.12 * v, t0: i * 0.09 }); break;
      case 'boss': this.tone({ f: 82, f2: 55, type: 'sawtooth', a: 0.08, d: 1.3, vol: 0.2 * v }); this.tone({ f: 123, f2: 82, type: 'sine', a: 0.08, d: 1.4, vol: 0.3 * v }); this.noiseHit({ f: 200, f2: 60, type: 'lowpass', a: 0.1, d: 1.0, vol: 0.2 * v }); break;
      case 'bossDown': for (let i = 0; i < 5; i++) this.tone({ f: midi(60 + [0, 4, 7, 12, 16][i]), type: 'triangle', d: 0.35, vol: 0.14 * v, t0: i * 0.1 }); break;
      case 'chapter': for (let i = 0; i < 6; i++) this.tone({ f: midi(60 + [0, 7, 4, 12, 7, 16][i]), type: 'triangle', a: 0.02, d: 0.5, vol: 0.13 * v, t0: i * 0.14 }); break;
      case 'unlock': this.tone({ f: midi(72), type: 'triangle', d: 0.2, vol: 0.13 * v }); this.tone({ f: midi(79), type: 'triangle', d: 0.4, vol: 0.13 * v, t0: 0.12 }); break;
      case 'lose': for (let i = 0; i < 4; i++) this.tone({ f: midi(64 - [0, 2, 4, 9][i]), type: 'sine', a: 0.03, d: 0.7, vol: 0.18 * v, t0: i * 0.3 }); break;
      case 'bubble': this.tone({ f: 500 * r, f2: 900, type: 'sine', d: 0.07, vol: 0.07 * v }); break;
      case 'checkpoint': this.tone({ f: midi(76), type: 'sine', d: 0.5, vol: 0.12 * v }); this.tone({ f: midi(83), type: 'sine', d: 0.7, vol: 0.1 * v, t0: 0.2 }); break;
      // chapters 2–5
      case 'zap': this.noiseHit({ f: 3800 * r, f2: 1200, q: 4, d: 0.09, vol: 0.09 * v }); this.tone({ f: 1400 * r, f2: 300, type: 'sawtooth', d: 0.08, vol: 0.05 * v }); break;
      case 'trap': this.tone({ f: 420 * r, f2: 900, type: 'square', d: 0.05, vol: 0.06 * v }); this.noiseHit({ f: 2000, q: 2, d: 0.06, vol: 0.08 * v }); break;
      case 'teleport': this.tone({ f: 300, f2: 1400, type: 'sine', a: 0.02, d: 0.35, vol: 0.1 * v }); this.tone({ f: 450, f2: 2100, type: 'triangle', a: 0.02, d: 0.3, vol: 0.05 * v, t0: 0.05 }); break;
      case 'wreck': this.noiseHit({ f: 500 * r, f2: 80, type: 'lowpass', d: 0.4, vol: 0.3 * v }); this.tone({ f: 110, f2: 45, type: 'sine', d: 0.3, vol: 0.25 * v }); break;
      case 'repair': for (let i = 0; i < 3; i++) this.tone({ f: 900 * r, f2: 700, type: 'square', d: 0.03, vol: 0.05 * v, t0: i * 0.11 }); this.tone({ f: midi(79), type: 'triangle', d: 0.25, vol: 0.09 * v, t0: 0.35 }); break;
      case 'spell': this.tone({ f: midi(72), f2: midi(84), type: 'sine', a: 0.04, d: 0.5, vol: 0.13 * v }); this.noiseHit({ f: 5000, q: 0.8, type: 'highpass', a: 0.1, d: 0.4, vol: 0.05 * v }); break;
      case 'card': for (let i = 0; i < 3; i++) this.tone({ f: midi(79 + [0, 5, 9][i]), type: 'triangle', d: 0.2, vol: 0.1 * v, t0: i * 0.07 }); break;
      case 'paper': this.noiseHit({ f: 3000, f2: 6000, q: 0.6, type: 'highpass', a: 0.02, d: 0.25, vol: 0.06 * v }); break;
      case 'steal': this.tone({ f: 1500 * r, f2: 600, type: 'triangle', d: 0.18, vol: 0.08 * v }); break;
      case 'plug': this.tone({ f: 180, f2: 120, type: 'square', d: 0.15, vol: 0.12 * v }); this.tone({ f: 90, type: 'sine', d: 0.3, vol: 0.2 * v }); break;
    }
  }

  // A single clear note (things in the world that can be played).
  ping(f, type = 'triangle', d = 0.5) {
    if (!this.ctx || this.sfxVol <= 0 || this.hidden || this.ctx.state !== 'running') return;
    this.tone({ f, type, a: 0.005, d, vol: 0.16 });
    this.tone({ f: f * 2, type: 'sine', a: 0.005, d: d * 0.6, vol: 0.05 });
  }

  // ---------- music ----------

  setMusic(chapter) {
    chapter = MUSIC[chapter] ? chapter : 0;
    if (chapter === this.chapter) return;
    this.chapter = chapter;
    this.stopMusic();
    if (chapter && this.ctx && this.musicVol > 0 && !this.hidden) this.startMusic();
  }

  startMusic() {
    if (!this.ctx || this.timer || !this.chapter || this.musicVol <= 0) return;
    const m = MUSIC[this.chapter];
    this.musicFilter.frequency.setTargetAtTime(m.bright, this.ctx.currentTime, 0.5);
    this.step = 0;
    this.nextT = this.ctx.currentTime + 0.3;
    this.rng = 7 + this.chapter * 101;
    this.timer = setInterval(() => this.schedule(), 180);
    this.schedule();
  }

  stopMusic() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  rand() { this.rng = (this.rng * 16807) % 2147483647; return this.rng / 2147483647; }

  note(deg, oct = 0) {
    const m = MUSIC[this.chapter], sc = SCALES[m.scale];
    const n = sc.length;
    const o = Math.floor(deg / n), i = ((deg % n) + n) % n;
    return midi(m.root + sc[i] + 12 * (o + oct));
  }

  // Schedules notes a little ahead of time. One step = an eighth note, 32 steps = one phrase of 4 bars.
  schedule() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const m = MUSIC[this.chapter];
    if (!m) return;
    const stepLen = 60 / m.bpm / 2;
    if (this.nextT < ctx.currentTime) this.nextT = ctx.currentTime + 0.05;
    while (this.nextT < ctx.currentTime + 0.5) {
      const s = this.step % 64;
      const t0 = this.nextT - ctx.currentTime;
      if (s === 0) this.rng = 7 + this.chapter * 101; // the phrase repeats: same "random" notes every loop
      const bar = Math.floor(s / 16) % 4;
      const chord = m.chords[bar];
      // thin = 0..3: the music loses its instruments one by one (the last chapter between waves)
      const thin = this.thin || 0;
      if (s % 16 === 0) {
        // Soft pad: root, third and fifth of the chord, slow attack.
        const dur = stepLen * 16;
        for (const [k, dv] of [[0, 0.05], [2, 0.035], [4, 0.035]]) {
          if ((thin >= 1 && k === 4) || (thin >= 2 && k === 2)) continue;
          this.tone({ f: this.note(chord + k, -1), type: 'sine', a: dur * 0.3, d: dur * 0.8, vol: dv, t0, bus: this.musicBus });
        }
        if (thin < 3) this.tone({ f: this.note(chord, -2), type: 'triangle', a: 0.05, d: dur * 0.9, vol: 0.05, t0, bus: this.musicBus });
      }
      // Melody: sparse plucked notes from the scale.
      const strong = s % 4 === 0;
      if (this.rand() < m.density * (strong ? 1 : 0.45) * (thin >= 3 ? 0 : 1 - thin * 0.35)) {
        const deg = chord + [0, 2, 4, 5, 7, 4, 2, 6][Math.floor(this.rand() * 8)];
        this.tone({ f: this.note(deg, 0), type: m.wave, a: 0.01, d: stepLen * (strong ? 3 : 1.6), vol: m.wave === 'sine' ? 0.09 : 0.05, t0, bus: this.musicBus });
      }
      this.nextT += stepLen;
      this.step++;
    }
  }
}

export const audio = new GameAudio();
