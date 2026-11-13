// View of chapters 6–10: new enemies' extras, map changes, chapter moods 6–10, hybrids' shots,
// the secret moments and the finale (Hugo, the bench, the golden beam). Mixed into View (this = View).
import * as THREE from '../../vendor/three.module.min.js';
import { W, H, idx, inBounds } from '../sim/grid.js';
import { MAP_EVENTS } from '../data/map.js';
import { C } from './palette.js';
import { Pool, Builder, additive, seeded } from './geo.js';
import { wx, wz } from './island.js';
import { K_PUFF, K_GLOW, K_CUBE } from './fx.js';
import { makeKnot, LH } from './models.js';
import { makeHugo, makeBench } from './models2.js';

const _c = new THREE.Color();
const _c2 = new THREE.Color();
const HOLES = MAP_EVENTS.filter((e) => e.kind === 'holes').flatMap((e) => e.cells);
const RES = { strela: 0xF28C38, vybuch: 0xE8604C, mraz: 0x8FE3FF, blesk: 0xFFE07A, knot: C.amber, svetlo: 0xFFF0C0 };

export const lateView = {
  buildLate(s, EM) {
    this.offTint = new THREE.Color(0.42, 0.45, 0.55);
    this.capPool = new Pool(s, EM.cap, this.matFlat, 8, { color: true, shadow: true });
    this.letterPool = new Pool(s, EM.letter, this.matFlat, 8, { color: true });
    this.moundPool = new Pool(s, EM.mound, this.matFlat, 8, { color: true, shadow: true });
    this.jamRing = new Pool(s, new THREE.RingGeometry(0.94, 1, 48).rotateX(-Math.PI / 2), additive(0x8FD0FF, 0.5), 24, { color: true, order: 3 });
    // heart of the mist: a swirl of mist blobs with a warm light inside
    const mist = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false, emissive: 0x334466 });
    this.heartBlob = new Pool(s, EM.cloud, mist, 60, { color: true, order: 5 });
    this.heartCore = new Pool(s, new THREE.IcosahedronGeometry(1, 2), additive(0xFFC870, 0.5), 6, { color: true, order: 6 });
    this.railPool = new Pool(s, new THREE.BoxGeometry(1, 0.06, 0.06).translate(0.5, 0, 0), additive(0xFFF2C8, 1), 30, { color: true, order: 7 });
    this.rails = [];
    // items on the map: the siege tower's wreck, the memory chip, a letter
    this.itemWreck = new Pool(s, EM.siege, this.matFlat, 2, { color: true, shadow: true });
    const chip = new Builder();
    chip.box(0.3, 0.04, 0.22, 0x2E6B3A, { shade: 1 });
    for (let i = 0; i < 4; i++) chip.box(0.02, 0.03, 0.06, C.gold, { x: -0.1 + i * 0.065, y: 0.0, z: 0.13, shade: 1 });
    chip.box(0.12, 0.05, 0.08, 0x1D1826, { y: 0.02, shade: 1 });
    this.itemChip = new Pool(s, chip.build(), this.matFlat, 2, { color: true });
    this.itemLetter = new Pool(s, EM.letter, this.matFlat, 2, { color: true });
    this.itemGlow = new Pool(s, new THREE.RingGeometry(0.34, 0.42, 24).rotateX(-Math.PI / 2), additive(C.gold, 0.7), 6, { color: true, order: 4 });
    // three dashes and a dot above the lighthouse (the last hint of the finale)
    this.morse = new Pool(s, new THREE.BoxGeometry(1, 0.12, 0.12), additive(C.gold, 0.9), 4, { color: true, order: 9 });
    // night sky: stars and a moon
    const sg = new THREE.BufferGeometry();
    const sp = [], rnd = seeded(99);
    for (let i = 0; i < 260; i++) { const a = rnd() * Math.PI * 2, e = 0.12 + rnd() * 1.2, r = 160; sp.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r); }
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xFFFFFF, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    this.stars.renderOrder = -9;
    s.add(this.stars);
    this.moon = new THREE.Mesh(new THREE.SphereGeometry(6, 16, 12), new THREE.MeshBasicMaterial({ color: 0xF2F0E0, fog: false, transparent: true, opacity: 0 }));
    this.moon.position.set(-60, 70, -120);
    this.moon.renderOrder = -8;
    s.add(this.moon);
    // pairs of yellow eyes in the mist around the island, rain streaks
    this.mistEyes = new Pool(s, new THREE.SphereGeometry(0.09, 6, 4), new THREE.MeshBasicMaterial({ color: 0xFFE14A, fog: false }), 140);
    this.eyeSpots = [];
    const er = seeded(321);
    for (let i = 0; i < 60; i++) { const a = er() * Math.PI * 2, r = 12.5 + er() * 7; this.eyeSpots.push({ x: Math.cos(a) * r, z: Math.sin(a) * r * 0.9 + 1, y: -0.6 + er() * 1.2, ph: er() * 50, sp: 0.2 + er() * 0.5 }); }
    this.rain = new Pool(s, new THREE.BoxGeometry(0.02, 0.7, 0.02), new THREE.MeshBasicMaterial({ color: 0xBFD0E8, transparent: true, opacity: 0.35, depthWrite: false }), 220, { order: 6 });
    this.rainDrops = [];
    const rr = seeded(77);
    for (let i = 0; i < 220; i++) this.rainDrops.push({ x: (rr() - 0.5) * 26, z: (rr() - 0.5) * 26, y: rr() * 12 });
    this.flashT = 0; this.flashNext = 5;
    this.butterflies = [];
    // the dark Knot (P-61), Hugo, the bench with the cat
    this.DK = makeKnot();
    const dm = new THREE.MeshLambertMaterial({ color: 0x2A2338, emissive: 0x150F22, flatShading: true });
    this.DK.root.traverse((o) => { if (o.isMesh && o.material.isMeshLambertMaterial) o.material = dm; });
    this.DK.glowMat.color.setHex(0xB07AFF);
    this.DK.aura.material = additive(0x8A5FB0, 0.25); this.DK.auraFill.visible = false;
    this.DK.root.visible = false;
    s.add(this.DK.root);
    this.HG = makeHugo();
    this.HG.root.visible = false;
    s.add(this.HG.root);
    this.silMat = new THREE.MeshBasicMaterial({ color: 0x1A1E30, transparent: true, opacity: 0 });
    this.BN = makeBench();
    this.BN.group.visible = false;
    s.add(this.BN.group);
  },

  // ---------- enemies ----------

  resColor(e, T, out) {
    const r = e.res || [];
    if (!r.length) return out.setHex(0x9A7FC0);
    if (r.length === 1) return out.setHex(RES[r[0]] || 0x9A7FC0);
    const k = (T * 0.8 + e.seed * 7) % r.length, i = Math.floor(k), f = k - i;
    return out.setHex(RES[r[i]] || 0x9A7FC0).lerp(_c2.setHex(RES[r[(i + 1) % r.length]] || 0x9A7FC0), f);
  },

  lateEnemiesBegin() {
    this.capPool.begin(); this.letterPool.begin(); this.moundPool.begin(); this.jamRing.begin(); this.heartBlob.begin(); this.heartCore.begin();
  },
  lateEnemiesEnd() {
    this.capPool.end(); this.letterPool.end(); this.moundPool.end(); this.jamRing.end(); this.heartBlob.end(); this.heartCore.end();
  },

  lateEnemyExtras(e, look, X, base, Z, d, sy, ang, T, dt, many) {
    const g = this.game;
    if (look.kind === 'jammer' || look.kind === 'siege') {
      const jr = e.type === 'rusicka' ? 2 : e.type === 'oblehaci_vez' ? 3 : 2;
      const on = e.type === 'rusicka' || e.hp / e.mhp > 0.5;
      if (on && !e.frozen) {
        _c.setHex(0x8FD0FF).multiplyScalar(0.35 + 0.2 * Math.sin(T * 6 + e.seed * 9));
        this.jamRing.push(X, 0.06, Z, jr, 1, jr, T * 0.7, 0, 0, _c);
        if (!this.fast && !many && Math.random() < dt * 8) { const a = Math.random() * 6.28; this.fx.spawn(K_GLOW, X + Math.cos(a) * d * 0.7, base + d * 0.6, Z + Math.sin(a) * d * 0.7, -Math.sin(a) * 0.8, 0.1, Math.cos(a) * 0.8, 0.5, 0.04, 0x8FD0FF, 0, 0); }
      }
    }
    if (look.kind === 'sack' && !this.fast && !many && Math.random() < dt * 3) this.fx.spawn(K_CUBE, X + (Math.random() - 0.5) * d * 0.5, base + d * 0.7, Z + (Math.random() - 0.5) * d * 0.5, 0, 0.3, 0, 0.3, 0.04, 0x2A2338, 0, 0);
    if (look.kind === 'mole' && !this.fast && !many && Math.random() < dt * 5) this.fx.spawn(K_PUFF, X - Math.cos(ang) * d * 0.4, base + 0.05, Z - Math.sin(ang) * d * 0.4, 0, 0.15, 0, 0.4, 0.09, C.soil, 0, 0);
    if (look.kind === 'ballista' && e.slingT !== undefined && e.slingT > 4.5) {
      _c.setHex(0xFFE9A0).multiplyScalar(0.5 + 0.5 * Math.sin(T * 20));
      this.heartCore.push(X + Math.cos(ang) * d * 0.55, base + d * 0.74, Z + Math.sin(ang) * d * 0.55, 0.08, 0.08, 0.08, 0, 0, 0, _c);
    }
  },

  // Enemies that are not drawn the usual way: the heart of the mist, worms under the ground.
  drawSpecialEnemy(e, look, alpha, T, dt) {
    const x = e.px + (e.x - e.px) * alpha, y = e.py + (e.y - e.py) * alpha;
    const X = wx(x), Z = wz(y);
    const gy = Math.max(0, this.island.topAt(Math.floor(e.x), Math.floor(e.y)));
    if (e.under) {
      const wob = 1 + 0.08 * Math.sin(T * 9 + e.seed * 5);
      _c.setRGB(1, 1, 1);
      this.moundPool.push(X, gy, Z, look.r * 1.6 * wob, look.r * 1.4, look.r * 1.6 * wob, T * 0.5, 0, 0, _c);
      if (!this.fast && Math.random() < dt * 10) this.fx.spawn(K_CUBE, X + (Math.random() - 0.5) * look.r, gy + 0.1, Z + (Math.random() - 0.5) * look.r, (Math.random() - 0.5), 1.5, (Math.random() - 0.5), 0.5, 0.06, C.soil, 6, 3);
      return;
    }
    // heart of the mist
    const fin = this.game.s.fin;
    const calm = !!e.calm;
    const prog = calm && fin ? fin.prog : 0;
    const r = look.r * (calm ? 1 - prog * 0.65 : 1);
    const n = calm ? 10 : e.type === 'srdicko' ? 8 : 14;
    const op = calm ? 1 - prog * 0.85 : 1;
    for (let i = 0; i < n; i++) {
      const a = T * (0.6 + (i % 3) * 0.25) * (i % 2 ? -1 : 1) + i * 2.4;
      const rr = r * (0.25 + 0.55 * ((i * 0.37) % 1));
      const s = r * (0.55 + 0.35 * ((i * 0.61) % 1));
      _c.setHex(0xDDE6F5).multiplyScalar(0.75 + 0.25 * Math.sin(T + i));
      _c.multiplyScalar(op);
      this.heartBlob.push(X + Math.cos(a) * rr, gy + r * (0.35 + 0.5 * ((i * 0.53) % 1)), Z + Math.sin(a) * rr * 0.9, s, s * 0.8, s, a, 0, 0, _c);
    }
    _c.setHex(0xFFC870).multiplyScalar((calm ? 0.3 + 0.4 * prog : 0.45) * (0.8 + 0.2 * Math.sin(T * 2.3)));
    this.heartCore.push(X, gy + r * 0.7, Z, r * 0.45, r * 0.45, r * 0.45, 0, 0, 0, _c);
    if (!this.fast && Math.random() < dt * 14) { const a = Math.random() * 6.28; this.fx.spawn(K_PUFF, X + Math.cos(a) * r, gy + Math.random() * r, Z + Math.sin(a) * r, -Math.sin(a) * 0.6, 0.15, Math.cos(a) * 0.6, 1.4, 0.3 * r, 0xC9D6F0, 0, 0); }
    if (e.boss || e.type === 'srdicko') this.shadows.push(X, gy + 0.025, Z, r * 2, 1, r * 2);
  },

  // ---------- characters: dark Knot, Hugo, the bench ----------

  drawLateCharacters(alpha, T, dt, ui) {
    const g = this.game, s = g.s;
    // dark Knot
    const d = s.dark;
    this.DK.root.visible = !!d && !this.title;
    if (d) {
      const x = d.px + (d.x - d.px) * alpha, y = d.py + (d.y - d.py) * alpha;
      this.DK.root.position.set(wx(x), Math.max(0, this.island.topAt(Math.floor(d.x), Math.floor(d.y))), wz(y));
      this.DK.rig.rotation.y = -d.face + Math.PI / 2;
      const moving = Math.abs(d.x - d.px) + Math.abs(d.y - d.py) > 1e-4;
      this.DK.rig.rotation.z = moving ? Math.sin(T * 11) * 0.13 : 0;
      const sw = d.swing > 0 ? Math.sin(Math.min(1, d.swing / 0.3) * Math.PI) : 0;
      this.DK.armR.rotation.x = sw > 0 ? -0.9 + sw * 2.6 : moving ? -0.35 : 0;
      this.DK.wrench.rotation.x = moving ? -0.75 : -0.12;
      this.DK.glowMat.color.setHex(0xB07AFF).multiplyScalar(0.8 + 0.3 * Math.sin(T * 5));
      this.DK.aura.material.opacity = 0.18 + 0.08 * Math.sin(T * 3);
      if (!this.fast && Math.random() < dt * 6) this.fx.spawn(K_PUFF, wx(x) + (Math.random() - 0.5) * 0.4, 0.3, wz(y) + (Math.random() - 0.5) * 0.4, 0, 0.4, 0, 0.8, 0.12, 0x3A2C4A, 0, 0);
    }
    // Hugo
    const HG = this.HG, fin = s.fin;
    let show = false, sit = false;
    const bench = { x: this.lhX + 1.25, z: this.lhZ + 0.62 };
    const benchOn = this.epilogue || this.titleDawn || (s.finished && !this.title);
    this.BN.group.visible = benchOn;
    if (benchOn) this.BN.group.position.set(bench.x, 0.06, bench.z);
    if (benchOn) this.BN.cat.rotation.y = Math.sin(T * 0.4) * 0.3;
    if (fin && fin.phase === 3 && !this.title) {
      const e = g.findEnemy(fin.heart);
      if (e) {
        show = true;
        const x = e.px + (e.x - e.px) * alpha, y = e.py + (e.y - e.py) * alpha;
        HG.root.position.set(wx(x), Math.max(0, this.island.topAt(Math.floor(e.x), Math.floor(e.y))), wz(y));
        HG.rig.rotation.y = -Math.atan2(e.vy || 1, e.vx || 0) + Math.PI / 2;
        this.hugoLook(Math.min(1, fin.prog * 1.6), false);
        HG.rig.position.y = Math.abs(Math.sin(T * 3)) * 0.02;
      }
    } else if (fin && fin.phase === 4 && fin.hugo && !this.title) {
      show = true;
      const H = fin.hugo;
      const x = H.px + (H.x - H.px) * alpha, y = H.py + (H.y - H.py) * alpha;
      HG.root.position.set(wx(x), Math.max(0, this.island.topAt(Math.floor(H.x), Math.floor(H.y))), wz(y));
      HG.rig.rotation.y = -H.face + Math.PI / 2;
      this.hugoLook(1, fin.after > 1.5);
      const moving = Math.abs(H.x - H.px) + Math.abs(H.y - H.py) > 1e-4;
      HG.rig.position.y = moving ? Math.abs(Math.sin(T * 7)) * 0.03 : 0;
      HG.rig.rotation.z = moving ? Math.sin(T * 7) * 0.05 : 0;
    } else if (benchOn) {
      show = true; sit = true;
      HG.root.position.set(bench.x + 0.08, 0.06, bench.z + 0.02);
      HG.rig.rotation.y = 0.15;
      HG.rig.rotation.z = 0;
      HG.rig.position.y = 0.14 + Math.sin(T * 1.3) * 0.004;
      this.hugoLook(1, true);
    }
    HG.root.visible = show;
    HG.legs.rotation.x = sit ? -1.3 : 0;
    HG.legs.position.y = sit ? 0.18 : 0;
    HG.legs.position.z = sit ? 0.12 : 0;
    // Knot sits on the bench in the epilogue and on the title screen after the end
    if ((this.epilogue || this.titleDawn) && this.K) {
      const K = this.K;
      K.root.visible = true;
      K.root.position.set(bench.x - 0.3, 0.3, bench.z + 0.02);
      K.rig.rotation.y = -0.1;
      K.rig.rotation.z = 0;
      K.rig.position.y = 0;
      K.legL.position.y = K.legR.position.y = 0.04;
      K.head.rotation.y = 0.5 + Math.sin(T * 0.5) * 0.1;
      K.aura.visible = K.auraFill.visible = false;
    }
  },

  // Hugo from a dark silhouette (0) to himself (1), the lantern lit or not.
  hugoLook(k, lit) {
    const HG = this.HG;
    if (HG.k !== k) {
      HG.k = k;
      const sil = k < 0.98;
      HG.root.traverse((o) => { if (o.isMesh && (o.material === HG.mat || o.material === this.silMat)) o.material = sil ? this.silMat : HG.mat; });
      this.silMat.opacity = 0.15 + 0.85 * k;
      this.silMat.color.setRGB(0.1 + 0.25 * k, 0.12 + 0.24 * k, 0.19 + 0.2 * k);
    }
    HG.lampMat.color.setHex(lit ? C.amber : 0x4A3320);
    HG.halo.material.opacity = lit ? 0.35 : 0;
  },

  // ---------- the lighthouse in the finale ----------

  // Returns a light level for the lamp (or null when nothing special happens).
  finaleLight(s, dt, T) {
    const f = s.fin;
    this.beamExtra = 0; this.beamBoost = 1; this.beamGold = false; this.lampMul = 1;
    if (this.signalFlash > 0) this.signalFlash -= dt;
    if (!f || this.title) return null;
    if (f.phase === 3) {
      this.beamBoost = 0;
      this.lampMul = this.signalFlash > 0 ? 1.3 : 0.02;
      return 1;
    }
    if (f.phase === 4) {
      const k = Math.min(1, f.after / 3);
      this.beamGold = true;
      this.beamBoost = 2.2;
      this.beamExtra = k * Math.PI * 2 * 1.5;
      return 1.3;
    }
    return null;
  },

  // ---------- events ----------

  lateEvent(e, fast, veryFast, T) {
    const fx = this.fx, g = this.game;
    switch (e.k) {
      case 'rail': this.rails.push({ x: e.x, y: e.y, x2: e.x2, y2: e.y2, t: 0 }); if (this.rails.length > 20) this.rails.shift(); { const a = this.anim(e.id); a.shot = T; } break;
      case 'sling': {
        fx.flash(wx(e.bx + 0.5), 0.8, wz(e.by + 0.5), 0.6, 0xFFE9A0, 0.3);
        fx.ring(wx(e.bx + 0.5), 0.1, wz(e.by + 0.5), 0.2, 0.9, 0.5, 0xFFE9A0);
        const n = 6;
        for (let i = 1; i <= n; i++) { const k = i / n; fx.spawn(K_GLOW, wx(e.x + (e.bx + 0.5 - e.x) * k), 0.6 + Math.sin(k * Math.PI) * 1.2, wz(e.y + (e.by + 0.5 - e.y) * k), 0, 0, 0, 0.25 + k * 0.2, 0.08, 0xFFE9A0, 0, 0); }
        break;
      }
      case 'hatch': fx.debris(wx(e.x), 0.3, wz(e.y), 0xF0E2B6, 8, 2, 0.07); fx.dust(wx(e.x), 0.05, wz(e.y), 4, 0xE9DCC2, 0.4, 0.15); break;
      case 'burst': fx.debris(wx(e.x), 0.4, wz(e.y), 0x9C7A55, 10, 2.5, 0.09); fx.dust(wx(e.x), 0.1, wz(e.y), 6, 0xB8956A, 0.5, 0.22); break;
      case 'vanish': fx.dust(wx(e.x), 0.1, wz(e.y), 6, C.soil, 0.4, 0.2); if (e.golden) fx.sparks(wx(e.x), 0.4, wz(e.y), C.gold, 5, 1.5, 0.05, 0.4); break;
      case 'dive': fx.debris(wx(e.x), 0.3, wz(e.y), C.soil, 10, 2.2, 0.1); fx.dust(wx(e.x), 0.1, wz(e.y), 8, C.soil, 0.6, 0.28); this.shake(0.08); break;
      case 'emerge': fx.debris(wx(e.x), 0.3, wz(e.y), C.soil, 14, 3, 0.12); fx.dust(wx(e.x), 0.1, wz(e.y), 10, C.soil, 0.7, 0.3); fx.ring(wx(e.x), 0.08, wz(e.y), 0.3, 1.4, 0.6, 0xFF8A3A); this.shake(0.12); break;
      case 'adapt': fx.ring(wx(e.x), 0.1, wz(e.y), 0.3, 1.3, 0.6, RES[e.res] || 0xFFFFFF); fx.sparks(wx(e.x), 0.8, wz(e.y), RES[e.res] || 0xFFFFFF, 8, 2, 0.05, 0.4); break;
      case 'overload': fx.ring(wx(e.x), 0.08, wz(e.y), 0.4, e.r, 0.6, C.amber); fx.ring(wx(e.x), 0.1, wz(e.y), 0.2, e.r * 0.8, 0.5, 0xFFFFFF); fx.sparks(wx(e.x), 0.5, wz(e.y), C.gold, 16, 3, 0.06, 0.5); break;
      case 'mapEvent':
        if (e.kind === 'collapse' || e.kind === 'holes') {
          for (const [x, y] of e.cells) { fx.debris(wx(x + 0.5), 0.6, wz(y + 0.5), e.kind === 'holes' ? C.soil : 0xA9ABB3, 16, 3.2, 0.16); fx.dust(wx(x + 0.5), 0.1, wz(y + 0.5), 12, 0xC8C2B8, 1.0, 0.35); }
          this.shake(0.3);
          this.island.syncRocks();
        }
        break;
      case 'item': fx.ring(wx(e.x), 0.08, wz(e.y), 0.2, 1.0, 0.7, C.gold); break;
      case 'pickItem': fx.sparks(wx(e.x), 0.4, wz(e.y), C.gold, 12, 2, 0.05, 0.6); break;
      case 'signalBlink': this.signalFlash = e.long ? 0.5 : 0.2; fx.flash(this.lhX, LH.lamp, this.lhZ, e.long ? 1.6 : 1.0, C.gold, e.long ? 0.5 : 0.22); break;
      case 'darkHit': fx.sparks(wx(e.x), 0.4, wz(e.y), 0xB07AFF, 5, 2.2, 0.06, 0.3); break;
      case 'wormHit': this.shake(0.05); break;
      case 'steal': if (e.bank) { const a = this.anim(g.buildingAt(e.mx, e.my)?.id || 0); a.bank = T; } break;
      case 'waveEnd': for (const b of g.s.buildings) if (b.type === 'bank' && !b.wreck) { this.anim(b.id).bank = T; fx.coinPop(wx(b.x + 0.5), this.island.topAt(b.x, b.y) + 0.8, wz(b.y + 0.5), 3); } break;
    }
  },

  lateSecret(e) {
    const fx = this.fx;
    switch (e.code) {
      case 'P-46': {
        // the little ones of the queen turn into butterflies and fly away
        const cols = [0xFFFFFF, C.amber, C.coral, 0xFFE9A8, 0xBFEFFF, 0xD8FF7A];
        for (const [x, y] of e.pts.slice(0, 80)) this.butterflies.push({ x: wx(x), y: 0.3, z: wz(y), vx: (Math.random() - 0.5) * 0.6, vz: (Math.random() - 0.5) * 0.6, vy: 0.5 + Math.random() * 0.6, ph: Math.random() * 6, t: 0, life: 5 + Math.random() * 3, c: cols[Math.floor(Math.random() * cols.length)] });
        fx.ring(wx(e.x), 0.1, wz(e.y), 0.5, 3, 1.2, 0xFFE9A8);
        break;
      }
      case 'P-60':
        if (e.what === 'pond') { for (let i = 0; i < 3; i++) fx.ring(wx(e.x), -0.05, wz(e.y), 0.2 + i * 0.3, 2 + i, 1 + i * 0.3, 0x5FA9B5); fx.debris(wx(e.x), 0.2, wz(e.y), 0x9ADFE3, 16, 3, 0.1); this.shake(0.25); }
        if (e.what === 'swallow') { fx.dust(wx(e.x), 0.2, wz(e.y), 10, C.soil, 0.6, 0.3); this.shake(0.2); }
        if (e.what === 'spat') { fx.dust(wx(e.x), 0.2, wz(e.y), 10, 0xC79A94, 0.6, 0.25); fx.sparks(wx(e.x), 0.4, wz(e.y), C.amber, 10, 2.5, 0.06, 0.5); }
        break;
      case 'P-61':
        if (e.what === 'spawn') { fx.dust(wx(e.x), 0.2, wz(e.y), 14, 0x3A2C4A, 0.8, 0.3); fx.ring(wx(e.x), 0.08, wz(e.y), 0.3, 1.5, 0.7, 0xB07AFF); }
        else { fx.dust(wx(e.x), 0.2, wz(e.y), 10, 0x3A2C4A, 0.6, 0.25); fx.sparks(wx(e.x), 0.3, wz(e.y), 0x9DFF7A, 8, 1.6, 0.05, 0.5); }
        break;
      case 'P-63': if (e.what === 'arrived') { fx.sparks(this.lhX, 0.6, this.lhZ + 1, C.gold, 12, 1.5, 0.05, 0.7); } break;
      case 'P-57': {
        const sx = this.lhX + 1.25, sz = this.lhZ + 0.6, tx = wx(e.x), tz = wz(e.y);
        for (let i = 1; i <= 8; i++) { const k = i / 8; fx.spawn(K_GLOW, sx + (tx - sx) * k, 0.6 + Math.sin(k * Math.PI) * 2, sz + (tz - sz) * k, 0, 0, 0, 0.2 + k * 0.25, 0.06, C.brass, 0, 0); }
        fx.sparks(tx, 0.5, tz, C.gold, 10, 2.5, 0.06, 0.4);
        break;
      }
      case 'FIN':
        if (e.what === 'split') { fx.ring(wx(e.x), 0.1, wz(e.y), 0.5, 4, 1.2, 0xDDE6F5); fx.dust(wx(e.x), 0.3, wz(e.y), 20, 0xC9D6F0, 1.5, 0.5); this.shake(0.2); }
        if (e.what === 'calm') { fx.ring(wx(e.x), 0.1, wz(e.y), 4, 0.3, 2, 0xDDE6F5); this.focusOn(e.x, e.y, 14, 3); }
        if (e.what === 'signal') {
          for (const [x, y] of e.lights) for (let k = 0; k < 2; k++) fx.spawn(K_GLOW, wx(x) + (Math.random() - 0.5) * 0.3, 0.4, wz(y) + (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, 0.6 + Math.random() * 0.8, (Math.random() - 0.5) * 0.3, 4 + Math.random() * 2, 0.07, k ? 0xFFF2A8 : C.gold, 0, 0);
          this.fireflyT = 8;
          this.focusOn(e.x, e.y, 13, 6);
        }
        break;
    }
  },

  // ---------- overlays: holes to come, items, the morse hint ----------

  lateOverlays(ui, T) {
    const g = this.game, s = g.s;
    // the wave preview shows where the holes will open
    if (!this.title && !this.island.holesOpen && s.nextWave >= 71 && s.nextWave <= 72 && HOLES.length) {
      _c.setHex(C.coral).multiplyScalar(0.6 + 0.4 * Math.sin(T * 4));
      for (const [x, y] of HOLES) { this.markers.push(wx(x + 0.5), 0.08, wz(y + 0.5), 1.1, 1, 1.1, 0, 0, 0, _c); this.markers.push(wx(x + 0.5), 0.08, wz(y + 0.5), 0.6, 1, 0.6, 0, 0, 0, _c); }
    }
    this.itemWreck.begin(); this.itemChip.begin(); this.itemLetter.begin(); this.itemGlow.begin(); this.morse.begin();
    for (const it of s.items) {
      const X = wx(it.x), Z = wz(it.y);
      _c.setHex(C.gold).multiplyScalar(0.6 + 0.4 * Math.sin(T * 4 + it.id));
      this.itemGlow.push(X, 0.07, Z, 1.6, 1, 1.6, T, 0, 0, _c);
      if (it.kind === 'wreck') { _c.setRGB(0.75, 0.7, 0.65); this.itemWreck.push(X, 0, Z, 1.6, 1.6, 1.6, 0.6, 0.15, 1.2, _c); }
      if (it.kind === 'chip') this.itemChip.push(X, 0.08 + Math.sin(T * 3) * 0.04, Z, 1.2, 1.2, 1.2, T * 0.8, 0, 0);
      if (it.kind === 'letter') this.itemLetter.push(X, 0.06, Z, 0.6, 0.6, 0.6, 0.4, 0, 0);
      if (!this.fast && Math.random() < 0.06) this.fx.spawn(K_GLOW, X + (Math.random() - 0.5) * 0.6, 0.3, Z + (Math.random() - 0.5) * 0.6, 0, 0.4, 0, 0.8, 0.05, C.gold, 0, 0);
    }
    const f = s.fin;
    if (f && f.phase === 3 && f.morse && !this.title) {
      const y = LH.top + 0.9, k = 0.6 + 0.4 * Math.sin(T * 3);
      _c.setHex(C.gold).multiplyScalar(k);
      const xs = [-0.95, -0.35, 0.25];
      for (const x of xs) this.morse.push(this.lhX + x, y, this.lhZ, 0.42, 1, 1, 0, 0, 0, _c);
      this.morse.push(this.lhX + 0.68, y, this.lhZ, 0.12, 1, 1, 0, 0, 0, _c);
    }
    this.itemWreck.end(); this.itemChip.end(); this.itemLetter.end(); this.itemGlow.end(); this.morse.end();
  },

  drawRails(T, dt) {
    this.railPool.begin();
    for (let i = this.rails.length - 1; i >= 0; i--) {
      const r = this.rails[i];
      r.t += dt;
      if (r.t > 0.18) { this.rails.splice(i, 1); continue; }
      const k = 1 - r.t / 0.18;
      const X = wx(r.x), Z = wz(r.y), X2 = wx(r.x2), Z2 = wz(r.y2);
      _c.setHex(0xFFF2C8).multiplyScalar(0.5 + k);
      this.railPool.push(X, 0.75, Z, Math.hypot(X2 - X, Z2 - Z), 1 + k * 2, 1 + k * 2, -Math.atan2(Z2 - Z, X2 - X), 0, 0, _c);
    }
    this.railPool.end();
  },

  // ---------- chapter moods 6–10 ----------

  lateAmbient(T, dt, ch, low) {
    const g = this.game, fx = this.fx, isl = this.island;
    const night = ch >= 6 && !this.titleDawn && !this.epilogue;
    // stars and moon in the night chapters (6, 8, 10); a stormy sky in 7 hides them
    const starOn = night && ch !== 7 && ch !== 9 ? 1 : 0;
    this.stars.material.opacity += (starOn * (ch === 10 ? 0.5 : 0.85) - this.stars.material.opacity) * Math.min(1, dt * 2);
    this.stars.visible = this.stars.material.opacity > 0.02;
    this.moon.material.opacity += ((night && ch === 6 ? 0.95 : 0) - this.moon.material.opacity) * Math.min(1, dt * 2);
    this.moon.visible = this.moon.material.opacity > 0.02;
    // chapter 6: thousands of small yellow eyes in the mist around the island
    this.mistEyes.begin();
    if (night && (ch === 6 || ch === 10) && !low) {
      for (const p of this.eyeSpots) {
        const open = Math.sin(T * p.sp + p.ph) > (ch === 10 ? 0.6 : 0.2);
        if (!open) continue;
        const blink = ((T + p.ph) % 4.3) < 0.12;
        if (blink) continue;
        const dx = Math.sin(p.ph) * 0.12;
        this.mistEyes.push(p.x - dx, p.y, p.z, 1, 1, 1);
        this.mistEyes.push(p.x + dx + 0.18, p.y, p.z, 1, 1, 1);
      }
    }
    this.mistEyes.end();
    // chapter 7: rain and lightning flashes over everything
    this.rain.begin();
    if (ch === 7 && !this.title) {
      const n = low ? 70 : this.rainDrops.length;
      for (let i = 0; i < n; i++) {
        const d = this.rainDrops[i];
        d.y -= dt * 14;
        if (d.y < 0) { d.y += 12; if (Math.random() < 0.15) fx.ring(d.x, 0.05, d.z, 0.02, 0.15, 0.3, 0x8FA6C8); }
        this.rain.push(d.x + this.cam.tx * 0.6, d.y, d.z + this.cam.tz * 0.6, 1, 1, 1, 0, 0.18, 0);
      }
      this.flashNext -= dt;
      if (this.flashNext <= 0) { this.flashNext = 6 + Math.random() * 9; this.flashT = 0.35; }
    }
    this.rain.end();
    if (this.flashT > 0) {
      this.flashT -= dt;
      const k = Math.max(0, this.flashT / 0.35) * (Math.sin(this.flashT * 60) > -0.3 ? 1 : 0.3);
      this.hemi.intensity = this.mood.cur.hemiI + k * 1.6;
      if (this.flashT <= 0) this.hemi.intensity = this.mood.cur.hemiI;
    }
    // chapter 8: cracks and holes glow, embers rise from them
    if (ch === 8 && !this.title) {
      this.ember = (this.ember || 0) - dt;
      if (this.ember <= 0) {
        this.ember = low ? 0.25 : 0.1;
        const list = isl.holesOpen ? HOLES : [];
        const src = list.length && Math.random() < 0.6 ? list[Math.floor(Math.random() * list.length)] : isl.cracks.length ? [isl.cracks[0].x, isl.cracks[0].y] : null;
        if (src) fx.spawn(K_GLOW, wx(src[0] + 0.3 + Math.random() * 0.4), 0.1, wz(src[1] + 0.3 + Math.random() * 0.4), (Math.random() - 0.5) * 0.2, 0.6 + Math.random() * 0.5, (Math.random() - 0.5) * 0.2, 1.6, 0.05, Math.random() < 0.5 ? 0xFF6A2A : 0xFFB347, 0, 0);
        if (Math.random() < 0.3) { const x = Math.floor(Math.random() * W), y = Math.floor(Math.random() * (H - 1)); if (g.open[idx(x, y)] && isl.topAt(x, y) < 0.3) fx.spawn(K_GLOW, wx(x + Math.random()), 0.04, wz(y + Math.random()), 0, 0.05, 0, 1.2, 0.08, 0xFF6A2A, 0, 0); }
      }
    }
    // chapter 9: the colours of the world slowly shift
    if (ch === 9 && !this.title) {
      const hs = Math.sin(T * 0.12) * 0.06;
      this.hemi.color.copy(this.mood.cur.top).lerp(_c.setRGB(1, 1, 1), 0.25).offsetHSL(hs, 0, 0);
      this.sun.color.copy(this.mood.cur.sun).offsetHSL(-hs, 0, 0);
    }
    // chapter 10: only a few wisps of mist go round
    if (ch === 10 && !this.title && Math.random() < dt * (low ? 1 : 3)) {
      const a = Math.random() * 6.28, r = 8 + Math.random() * 3;
      fx.spawn(K_PUFF, Math.cos(a) * r, 0.2 + Math.random() * 0.5, Math.sin(a) * r, -Math.sin(a) * 0.4, 0.02, Math.cos(a) * 0.4, 4, 0.5, 0x2A3050, 0, 0);
    }
    // butterflies after the queen (P-46)
    for (let i = this.butterflies.length - 1; i >= 0; i--) {
      const b = this.butterflies[i];
      b.t += dt;
      if (b.t > b.life) { this.butterflies.splice(i, 1); continue; }
      b.x += (b.vx + Math.sin(T * 2 + b.ph) * 0.4) * dt; b.z += (b.vz + Math.cos(T * 1.7 + b.ph) * 0.4) * dt; b.y += b.vy * dt;
      const flap = Math.sin(T * 16 + b.ph);
      const yaw = Math.atan2(b.vz, b.vx);
      this.wings.push(b.x, b.y, b.z, 1, 1, 1, yaw + Math.PI / 2, 0, flap, b.c);
      this.wings.push(b.x, b.y, b.z, 1, 1, 1, yaw - Math.PI / 2, 0, flap, b.c);
    }
    // fireflies after the signal
    if (this.fireflyT > 0) {
      this.fireflyT -= dt;
      if (Math.random() < dt * 30) { const x = (Math.random() - 0.5) * 18, z = (Math.random() - 0.5) * 20; const cx = Math.floor(x + W / 2), cy = Math.floor(z + H / 2); if (inBounds(cx, cy)) fx.spawn(K_GLOW, x, 0.3 + Math.random(), z, (Math.random() - 0.5) * 0.3, 0.3, (Math.random() - 0.5) * 0.3, 3, 0.05, Math.random() < 0.5 ? 0xD8FF7A : 0xFFF08A, 0, 0); }
    }
  },
};
