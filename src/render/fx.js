// Particles and short effects. Fixed-size arrays, nothing is allocated while the game runs.
import * as THREE from '../../vendor/three.module.min.js';
import { Pool, lit, additive } from './geo.js';

export const K_CUBE = 0, K_GLOW = 1, K_PUFF = 2, K_COIN = 3;
const N = 900;
const RN = 96;
const DN = 48;
const _c = new THREE.Color();

export class Fx {
  constructor(scene) {
    this.kind = new Uint8Array(N);
    this.alive = new Uint8Array(N);
    this.p = new Float32Array(N * 3);
    this.v = new Float32Array(N * 3);
    this.col = new Float32Array(N * 3);
    this.life = new Float32Array(N);
    this.max = new Float32Array(N);
    this.size = new Float32Array(N);
    this.grav = new Float32Array(N);
    this.spin = new Float32Array(N);
    this.cursor = 0;
    this.amount = 0.6;

    this.cubes = new Pool(scene, new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ flatShading: true }), 420, { color: true });
    this.glows = new Pool(scene, new THREE.IcosahedronGeometry(1, 1), additive(0xffffff, 0.9), 420, { color: true, order: 6 });
    this.puffs = new Pool(scene, new THREE.IcosahedronGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.55, depthWrite: false }), 220, { color: true, order: 5 });
    this.coins = new Pool(scene, new THREE.CylinderGeometry(1, 1, 0.3, 8).rotateX(Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xFFD86B, emissive: 0x7a5200, flatShading: true }), 120);
    this.ringPool = new Pool(scene, new THREE.RingGeometry(0.82, 1, 40).rotateX(-Math.PI / 2), additive(0xffffff, 0.9, { side: THREE.DoubleSide }), RN, { color: true, order: 4 });

    // Rings: x, y, z, r0, r1, t, dur, r, g, b
    this.rings = new Float32Array(RN * 10);
    this.ringOn = new Uint8Array(RN);
    this.ringCur = 0;
    // Delayed bursts: t, kind id, x, y, z, a, b
    this.delayed = new Float32Array(DN * 7);
    this.delayOn = new Uint8Array(DN);
  }

  setQuality(q) { this.amount = q === 'low' ? 0.3 : q === 'high' ? 1 : 0.6; }

  clear() { this.alive.fill(0); this.ringOn.fill(0); this.delayOn.fill(0); }

  // Number of particles after the quality setting (at least one).
  count(n) { return Math.max(1, Math.round(n * this.amount)); }

  spawn(kind, x, y, z, vx, vy, vz, life, size, color, grav = 0, spin = 0) {
    let i = this.cursor;
    for (let k = 0; k < 8 && this.alive[i]; k++) i = (i + 1) % N;
    this.cursor = (i + 1) % N;
    this.alive[i] = 1; this.kind[i] = kind;
    const j = i * 3;
    this.p[j] = x; this.p[j + 1] = y; this.p[j + 2] = z;
    this.v[j] = vx; this.v[j + 1] = vy; this.v[j + 2] = vz;
    _c.setHex(color);
    this.col[j] = _c.r; this.col[j + 1] = _c.g; this.col[j + 2] = _c.b;
    this.life[i] = 0; this.max[i] = life; this.size[i] = size; this.grav[i] = grav; this.spin[i] = spin;
  }

  ring(x, y, z, r0, r1, dur, color) {
    let i = this.ringCur;
    for (let k = 0; k < 6 && this.ringOn[i]; k++) i = (i + 1) % RN;
    this.ringCur = (i + 1) % RN;
    this.ringOn[i] = 1;
    const j = i * 10, R = this.rings;
    _c.setHex(color);
    R[j] = x; R[j + 1] = y; R[j + 2] = z; R[j + 3] = r0; R[j + 4] = r1; R[j + 5] = 0; R[j + 6] = dur; R[j + 7] = _c.r; R[j + 8] = _c.g; R[j + 9] = _c.b;
  }

  // ----- ready-made bursts -----

  debris(x, y, z, color, n, speed = 2.2, size = 0.11) {
    n = this.count(n);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = speed * (0.5 + Math.random() * 0.7);
      this.spawn(K_CUBE, x, y + Math.random() * 0.15, z, Math.cos(a) * s, 2 + Math.random() * 2.2, Math.sin(a) * s, 0.55 + Math.random() * 0.3, size * (0.7 + Math.random() * 0.6), color, 11, (Math.random() - 0.5) * 14);
    }
  }

  dust(x, y, z, n = 6, color = 0xE9DCC2, spread = 0.45, size = 0.2) {
    n = this.count(n);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 0.5 + Math.random() * 0.9;
      this.spawn(K_PUFF, x + Math.cos(a) * spread * 0.4, y + 0.05, z + Math.sin(a) * spread * 0.4, Math.cos(a) * s, 0.25 + Math.random() * 0.4, Math.sin(a) * s, 0.45 + Math.random() * 0.25, size * (0.7 + Math.random() * 0.6), color, 0, 0);
    }
  }

  sparks(x, y, z, color, n = 6, speed = 2.5, size = 0.06, life = 0.35) {
    n = this.count(n);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = speed * (0.4 + Math.random() * 0.8);
      this.spawn(K_GLOW, x, y, z, Math.cos(a) * s, 0.5 + Math.random() * speed * 0.6, Math.sin(a) * s, life * (0.6 + Math.random() * 0.8), size, color, 5, 0);
    }
  }

  flash(x, y, z, r, color, dur = 0.22) { this.spawn(K_GLOW, x, y, z, 0, 0, 0, dur, r, color, 0, 1); }

  coinPop(x, y, z, n = 1) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = n > 1 ? 0.6 + Math.random() * 1.2 : 0.2;
      this.spawn(K_COIN, x, y, z, Math.cos(a) * s, 3.2 + Math.random() * 1.2, Math.sin(a) * s, 0.6 + Math.random() * 0.15, 0.1, 0xffffff, 9, 10 + Math.random() * 6);
    }
  }

  // Run a burst a little later (e.g. dust when a falling building lands). id: 0 dust, 1 ring, 2 flash + sparks.
  later(t, id, x, y, z, a = 0, b = 0) {
    for (let i = 0; i < DN; i++) {
      if (this.delayOn[i]) continue;
      this.delayOn[i] = 1;
      const j = i * 7, D = this.delayed;
      D[j] = t; D[j + 1] = id; D[j + 2] = x; D[j + 3] = y; D[j + 4] = z; D[j + 5] = a; D[j + 6] = b;
      return;
    }
  }

  update(dt) {
    // delayed bursts
    for (let i = 0; i < DN; i++) {
      if (!this.delayOn[i]) continue;
      const j = i * 7, D = this.delayed;
      D[j] -= dt;
      if (D[j] > 0) continue;
      this.delayOn[i] = 0;
      const id = D[j + 1], x = D[j + 2], y = D[j + 3], z = D[j + 4];
      if (id === 0) this.dust(x, y, z, D[j + 5] || 6);
      else if (id === 1) this.ring(x, y, z, 0.2, D[j + 5] || 1, 0.45, D[j + 6] || 0xFFB347);
      else if (id === 2) { this.flash(x, y, z, D[j + 5] || 0.7, 0xffffff, 0.25); this.sparks(x, y, z, D[j + 6] || 0xFFD86B, 12, 3, 0.07, 0.5); }
    }

    this.cubes.begin(); this.glows.begin(); this.puffs.begin(); this.coins.begin();
    const p = this.p, v = this.v, col = this.col;
    for (let i = 0; i < N; i++) {
      if (!this.alive[i]) continue;
      const life = (this.life[i] += dt), max = this.max[i];
      if (life >= max) { this.alive[i] = 0; continue; }
      const j = i * 3, k = life / max, kind = this.kind[i], size = this.size[i];
      v[j + 1] -= this.grav[i] * dt;
      p[j] += v[j] * dt; p[j + 1] += v[j + 1] * dt; p[j + 2] += v[j + 2] * dt;
      if (kind === K_CUBE) {
        const floor = size * 0.5;
        if (p[j + 1] < floor) { p[j + 1] = floor; v[j + 1] = Math.abs(v[j + 1]) * 0.35; v[j] *= 0.6; v[j + 2] *= 0.6; }
        const s = size * (k > 0.65 ? (1 - k) / 0.35 : 1);
        const r = life * this.spin[i];
        _c.setRGB(col[j], col[j + 1], col[j + 2]);
        this.cubes.push(p[j], p[j + 1], p[j + 2], s, s, s, r, r * 0.7, 0, _c);
      } else if (kind === K_GLOW) {
        const f = 1 - k;
        _c.setRGB(col[j] * f, col[j + 1] * f, col[j + 2] * f);
        // spin flag = 1 means a flash that grows instead of a spark that shrinks
        const s = this.spin[i] === 1 ? size * (0.5 + 0.7 * k) : size * (1 - 0.5 * k);
        if (p[j + 1] < 0.03 && this.grav[i] > 0) { p[j + 1] = 0.03; v[j + 1] = 0; }
        this.glows.push(p[j], p[j + 1], p[j + 2], s, s, s, 0, 0, 0, _c);
      } else if (kind === K_PUFF) {
        v[j] *= 1 - 2.5 * dt; v[j + 2] *= 1 - 2.5 * dt;
        const s = size * (k < 0.25 ? 0.5 + 2 * k : (1 - k) / 0.75);
        _c.setRGB(col[j], col[j + 1], col[j + 2]);
        this.puffs.push(p[j], p[j + 1], p[j + 2], s, s * 0.8, s, 0, 0, 0, _c);
      } else {
        const s = size * (k > 0.8 ? (1 - k) / 0.2 : 1);
        this.coins.push(p[j], p[j + 1], p[j + 2], s, s, s, life * this.spin[i], 0, 0);
      }
    }
    this.cubes.end(); this.glows.end(); this.puffs.end(); this.coins.end();

    this.ringPool.begin();
    const R = this.rings;
    for (let i = 0; i < RN; i++) {
      if (!this.ringOn[i]) continue;
      const j = i * 10;
      R[j + 5] += dt;
      const k = R[j + 5] / R[j + 6];
      if (k >= 1) { this.ringOn[i] = 0; continue; }
      const e = 1 - (1 - k) * (1 - k);
      const r = R[j + 3] + (R[j + 4] - R[j + 3]) * e, f = 1 - k;
      _c.setRGB(R[j + 7] * f, R[j + 8] * f, R[j + 9] * f);
      this.ringPool.push(R[j], R[j + 1], R[j + 2], r, 1, r, 0, 0, 0, _c);
    }
    this.ringPool.end();
  }
}
