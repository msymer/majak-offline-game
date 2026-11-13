// Three.js view of the game. Reads the simulation state, never changes it.
import * as THREE from '../../vendor/three.module.min.js';
import { W, H, idx, tileAt, inBounds } from '../sim/grid.js';
import { BUILDINGS, HYBRID_TYPES } from '../data/buildings.js';
import { LIGHTHOUSE } from '../data/map.js';
import { C, MOODS } from './palette.js';
import { Pool, Builder, lit, unlit, additive, seeded } from './geo.js';
import { Island, wx, wz } from './island.js';
import { Fx, K_PUFF, K_GLOW, K_CUBE } from './fx.js';
import { buildingModels, enemyModels, makeLighthouse, makeKnot, LH } from './models.js';
import { Post } from './post.js';
import { lateBuildingModels, lateEnemyModels, makeHugo, makeBench } from './models2.js';
import { lateView } from './late.js';
import { secretView } from '../secrets/view.js';

export { wx, wz };

const PITCH = 55 * Math.PI / 180;
const FOV = 28;
const _c = new THREE.Color();
const _c2 = new THREE.Color();
const _v = new THREE.Vector3();
const WHITE = new THREE.Color(1, 1, 1);
const ICE = new THREE.Color(C.ice);

const ENEMY_LOOK = {
  sliz: { r: 0.28, color: C.sliz, kind: 'blob', eye: 0.2 },
  smejdil: { r: 0.2, color: C.smejdil, kind: 'runner', eye: 0.22 },
  tlustoch: { r: 0.43, color: C.tlustoch, kind: 'blob', eye: 0.11, bubbles: true },
  velky_sliz: { r: 0.86, color: 0x24A98C, kind: 'blob', eye: 0.17, crown: true, bubbles: true },
  stredni_sliz: { r: 0.54, color: 0x2DB796, kind: 'blob', eye: 0.18 },
  maly_sliz: { r: 0.36, color: 0x38C4A2, kind: 'blob', eye: 0.2 },
  // chapters 2–5 (vc = the model has its own colours; c2 = colour of its pieces when it falls apart)
  plechac: { r: 0.3, kind: 'robot', vc: true, c2: C.plech, eye: 0.13, eyeH: 0.74, eyeF: 0.31, eye2: 0.62 },
  dron: { r: 0.25, kind: 'drone', vc: true, c2: 0x8BA3BA, eye: 0.17, eyeH: 0.28, eyeF: 0.26, one: true },
  sberac: { r: 0.3, kind: 'collector', vc: true, c2: C.plech, eye: 0.13, eyeH: 0.46, eyeF: 0.31, eye2: 0.7 },
  felcar: { r: 0.27, color: C.felcar, kind: 'blob', eye: 0.19, lantern: true },
  pulec: { r: 0.16, color: C.pulec, kind: 'runner', eye: 0.24 },
  bahnak: { r: 0.31, color: C.bahnak, kind: 'blob', eye: 0.16, wide: 1.25 },
  bourac: { r: 0.37, kind: 'demolisher', vc: true, c2: 0x7D8FA3, eye: 0.12, eyeH: 0.5, eyeF: 0.36, eye2: 0.7 },
  demolicni_koule: { r: 0.42, kind: 'ballbot', vc: true, c2: 0x6F7F93, eye: 0.12, eyeH: 0.5, eyeF: 0.36, eye2: 0.7 },
  mlzak: { r: 0.3, kind: 'cloud', color: 0xE6EEFA, eye: 0.13, eyeH: 0.5, eyeF: 0.3, glowEyes: true },
  maly_valec: { r: 0.46, kind: 'roller', vc: true, c2: 0x8D8F98, eye: 0.11, eyeH: 0.52, eyeF: 0.43 },
  valec: { r: 0.9, kind: 'roller', vc: true, c2: 0x8D8F98, eye: 0.1, eyeH: 0.52, eyeF: 0.43, crown: 0.98 },
  bahenni_dcera: { r: 0.5, color: 0x8E7462, kind: 'blob', eye: 0.15, bubbles: true },
  bahenni_matka: { r: 1.0, color: 0x7E6250, kind: 'blob', eye: 0.13, crown: 0.72, bubbles: true },
  beranek: { r: 0.46, kind: 'ram', vc: true, c2: C.woodLight, eye: 0.08, eyeH: 0.36, eyeF: 0.73 },
  beranidlo: { r: 0.95, kind: 'ram', vc: true, c2: C.woodLight, eye: 0.07, eyeH: 0.36, eyeF: 0.73, crown: 0.7 },
  straznik: { r: 0.42, kind: 'guard', vc: true, c2: 0x93A4C2, eye: 0.09, eyeH: 0.78, eyeF: 0.3, glowEyes: true },
  strazce_brany: { r: 0.85, kind: 'guard', vc: true, c2: 0x93A4C2, eye: 0.08, eyeH: 0.78, eyeF: 0.3, glowEyes: true, crown: 1.12 },
  // chapters 6–10
  rojik: { r: 0.15, kind: 'mite', vc: true, c2: 0x2A2338, eye: 0.24, eyeH: 0.55, eyeF: 0.34, yEyes: true },
  nosic: { r: 0.44, kind: 'sack', vc: true, c2: 0x9C7A55, eye: 0.11, eyeH: 0.62, eyeF: 0.38 },
  vejce: { r: 0.22, kind: 'egg', vc: true, c2: 0xF0E2B6, noEyes: true },
  princezna: { r: 0.42, kind: 'queen', vc: true, c2: 0x3A2C4A, eye: 0.13, eyeH: 0.5, eyeF: 0.36, yEyes: true },
  kralovna_roje: { r: 0.95, kind: 'queen', vc: true, c2: 0x3A2C4A, eye: 0.11, eyeH: 0.5, eyeF: 0.36, yEyes: true, crown: 0.95 },
  rusicka: { r: 0.32, kind: 'jammer', vc: true, c2: 0x5E7FA8, eye: 0.13, eyeH: 0.5, eyeF: 0.3 },
  balista: { r: 0.38, kind: 'ballista', vc: true, c2: C.woodLight, eye: 0.16, eyeH: 0.4, eyeF: 0.42, one: true },
  vuz: { r: 0.36, kind: 'wagon', vc: true, c2: C.woodLight, eye: 0.1, eyeH: 0.42, eyeF: 0.44 },
  mala_oblehaci_vez: { r: 0.55, kind: 'siege', vc: true, c2: C.woodLight, eye: 0.08, eyeH: 1.0, eyeF: 0.35 },
  oblehaci_vez: { r: 1.0, kind: 'siege', vc: true, c2: C.woodLight, eye: 0.07, eyeH: 1.0, eyeF: 0.35, crown: 1.62 },
  tunelar: { r: 0.3, kind: 'mole', vc: true, c2: C.plech, eye: 0.12, eyeH: 0.5, eyeF: 0.24 },
  krtek: { r: 0.3, kind: 'mole', vc: true, c2: 0x6B4A3A, eye: 0.12, eyeH: 0.5, eyeF: 0.24 },
  cervik: { r: 0.5, kind: 'worm', vc: true, c2: 0xC79A94, eye: 0.1, eyeH: 0.62, eyeF: 0.44 },
  hlubinny_cerv: { r: 1.0, kind: 'worm', vc: true, c2: 0xC79A94, eye: 0.08, eyeH: 0.62, eyeF: 0.44, crown: 0.95 },
  ucen: { r: 0.27, kind: 'apprentice', vc: true, c2: 0x8A5FB0, eye: 0.1, eyeH: 0.72, eyeF: 0.24, glowEyes: true, res: true },
  ucen_dron: { r: 0.27, kind: 'apprentice', vc: true, c2: 0x8A5FB0, eye: 0.1, eyeH: 0.72, eyeF: 0.24, glowEyes: true, res: true },
  tovarys: { r: 0.45, kind: 'master', vc: true, c2: 0x8A5FB0, eye: 0.08, eyeH: 0.84, eyeF: 0.24, glowEyes: true, res: true },
  mistr: { r: 0.9, kind: 'master', vc: true, c2: 0x8A5FB0, eye: 0.07, eyeH: 0.84, eyeF: 0.24, glowEyes: true, res: true, crown: 1.56 },
  posel: { r: 0.26, color: C.sliz, kind: 'blob', eye: 0.2, cap: true },
  srdce_mlhy: { r: 1.3, kind: 'heart', color: 0xDDE6F5, noEyes: true },
  srdicko: { r: 0.75, kind: 'heart', color: 0xDDE6F5, noEyes: true },
};
// Colour of a learner's cloak by what it resists.
export const RES_COLOR = { strela: 0xF28C38, vybuch: 0xE8604C, mraz: 0x8FE3FF, blesk: 0xFFE07A, knot: C.amber, none: 0x9A7FC0 };
export function enemyColor(type, golden) { const l = ENEMY_LOOK[type]; return golden ? C.golden : (l?.c2 ?? l?.color ?? C.sliz); }
const VC_KINDS = ['robot', 'collector', 'demolisher', 'ballbot', 'drone', 'roller', 'ram', 'guard', 'mite', 'sack', 'egg', 'queen', 'jammer', 'ballista', 'wagon', 'siege', 'mole', 'worm', 'apprentice', 'master'];

function lerpAngle(a, b, k) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * k;
}

// Material for everything that belongs to the player: in dark chapters it keeps a little of its own colour.
function warm(opts = {}) {
  const m = lit(opts);
  m.emissive = new THREE.Color(0, 0, 0);
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n#ifdef USE_COLOR\n totalEmissiveRadiance *= vColor.rgb;\n#endif');
  };
  return m;
}

export class View {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, stencil: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(MOODS[1].horizon);
    this.scene.fog = new THREE.Fog(MOODS[1].horizon, 30, 70);

    this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 260);
    this.cam = { tx: 0, tz: 4, d: 30, goal: null };

    this.hemi = new THREE.HemisphereLight(MOODS[1].top, MOODS[1].ground, 1.0);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(MOODS[1].sun, 2.4);
    this.sun.castShadow = true;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.03;
    this.sun.shadow.camera.near = 1; this.sun.shadow.camera.far = 90;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);
    this.sunDir = new THREE.Vector3(-0.6, 0.6, 0.5).normalize();

    this.time = 0;
    this.shakeT = 0;
    this.shakeA = 0;
    this.quality = 'medium';
    this.insets = { t: 0, b: 0, l: 0, r: 0 };
    this.fast = false;
    this.title = false;
    this.glowOn = true;
    this.dark = 0;
    this.vw = canvas.clientWidth || window.innerWidth;
    this.vh = canvas.clientHeight || window.innerHeight;
    this.banim = new Map();
    this.flyers = [];
    this.hpMap = new Map();
    this.flashMap = new Map();
    this.amb = { ripple: 0, smoke: 0, spring: 0, ore: 0, mud: 0, crack: 0 };
    this.knotYaw = 0; this.knotWalk = 0; this.knotJoy = 0; this.lampFlash = 0;

    this.matWarm = warm();
    this.matLit = lit();
    this.matSmooth = warm({ flatShading: false });
    this.matSmooth.emissive.setRGB(0.2, 0.2, 0.2);
    // Silhouettes of enemies and Knot seen through the lighthouse (the stencil marks the lighthouse's pixels).
    const xray = (color) => new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.6, depthFunc: THREE.GreaterDepth, depthWrite: false,
      stencilWrite: true, stencilFunc: THREE.EqualStencilFunc, stencilRef: 1,
      stencilFail: THREE.KeepStencilOp, stencilZFail: THREE.KeepStencilOp, stencilZPass: THREE.KeepStencilOp,
    });
    this.xrayCool = xray(0x8FF0DC);
    this.xrayWarm = xray(C.amber);
    this.lhFade = 1;

    this.buildSky();
    this.island = new Island(this.scene);
    this.buildLighthouse();
    this.buildDynamic();
    this.fx = new Fx(this.scene);
    this.mood = { from: this.moodValues(1), to: this.moodValues(1), t: 1, ch: 1, cur: this.moodValues(1) };
    this.applyMood(this.mood.cur);
    this.post = new Post(this.renderer);
  }

  // ---------- quality ----------

  setQuality(q) {
    this.quality = q;
    const dpr = window.devicePixelRatio || 1;
    const ratio = q === 'low' ? Math.min(dpr, 1.25) : q === 'medium' ? Math.min(dpr, 1.75) : Math.min(dpr, 2);
    this.renderer.setPixelRatio(ratio);
    const shadows = q !== 'low';
    this.renderer.shadowMap.enabled = shadows;
    this.sun.castShadow = shadows;
    const size = q === 'high' ? 2048 : 1024;
    if (this.sun.shadow.mapSize.x !== size) {
      this.sun.shadow.mapSize.set(size, size);
      if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
    }
    this.scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
    this.fx.setQuality(q);
    this.island.setQuality(q);
    this.glowOn = q !== 'low';
    this.post.setEnabled(q === 'high');
    this.resize();
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.vw = w; this.vh = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.post.resize(w, h, this.renderer.getPixelRatio());
    if (this.game) this.updateZoomLimits();
  }

  // ---------- sky and moods ----------

  buildSky() {
    const g = new THREE.SphereGeometry(200, 20, 12);
    const p = g.attributes.position;
    this.skyT = new Float32Array(p.count);
    for (let i = 0; i < p.count; i++) this.skyT[i] = Math.max(0, Math.min(1, p.getY(i) / 45));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(p.count * 3), 3));
    this.sky = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    this.sky.renderOrder = -10;
    this.scene.add(this.sky);
  }

  moodValues(ch) {
    const m = MOODS[ch] || MOODS[1];
    return {
      top: new THREE.Color(m.top), horizon: new THREE.Color(m.horizon), sun: new THREE.Color(m.sun), ground: new THREE.Color(m.ground), mist: new THREE.Color(m.mist),
      sunI: m.sunI, hemiI: m.hemiI, az: m.az, el: m.el, beam: m.beam, lamp: m.lamp, exposure: m.exposure,
    };
  }

  setMood(ch, instant = false) {
    if (!MOODS[ch]) ch = 1;
    if (ch === this.mood.ch && !instant) return;
    this.mood.ch = ch;
    this.mood.from = this.mood.cur;
    this.mood.to = this.moodValues(ch);
    this.mood.t = instant ? 1 : 0;
    this.mood.cur = this.moodValues(ch);
    if (instant) this.applyMood(this.mood.to);
  }

  stepMood(dt) {
    const M = this.mood;
    if (M.t >= 1) return;
    M.t = Math.min(1, M.t + dt / 5);
    const k = M.t * M.t * (3 - 2 * M.t), a = M.from, b = M.to, c = M.cur;
    for (const key of ['top', 'horizon', 'sun', 'ground', 'mist']) c[key].copy(a[key]).lerp(b[key], k);
    for (const key of ['sunI', 'hemiI', 'az', 'el', 'beam', 'lamp', 'exposure']) c[key] = a[key] + (b[key] - a[key]) * k;
    this.applyMood(c);
  }

  applyMood(m) {
    this.scene.background.copy(m.horizon);
    this.scene.fog.color.copy(m.horizon);
    this.hemi.color.copy(m.top).lerp(WHITE, 0.25);
    this.hemi.groundColor.copy(m.ground);
    this.hemi.intensity = m.hemiI;
    this.sun.color.copy(m.sun);
    this.sun.intensity = m.sunI;
    const az = m.az * Math.PI / 180, el = m.el * Math.PI / 180;
    this.sunDir.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    this.renderer.toneMappingExposure = m.exposure;
    this.island.setSeaColor(m.mist, m.horizon);
    const col = this.sky.geometry.attributes.color;
    for (let i = 0; i < this.skyT.length; i++) { _c.copy(m.horizon).lerp(m.top, this.skyT[i]); col.setXYZ(i, _c.r, _c.g, _c.b); }
    col.needsUpdate = true;
    // The darker the world, the more the player's things keep their own colour.
    const dark = Math.max(0, Math.min(1, (1.6 - m.sunI - m.hemiI * 0.6) / 1.4));
    this.dark = dark;
    const e = dark * 0.42;
    this.matWarm.emissive.setRGB(e, e * 0.93, e * 0.82);
    if (this.lh) this.lh.body.material.emissive.setRGB(e * 0.7, e * 0.65, e * 0.6);
    if (this.K) this.K.root.traverse((o) => { if (o.material && o.material.emissive && o.material.isMeshLambertMaterial) o.material.emissive.setRGB(e, e * 0.93, e * 0.82); });
  }

  // ---------- lighthouse ----------

  buildLighthouse() {
    const L = makeLighthouse();
    L.body.material = warm();
    Object.assign(L.body.material, { stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp });
    L.vane.material = warm();
    this.lh = L;
    this.lhX = wx(LIGHTHOUSE.x + 0.5); this.lhZ = wz(LIGHTHOUSE.y + 0.5);
    L.group.position.set(this.lhX, 0, this.lhZ);
    this.scene.add(L.group);
    this.beamSpot = new THREE.Mesh(new THREE.CircleGeometry(1, 28).rotateX(-Math.PI / 2), additive(0xFFF0C0, 0.2));
    this.beamSpot.renderOrder = 3;
    this.scene.add(this.beamSpot);
    // A real spot light follows the beam, so whatever it passes over lights up for a moment.
    this.spot = new THREE.SpotLight(0xFFE9B8, 1, 0, 0.26, 0.7, 0);
    this.spot.position.set(this.lhX, LH.lamp, this.lhZ);
    this.scene.add(this.spot);
    this.scene.add(this.spot.target);
  }

  // ---------- dynamic objects ----------

  buildDynamic() {
    const s = this.scene;
    const cap = 180;
    const BM = lateBuildingModels(buildingModels());
    this.BM = BM;
    const bp = (geo, o = {}) => new Pool(s, geo, o.mat || this.matWarm, o.cap || cap, { shadow: o.shadow ?? true, receive: true, color: true });
    const B = {};
    B.wall = bp(BM.wall.body);
    B.wallLink = bp(BM.wall.link, { cap: cap * 2, shadow: false });
    B.archerBody = bp(BM.archer.body); B.archerFloor = bp(BM.archer.floor, { cap: cap * 2 }); B.archerTop = bp(BM.archer.top);
    B.cannonBody = bp(BM.cannon.body); B.cannonFloor = bp(BM.cannon.floor, { cap: cap * 2 }); B.cannonTop = bp(BM.cannon.top, { shadow: false }); B.cannonBarrel = bp(BM.cannon.barrel);
    B.frostBody = bp(BM.frost.body); B.frostFloor = bp(BM.frost.floor, { cap: cap * 2 });
    const ice = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, emissive: 0x2A7F99 });
    B.frostCrystal = bp(BM.frost.crystal, { mat: ice }); B.frostShard = bp(BM.frost.shard, { mat: ice, cap: cap * 3, shadow: false });
    B.mineBody = bp(BM.mine.body); B.mineFloor = bp(BM.mine.floor, { cap: cap * 2 }); B.mineTop = bp(BM.mine.top); B.mineCart = bp(BM.mine.cart, { shadow: false });
    B.lightBody = bp(BM.lightning.body); B.lightFloor = bp(BM.lightning.floor, { cap: cap * 2 });
    B.lightBall = new Pool(s, BM.lightning.ball, new THREE.MeshBasicMaterial({ color: 0xFFE9A0 }), cap, { color: true });
    B.lightSmall = new Pool(s, BM.lightning.small, new THREE.MeshBasicMaterial({ color: 0xFFE9A0 }), cap * 3, { color: true });
    B.ampBody = bp(BM.amplifier.body);
    B.ampCore = new Pool(s, BM.amplifier.core, new THREE.MeshBasicMaterial({ color: C.amber }), 16, { color: true });
    B.trapBody = bp(BM.trap.body, { shadow: false }); B.trapSpikes = bp(BM.trap.spikes, { shadow: false });
    B.tpBody = bp(BM.teleport.body, { shadow: false });
    B.tpSpiral = new Pool(s, BM.teleport.spiral, additive(0xFFC870, 0.9), 8, { color: true, order: 4 });
    B.wreck = bp(BM.wreck.body);
    B.sniperTop = bp(BM.spec.sniper); B.gatlingTop = bp(BM.spec.gatling);
    B.barrelWide = bp(BM.spec.shrapnel); B.barrelHot = bp(BM.spec.incendiary);
    B.gem = new Pool(s, BM.gem, unlit(), cap, { color: true });
    B.crown = bp(BM.crown, { shadow: false });
    B.bankBody = bp(BM.bank.body, { cap: 4 }); B.bankCoin = new Pool(s, BM.bank.coin, this.matWarm, 4, { color: true });
    for (const t of HYBRID_TYPES) {
      B[t + 'Body'] = bp(BM[t].body, { cap: 60 });
      B[t + 'Floor'] = bp(BM[t].floor, { cap: 120 });
      if (BM[t].top) B[t + 'Top'] = bp(BM[t].top, { cap: 60 });
    }
    B.lv4 = new Pool(s, new THREE.RingGeometry(0.42, 0.5, 28).rotateX(-Math.PI / 2), additive(C.gold, 0.55), 60, { color: true, order: 3 });
    B.offMark = new Pool(s, new THREE.RingGeometry(0.3, 0.38, 6).rotateX(-Math.PI / 2), additive(0x8FD0FF, 0.7), 120, { color: true, order: 4 });
    this.B = B;

    // Ghost of a building that is about to be placed.
    this.ghostMat = new THREE.MeshBasicMaterial({ color: C.ok, transparent: true, opacity: 0.5, depthWrite: false });
    this.ghost = new THREE.Group();
    this.ghost.visible = false;
    this.ghost.renderOrder = 6;
    this.ghostType = null;
    s.add(this.ghost);

    // Enemies
    const EM = lateEnemyModels(enemyModels());
    const ecap = 520;
    this.blob = new Pool(s, EM.blob, this.matSmooth, ecap, { color: true, shadow: true });
    this.runner = new Pool(s, EM.runner, this.matSmooth, 300, { color: true, shadow: true });
    const share = (pool) => { const m = new THREE.InstancedMesh(pool.mesh.geometry, this.xrayCool, pool.cap); m.instanceMatrix = pool.mesh.instanceMatrix; m.frustumCulled = false; m.renderOrder = 20; m.count = 0; s.add(m); return m; };
    this.blobX = share(this.blob);
    this.runnerX = share(this.runner);
    // models with their own colours
    this.matFlat = warm();
    this.matFlat.emissive.setRGB(0.14, 0.14, 0.14);
    this.kindPools = {};
    for (const k of VC_KINDS) {
      const geo = { robot: EM.robot, collector: EM.collector, demolisher: EM.demolisher, ballbot: EM.ballbot, drone: EM.drone, roller: EM.roller, ram: EM.ram, guard: EM.guard,
        mite: EM.mite, sack: EM.sack, egg: EM.egg, queen: EM.queen, jammer: EM.jammer, ballista: EM.ballista, wagon: EM.wagon, siege: EM.siege, mole: EM.mole, worm: EM.worm, apprentice: EM.apprentice, master: EM.master }[k];
      const cap = k === 'mite' ? 420 : k === 'robot' ? 200 : k === 'apprentice' ? 160 : 120;
      this.kindPools[k] = new Pool(s, geo, k === 'apprentice' || k === 'master' ? this.matSmooth : this.matFlat, cap, { color: true, shadow: true });
    }
    this.rotor = new Pool(s, EM.rotor, this.matFlat, 120, { color: true });
    this.lantern = new Pool(s, EM.lantern, unlit(), 60, { color: true });
    const mistMat = (o) => new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: o, depthWrite: false, emissive: 0x334455 });
    this.cloudVis = new Pool(s, EM.cloud, mistMat(0.82), 120, { color: true, order: 2 });
    this.cloudHid = new Pool(s, EM.cloud, mistMat(0.13), 120, { color: true, order: 2 });
    this.healRing = new Pool(s, new THREE.RingGeometry(1.42, 1.5, 40).rotateX(-Math.PI / 2), additive(C.heal, 0.35), 40, { order: 3 });
    this.glowEyes = new Pool(s, EM.ball, new THREE.MeshBasicMaterial({ color: 0xCFF8FF }), 200);
    this.yEyes = new Pool(s, EM.ball, new THREE.MeshBasicMaterial({ color: 0xFFE14A }), 900);
    this.EM = EM;
    this.buildLate(s, EM);
    // burning ground, slime puddles, lightning bolts, the journal page
    this.puddles = new Pool(s, new THREE.CircleGeometry(0.6, 14).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x2E8F72, transparent: true, opacity: 0.45, depthWrite: false }), 120, { order: 1 });
    this.fireDisc = new Pool(s, new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2), additive(0xFF6A2A, 0.28), 60, { order: 2 });
    this.bolts = [];
    this.boltSeg = new Pool(s, new THREE.BoxGeometry(1, 0.05, 0.05).translate(0.5, 0, 0), additive(C.zap, 1), 600, { color: true, order: 7 });
    const pg = new Builder();
    pg.box(0.42, 0.01, 0.56, 0xFFFDF2, { shade: 1 });
    pg.box(0.3, 0.012, 0.02, 0x8F6449, { z: -0.12, shade: 1 }); pg.box(0.3, 0.012, 0.02, 0x8F6449, { z: -0.04, shade: 1 }); pg.box(0.22, 0.012, 0.02, 0x8F6449, { z: 0.04, shade: 1 });
    this.paper = new THREE.Mesh(pg.build(), unlit());
    this.paper.visible = false;
    s.add(this.paper);
    this.bubble = new Pool(s, EM.ball, new THREE.MeshLambertMaterial({ color: 0x8FE6D2 }), 120);
    this.crown = new Pool(s, EM.crown, this.matLit, 8, { shadow: true });
    this.eyes = new Pool(s, EM.ball, new THREE.MeshBasicMaterial({ color: 0xffffff }), ecap * 2);
    this.pupils = new Pool(s, EM.dot, new THREE.MeshBasicMaterial({ color: C.ink }), ecap * 2);
    this.shine = new Pool(s, EM.ball, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, depthWrite: false }), ecap, { order: 2 });
    this.shadows = new Pool(s, new THREE.CircleGeometry(0.5, 16).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2, depthWrite: false }), ecap + 80, { order: 1 });
    const barGeo = new THREE.PlaneGeometry(1, 1);
    this.barBg = new Pool(s, barGeo, new THREE.MeshBasicMaterial({ color: 0x2A2030, depthTest: false, transparent: true, opacity: 0.75 }), ecap, { order: 10 });
    this.barFg = new Pool(s, barGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, transparent: true }), ecap, { color: true, order: 11 });

    // Projectiles
    const arrow = new Builder();
    arrow.add(new THREE.ConeGeometry(0.055, 0.34, 4).rotateZ(-Math.PI / 2), C.cream, { shade: 1 });
    arrow.box(0.1, 0.1, 0.02, C.orange, { x: -0.16, y: -0.05, shade: 1 });
    this.arrows = new Pool(s, arrow.build(), unlit(), 420);
    this.trails = new Pool(s, new THREE.BoxGeometry(1, 0.035, 0.035).translate(-0.5, 0, 0), additive(0xFFD27A, 0.5), 420, { order: 5 });
    this.shells = new Pool(s, new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshLambertMaterial({ color: C.iron }), 220, { shadow: true });

    // Overlays
    this.dots = new Pool(s, new THREE.CircleGeometry(0.085, 10).rotateX(-Math.PI / 2), additive(0xffffff, 1), 1000, { color: true, order: 2 });
    this.markers = new Pool(s, new THREE.RingGeometry(0.4, 0.5, 32).rotateX(-Math.PI / 2), additive(0xffffff, 1), 140, { color: true, order: 3 });
    this.rangeRing = new Pool(s, new THREE.RingGeometry(0.975, 1, 72).rotateX(-Math.PI / 2), additive(0xffffff, 1), 8, { color: true, order: 3 });
    this.rangeFill = new Pool(s, new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.09, depthWrite: false }), 4, { color: true, order: 2 });
    this.links = new Pool(s, new THREE.BoxGeometry(1, 0.03, 0.05).translate(0.5, 0, 0), additive(C.amber, 0.7), 80, { color: true, order: 4 });

    // Entry gates: two pillars and a swirl of mist between them.
    const gp = new Builder();
    for (const sx of [-0.43, 0.43]) {
      gp.bevel(0.2, 0.86, 0.2, 0.03, 0x93A4C2, { x: sx, shade: 0.72 });
      gp.box(0.25, 0.07, 0.25, 0x7C8CAB, { x: sx, y: 0.86, shade: 1 });
      gp.octa(0.08, C.mist, { x: sx, y: 1.02, shade: 0.9 });
    }
    this.gates = new Pool(s, gp.build(), this.matLit, 8, { shadow: true });
    this.swirl = new Pool(s, new THREE.RingGeometry(0.55, 1, 20, 1, 0, Math.PI * 1.5), additive(0xBFD6FF, 0.3, { side: THREE.DoubleSide }), 32, { color: true, order: 5 });
    this.portal = new Pool(s, new THREE.CircleGeometry(0.44, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x2B3A5A, transparent: true, opacity: 0.55, depthWrite: false }), 8, { order: 1 });

    // Butterflies and dragonflies: two wings each.
    const wing = new THREE.PlaneGeometry(0.13, 0.11).translate(0.065, 0, 0).rotateX(-Math.PI / 2);
    this.wings = new Pool(s, wing, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), 40, { color: true });
    const rnd = seeded(555);
    this.flutter = [];
    for (let i = 0; i < 12; i++) this.flutter.push({ hx: 0, hz: 0, ph: rnd() * 6.28, a: 0.25 + rnd() * 0.25, b: 0.2 + rnd() * 0.3, r: 1.2 + rnd() * 1.6, c: [0xFFFFFF, C.amber, C.coral, 0xFFE9A8][i % 4], dragon: i >= 9 });

    // Knot
    this.K = makeKnot();
    this.K.root.traverse((o) => { if (o.isMesh && o.material.isMeshLambertMaterial) { o.material = this.knotMat || (this.knotMat = warm()); } });
    const solid = [];
    this.K.rig.traverse((o) => { if (o.isMesh) solid.push(o); });
    for (const o of solid) { const x = new THREE.Mesh(o.geometry, this.xrayWarm); x.renderOrder = 20; o.add(x); }
    s.add(this.K.root);
    this.buildSecret(s, EM);
  }

  setGhostType(type) {
    if (this.ghostType === type) return;
    this.ghostType = type;
    for (const c of [...this.ghost.children]) this.ghost.remove(c);
    const M = this.BM[type];
    if (!M) return;
    const add = (geo, y = 0) => { const m = new THREE.Mesh(geo, this.ghostMat); m.position.y = y; m.renderOrder = 6; this.ghost.add(m); };
    add(M.body);
    if (M.top) add(M.top, M.bodyH);
    if (M.barrel) add(M.barrel, M.bodyH + 0.2);
    if (M.crystal) add(M.crystal, M.bodyH + 0.34);
    if (M.ball) add(M.ball, M.bodyH + 0.12);
    if (M.spikes) add(M.spikes, M.bodyH);
    if (M.spiral) add(M.spiral, M.bodyH + 0.01);
    if (M.core) add(M.core, M.bodyH);
    if (M.coin) add(M.coin, M.bodyH + 0.13);
  }

  // ---------- game binding ----------

  setGame(game) {
    this.game = game;
    this.banim.clear();
    this.flyers.length = 0;
    this.hpMap.clear(); this.flashMap.clear();
    this.fx.clear();
    this.island.openKey = '';
    this.island.syncOpen(game.open, false);
    this.island.syncRocks();
    this.bolts.length = 0;
    this.openVer = game.s.bver; this.openCnt = game.s.completedCount;
    this.placeFlutter();
    this.cam.init = false;
    this.updateZoomLimits();
  }

  placeFlutter() {
    const g = this.game;
    const grass = [], water = [];
    for (let y = 0; y < H - 1; y++) for (let x = 0; x < W; x++) {
      if (!g.open[idx(x, y)]) continue;
      const k = tileAt(x, y).kind;
      if (k === 'grass') grass.push([x, y]); else if (k === 'water') water.push([x, y]);
    }
    const rnd = seeded(31 + grass.length);
    for (const f of this.flutter) {
      const list = f.dragon && water.length ? water : grass;
      if (!list.length) { f.off = true; continue; }
      const c = list[Math.floor(rnd() * list.length)];
      f.off = false; f.hx = wx(c[0] + 0.5); f.hz = wz(c[1] + 0.5);
    }
  }

  updateZoomLimits() {
    if (!this.game) return;
    let x0 = W, x1 = 0, y0 = H, y1 = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!this.game.open[idx(x, y)]) continue;
      if (y === H - 1 && !tileAt(x, y).goal) continue;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    this.openRect = { x0: wx(x0) - 0.3, x1: wx(x1 + 1) + 0.3, z0: wz(y0) - 0.3, z1: wz(y1 + 1) + 0.5 };
    const fit = this.fitDistance(this.openRect);
    this.cam.maxD = Math.max(fit.d * 1.1, 12);
    const hfov = 2 * Math.atan(Math.tan(FOV * Math.PI / 360) * this.camera.aspect);
    this.cam.minD = Math.max(6, 6 / (2 * Math.tan(hfov / 2)));
    this.cam.home = { tx: fit.tx, tz: fit.tz, d: fit.d };
    // Until the player moves the camera, it follows the home view (e.g. after rotating the phone).
    if (!this.cam.init || this.cam.follow !== false) {
      if (!this.cam.init) { this.cam.tx = fit.tx; this.cam.tz = fit.tz; this.cam.d = fit.d; this.cam.init = true; this.cam.follow = true; }
      else this.cam.goal = { ...this.cam.home };
    }
    this.cam.d = Math.min(this.cam.maxD, Math.max(this.cam.minD, this.cam.d));
  }

  setInsets(ins) {
    const k = ins.t + '|' + ins.b + '|' + ins.l + '|' + ins.r;
    if (k === this.insetKey) return;
    this.insetKey = k;
    this.insets = ins;
    this.updateZoomLimits();
  }

  // Find target and distance so the rectangle (and the top of the lighthouse) fits the free part of the screen.
  fitDistance(r) {
    const w = this.vw || 1, h = this.vh || 1;
    const I = this.insets;
    let xL = -1 + 2 * I.l / w + 0.02, xR = 1 - 2 * I.r / w - 0.02, yB = -1 + 2 * I.b / h + 0.02, yT = 1 - 2 * I.t / h - 0.03;
    if (xR - xL < 0.3) { xL = -0.95; xR = 0.95; }
    if (yT - yB < 0.3) { yB = -0.9; yT = 0.9; }
    const pts = [[r.x0, 0, r.z0], [r.x1, 0, r.z0], [r.x0, 0, r.z1], [r.x1, 0, r.z1], [r.x0, 1.2, r.z0], [r.x1, 1.2, r.z0]];
    let tx = (r.x0 + r.x1) / 2, tz = (r.z0 + r.z1) / 2, best = 40;
    const m = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    const measure = (d) => {
      this.placeCamera(tx, tz, d);
      m.minX = 9; m.maxX = -9; m.minY = 9; m.maxY = -9;
      for (const p of pts) { _v.set(p[0], p[1], p[2]).project(this.camera); m.minX = Math.min(m.minX, _v.x); m.maxX = Math.max(m.maxX, _v.x); m.minY = Math.min(m.minY, _v.y); m.maxY = Math.max(m.maxY, _v.y); }
      return m;
    };
    for (let iter = 0; iter < 4; iter++) {
      let lo = 3, hi = 140;
      for (let k = 0; k < 26; k++) {
        const d = (lo + hi) / 2;
        measure(d);
        const ok = (m.maxX - m.minX) <= (xR - xL) && (m.maxY - m.minY) <= (yT - yB);
        if (ok) hi = d; else lo = d;
      }
      best = hi;
      measure(best);
      const cx = (m.minX + m.maxX) / 2, cy = (m.minY + m.maxY) / 2;
      tx += (cx - (xL + xR) / 2) * (r.x1 - r.x0) / Math.max(1e-3, m.maxX - m.minX);
      tz -= (cy - (yB + yT) / 2) * (r.z1 - r.z0 + 1.2) / Math.max(1e-3, m.maxY - m.minY);
    }
    this.placeCamera(this.cam.tx, this.cam.tz, this.cam.d);
    return { tx, tz, d: best };
  }

  placeCamera(tx, tz, d, pitch = PITCH, yaw = 0, ty = 0) {
    const c = this.camera;
    const cp = Math.cos(pitch);
    c.position.set(tx + d * Math.sin(yaw) * cp, ty + d * Math.sin(pitch), tz + d * Math.cos(yaw) * cp);
    c.lookAt(tx, ty, tz);
    c.updateMatrixWorld();
  }

  clampCam() {
    const r = this.openRect;
    if (!r) return;
    const c = this.cam;
    c.d = Math.min(c.maxD, Math.max(c.minD, c.d));
    c.tx = Math.min(r.x1 + 1.5, Math.max(r.x0 - 1.5, c.tx));
    c.tz = Math.min(r.z1 + 2.5, Math.max(r.z0 - 1.5, c.tz));
  }

  // ---------- camera controls (coordinates are local to the canvas) ----------

  groundAt(lx, ly, planeY = 0) {
    const nx = (lx / this.vw) * 2 - 1, ny = -(ly / this.vh) * 2 + 1;
    const cam = this.camera;
    const o = _v.setFromMatrixPosition(cam.matrixWorld);
    const dir = new THREE.Vector3(nx, ny, 0.5).unproject(cam).sub(o).normalize();
    if (Math.abs(dir.y) < 1e-5) return null;
    const t = (planeY - o.y) / dir.y;
    if (t <= 0) return null;
    return new THREE.Vector3(o.x + dir.x * t, planeY, o.z + dir.z * t);
  }

  screenToCell(lx, ly) {
    const p = this.groundAt(lx, ly, 0.05);
    if (!p) return null;
    const x = Math.floor(p.x + W / 2), y = Math.floor(p.z + H / 2);
    if (x < 0 || y < 0 || x >= W || y >= H) return null;
    return { x, y, fx: p.x + W / 2, fy: p.z + H / 2 };
  }

  pan(dx, dy) {
    if (this.title) return;
    const worldPerPx = (2 * this.cam.d * Math.tan(FOV * Math.PI / 360)) / (this.vh || 1);
    this.cam.tx -= dx * worldPerPx;
    this.cam.tz -= dy * worldPerPx / Math.sin(PITCH);
    this.cam.goal = null;
    this.cam.follow = false;
    this.cam.nudgeBack = undefined;
    this.clampCam();
  }

  zoomAt(factor, lx, ly) {
    if (this.title) return;
    this.placeCamera(this.cam.tx, this.cam.tz, this.cam.d);
    const before = this.groundAt(lx, ly);
    this.cam.d *= factor;
    this.clampCam();
    this.placeCamera(this.cam.tx, this.cam.tz, this.cam.d);
    const after = this.groundAt(lx, ly);
    if (before && after) { this.cam.tx += before.x - after.x; this.cam.tz += before.z - after.z; }
    this.cam.goal = null;
    this.cam.follow = false;
    this.clampCam();
  }

  resetView() {
    if (this.cam.home) this.cam.goal = { ...this.cam.home };
    this.cam.follow = true;
    this.cam.nudgeBack = undefined;
  }

  // Moves the view by a number of screen pixels so a selected cell stays above a panel; unnudge() returns it.
  nudge(px) {
    const c = this.cam;
    const worldPerPx = (2 * c.d * Math.tan(FOV * Math.PI / 360)) / (this.vh || 1);
    if (c.nudgeBack === undefined) c.nudgeBack = c.tz;
    c.goal = { tx: c.tx, tz: c.tz + px * worldPerPx / Math.sin(PITCH), d: c.d };
  }
  unnudge() {
    const c = this.cam;
    if (c.nudgeBack === undefined) return;
    if (c.follow !== false) this.resetView(); else c.goal = { tx: c.tx, tz: c.nudgeBack, d: c.d };
    c.nudgeBack = undefined;
  }

  focusOn(x, y, d = 12, hold = 2.2) {
    this.cam.goal = { tx: wx(x), tz: wz(y), d: Math.max(this.cam.minD, Math.min(d, this.cam.d)), hold, back: { tx: this.cam.tx, tz: this.cam.tz, d: this.cam.d } };
  }

  shake(a) { this.shakeA = Math.max(this.shakeA, a); this.shakeT = 0.35; }

  // Is this point of the screen on the picture of the lighthouse?
  lighthouseHit(lx, ly) {
    if (!this.vh || this.title) return false;
    const pxPerUnit = this.vh / (2 * this.cam.d * Math.tan(FOV * Math.PI / 360));
    for (let h = 0.2; h <= 4.01; h += 0.38) {
      _v.set(this.lhX, h, this.lhZ).project(this.camera);
      const x = (_v.x + 1) / 2 * this.vw, y = (1 - _v.y) / 2 * this.vh;
      const r = (h < 0.5 ? 0.75 : h > 3 ? 0.55 : 0.5) * pxPerUnit;
      if (Math.hypot(lx - x, ly - y) < r) return true;
    }
    return false;
  }

  setTitle(on, dawn = false) { this.title = on; this.titleDawn = on && dawn; }

  // World -> canvas-local pixels (for floating labels and flying coins).
  toScreen(x, y, height = 0) {
    _v.set(wx(x), height, wz(y)).project(this.camera);
    return { x: (_v.x + 1) / 2 * this.vw, y: (1 - _v.y) / 2 * this.vh, visible: _v.z < 1 };
  }

  // ---------- events from the simulation ----------

  anim(id) {
    let a = this.banim.get(id);
    if (!a) { a = { born: -99, shot: -99, pulse: -99, merge: -99, type: null, level: 1, x: 0, y: 0 }; this.banim.set(id, a); }
    return a;
  }

  onEvents(events, speed = 1) {
    const fx = this.fx, T = this.time;
    const fast = speed >= 4, veryFast = speed >= 8;
    for (const e of events) {
      switch (e.k) {
        case 'shot': {
          const a = this.anim(e.id); a.shot = T;
          if (e.type === 'cannon' && !fast) { const b = this.game.byId.get(e.id); if (b) { const top = this.island.topAt(b.x, b.y) + this.topY(b); fx.dust(wx(e.x) + Math.cos(b.aim) * 0.5, top + 0.2, wz(e.y) + Math.sin(b.aim) * 0.5, 3, 0xD8D2CC, 0.2, 0.16); } }
          break;
        }
        case 'pulse': {
          const a = this.anim(e.id); a.pulse = T;
          const b = this.game.byId.get(e.id);
          const y = b ? this.island.topAt(b.x, b.y) : 0;
          fx.ring(wx(e.x), y + 0.09, wz(e.y), 0.3, e.r, veryFast ? 0.3 : 0.55, 0x8FE3FF);
          if (!fast) for (let i = 0; i < fx.count(5); i++) { const an = Math.random() * 6.28, r = Math.random() * e.r; fx.spawn(K_GLOW, wx(e.x) + Math.cos(an) * r, y + 1 + Math.random() * 0.6, wz(e.y) + Math.sin(an) * r, 0, -0.9, 0, 1.1, 0.04, 0xE6FAFF, 0, 0); }
          break;
        }
        case 'explode': {
          const X = wx(e.x), Z = wz(e.y);
          if (e.burn) fx.flash(X, 0.2, Z, e.r, 0xFF6A2A, 0.5);
          fx.ring(X, 0.08, Z, 0.25, e.r, 0.4, e.freeze ? 0xBFEFFF : C.orange);
          if (e.freeze) fx.ring(X, 0.1, Z, 0.2, e.r * 1.1, 0.6, 0xE6FAFF);
          fx.flash(X, 0.3, Z, e.r * 0.75, C.amber, 0.24);
          if (!veryFast) fx.dust(X, 0.1, Z, fast ? 3 : 7, 0xE9DCC2, 0.5, 0.24);
          if (!fast) fx.debris(X, 0.1, Z, C.soil, 4, 1.8, 0.07);
          this.shake(0.05);
          break;
        }
        case 'hit': if (!fast) fx.sparks(wx(e.x), 0.4, wz(e.y), 0xFFD27A, 2, 1.6, 0.05, 0.2); break;
        case 'heroHit': fx.sparks(wx(e.x), 0.4, wz(e.y), C.amber, fast ? 2 : 5, 2.4, 0.06, 0.3); break;
        case 'strike': {
          const X = wx(e.x), Z = wz(e.y);
          fx.ring(X, 0.08, Z, 0.3, e.r, 0.5, C.amber);
          fx.ring(X, 0.1, Z, 0.2, e.r * 0.7, 0.4, 0xFFFFFF);
          fx.flash(X, 0.3, Z, e.r * 0.6, C.amber, 0.3);
          fx.sparks(X, 0.3, Z, C.gold, 14, 4, 0.07, 0.5);
          fx.dust(X, 0.05, Z, 8, 0xE9DCC2, 0.8, 0.22);
          this.shake(0.09);
          break;
        }
        case 'death': {
          const X = wx(e.x), Z = wz(e.y);
          const look = ENEMY_LOOK[e.type] || ENEMY_LOOK.sliz;
          const col = enemyColor(e.type, e.golden);
          const n = e.boss ? 18 : veryFast ? 3 : fast ? 5 : 6 + Math.floor(Math.random() * 5);
          if (e.ret) {
            // returning bosses do not fall apart: they light up and melt into the air
            fx.flash(X, look.r, Z, look.r * 2.2, 0xFFF2C8, 0.8);
            for (let i = 0; i < 24; i++) fx.spawn(K_GLOW, X + (Math.random() - 0.5) * look.r * 2, 0.2 + Math.random() * look.r * 2, Z + (Math.random() - 0.5) * look.r * 2, (Math.random() - 0.5) * 0.3, 0.6 + Math.random() * 0.8, (Math.random() - 0.5) * 0.3, 2.5 + Math.random() * 1.5, 0.07, i % 2 ? 0xFFF2C8 : C.gold, 0, 0);
            fx.ring(X, 0.1, Z, 0.4, 2.4, 1.2, 0xFFF2C8);
            break;
          }
          fx.debris(X, look.r * 0.6, Z, col, n, 1.6 + look.r * 2.2, 0.08 + look.r * 0.16);
          if (!veryFast) fx.coinPop(X, look.r + 0.2, Z, e.boss ? 8 : e.golden ? 4 : 1);
          if (e.boss) { fx.ring(X, 0.1, Z, 0.4, 2.4, 0.7, 0xBFF5E6); this.shake(0.12); }
          break;
        }
        case 'leak':
          if (e.light > 0) {
            fx.ring(this.lhX, 0.12, this.lhZ, 0.5, 2.2, 0.7, C.coral);
            fx.flash(this.lhX, LH.lamp, this.lhZ, 1.2, C.coral, 0.4);
            this.lampFlash = 0.8;
            this.shake(0.06);
          }
          break;
        case 'build': {
          const a = this.anim(e.id); a.born = T;
          const top = this.island.topAt(e.x, e.y);
          fx.later(0.25, 0, wx(e.x + 0.5), top, wz(e.y + 0.5), 7);
          fx.later(0.25, 1, wx(e.x + 0.5), top + 0.07, wz(e.y + 0.5), 0.8, C.amber);
          break;
        }
        case 'merge': {
          const a = this.anim(e.id); a.merge = T;
          const b = this.game.byId.get(e.id);
          if (b) {
            this.flyers.push({ mode: 'merge', type: b.type, level: e.level - 1, x0: e.fx, y0: e.fy, x1: e.x, y1: e.y, t: 0, dur: 0.3 });
            const top = this.island.topAt(e.x, e.y);
            fx.later(0.3, 2, wx(e.x + 0.5), top + 0.5, wz(e.y + 0.5), 0.9, C.gold);
            fx.later(0.3, 1, wx(e.x + 0.5), top + 0.08, wz(e.y + 0.5), 1.3, C.gold);
          }
          break;
        }
        case 'sell': {
          const a = this.banim.get(e.id);
          if (a && a.type) {
            this.flyers.push({ mode: 'sell', type: a.wreck ? 'wreck' : a.type, level: a.level, x0: e.x, y0: e.y, x1: e.x, y1: e.y, t: 0, dur: 0.22 });
            const top = this.island.topAt(e.x, e.y);
            fx.later(0.2, 0, wx(e.x + 0.5), top, wz(e.y + 0.5), 5);
          }
          this.banim.delete(e.id);
          break;
        }
        case 'waveEnd': {
          this.knotJoy = 0.7;
          for (const b of this.game.s.buildings) if (b.type === 'mine') fx.coinPop(wx(b.x + 0.5), this.island.topAt(b.x, b.y) + 0.3, wz(b.y + 0.5) + 0.36, Math.min(4, b.level + 1));
          break;
        }
        case 'bossSpawn': this.shake(0.16); fx.ring(wx(e.x), 0.1, wz(e.y), 0.5, 3, 0.9, 0xBFD6FF); break;
        case 'heroDown': fx.dust(wx(e.x), 0.1, wz(e.y), 8, 0x8D8F98, 0.4, 0.2); fx.sparks(wx(e.x), 0.4, wz(e.y), C.coral, 8, 2.5, 0.06, 0.5); break;
        case 'heroUp': fx.ring(wx(this.game.s.hero.x), 0.08, wz(this.game.s.hero.y), 0.2, 1.2, 0.6, C.amber); break;
        case 'undo': this.banim.clear(); break;
        case 'zap': {
          this.bolts.push({ pts: e.pts, t: 0, big: e.big, seed: Math.random() * 100 });
          if (this.bolts.length > 40) this.bolts.shift();
          const last = e.pts[e.pts.length - 1];
          if (!fast) fx.sparks(wx(last[0]), 0.5, wz(last[1]), C.zap, e.big ? 8 : 3, 2.2, 0.05, 0.2);
          break;
        }
        case 'trap': { const a = this.anim(e.id); a.trap = T; if (!fast) fx.sparks(wx(e.x), 0.15, wz(e.y), C.cream, 5, 2, 0.05, 0.25); break; }
        case 'teleport': { const a = this.anim(e.id); a.tp = T; fx.ring(wx(e.x), 0.08, wz(e.y), 0.2, 1.1, 0.5, 0xFFC870); break; }
        case 'blink':
          if (!veryFast) { fx.flash(wx(e.fx), 0.4, wz(e.fy), 0.5, 0xFFC870, 0.25); fx.flash(wx(e.x), 0.4, wz(e.y), 0.5, 0xFFC870, 0.3); fx.ring(wx(e.x), 0.08, wz(e.y), 0.1, 0.7, 0.4, 0xFFC870); }
          break;
        case 'wreck': {
          const X = wx(e.x + 0.5), Z = wz(e.y + 0.5), top = this.island.topAt(e.x, e.y);
          fx.debris(X, top + 0.3, Z, C.wallStone, 9, 2.4, 0.11);
          fx.dust(X, top + 0.05, Z, fast ? 4 : 9, 0xD8CCB8, 0.6, 0.26);
          this.shake(0.08);
          break;
        }
        case 'repair': { const X = wx(e.x + 0.5), Z = wz(e.y + 0.5); fx.sparks(X, 0.4, Z, C.gold, 10, 2.5, 0.06, 0.4); fx.ring(X, 0.08, Z, 0.2, 0.9, 0.5, C.amber); const a = this.anim(e.id); a.born = T; break; }
        case 'resist': fx.ring(wx(e.x + 0.5), 0.1, wz(e.y + 0.5), 0.3, 0.8, 0.4, C.brass); break;
        case 'steal': {
          const X = wx(e.mx + 0.5), Z = wz(e.my + 0.5);
          fx.coinPop(X, 0.6, Z, 2);
          fx.sparks(X, 0.5, Z, C.coral, 4, 1.6, 0.05, 0.3);
          break;
        }
        case 'heal': if (!fast) fx.sparks(wx(e.x), 0.6, wz(e.y), C.heal, 4, 1.2, 0.05, 0.5); break;
        case 'brood': if (!veryFast) fx.dust(wx(e.x), 0.05, wz(e.y), 4, 0x8E7868, 0.4, 0.18); break;
        case 'rockBreak': {
          const X = wx(e.x + 0.5), Z = wz(e.y + 0.5);
          fx.debris(X, 0.6, Z, 0xA9ABB3, 18, 3.5, 0.18);
          fx.debris(X, 0.4, Z, C.moss, 6, 2.5, 0.1);
          fx.dust(X, 0.1, Z, 14, 0xC8C2B8, 1.0, 0.35);
          this.shake(0.3);
          this.island.syncRocks();
          break;
        }
        case 'freeze': if (!fast) fx.sparks(wx(e.x), 0.4, wz(e.y), 0xE6FAFF, 5, 1.2, 0.05, 0.4); break;
        case 'plug': fx.ring(wx(e.x), 0.08, wz(e.y), 0.3, 0.9, 0.5, C.coral); fx.dust(wx(e.x), 0.05, wz(e.y), 6, 0xE9DCC2, 0.5, 0.2); break;
        case 'levelUp': { const h = this.game.s.hero; fx.ring(wx(h.x), 0.08, wz(h.y), 0.2, 1.4, 0.7, C.gold); fx.sparks(wx(h.x), 0.6, wz(h.y), C.gold, 10, 2.2, 0.05, 0.6); break; }
        case 'relocate':
          fx.ring(wx(e.fx), 0.1, wz(e.fy), 0.3, 1.6, 0.7, 0xBFD6FF); fx.dust(wx(e.fx), 0.1, wz(e.fy), 10, C.mist, 0.8, 0.3);
          fx.ring(wx(e.x), 0.1, wz(e.y), 1.6, 0.3, 0.7, 0xBFD6FF); fx.dust(wx(e.x), 0.1, wz(e.y), 10, C.mist, 0.8, 0.3);
          if (e.boss) this.focusOn(e.x, e.y, 13, 1.2);
          break;
        case 'refund': fx.coinPop(wx(e.x + 0.5), 0.5, wz(e.y + 0.5), 3); break;
        case 'spell': this.spellFx(e); break;
        default: this.lateEvent(e, fast, veryFast, T);
      }
    }
  }

  spellFx(e) {
    const fx = this.fx, g = this.game;
    switch (e.id) {
      case 'meteor': {
        const X = wx(e.x), Z = wz(e.y);
        fx.flash(X, 0.5, Z, e.r * 1.2, C.orange, 0.5);
        fx.ring(X, 0.1, Z, 0.3, e.r * 1.3, 0.6, C.amber);
        fx.debris(X, 0.3, Z, 0x8F6449, 14, 3.5, 0.14);
        fx.dust(X, 0.1, Z, 12, 0xE9DCC2, 1.2, 0.3);
        this.shake(0.25);
        break;
      }
      case 'breath': for (const en of g.s.enemies) fx.ring(wx(en.x), 0.1, wz(en.y), 0.1, 0.7, 0.6, 0xBFEFFF); fx.ring(this.lhX, 0.1, this.lhZ, 1, 14, 1.2, 0xBFEFFF); break;
      case 'thunder':
        this.bolts.push({ pts: [[e.x + 0.3, e.y - 6], [e.x, e.y]], t: 0, big: true, sky: true, seed: Math.random() * 100 });
        fx.flash(wx(e.x), 0.5, wz(e.y), 1.4, 0xFFFFFF, 0.3); this.shake(0.2);
        break;
      default: fx.ring(this.lhX, 0.12, this.lhZ, 0.5, 4, 0.8, e.id === 'goldRush' ? C.gold : e.id === 'shield' ? 0x9FE8FF : e.id === 'draft' ? 0xDDE6F5 : C.amber);
    }
  }

  // Secret moments that need the view (the logic is in secrets/).
  secretEvent(e) {
    this.lateSecret(e);
    this.sxEvent(e);
    if (e.code === 'P-59') {
      this.fx.dust(wx(e.fx), 0.1, wz(e.fy), 8, C.mist, 0.5, 0.25);
      this.fx.dust(wx(e.x), 0.1, wz(e.y), 8, C.mist, 0.5, 0.25);
      this.fx.ring(wx(e.x), 0.08, wz(e.y), 0.6, 0.2, 0.5, 0xBFD6FF);
    }
  }

  // Height of the top of a building's stack above its base (where the moving part sits).
  topY(b, level = b.level) {
    const M = this.BM[b.type];
    return M.bodyH + (M.floorH || 0) * (level - 1);
  }

  // ---------- frame ----------

  frame(alpha, dt, ui) {
    const g = this.game;
    this.lastDt = dt;
    if (!g) { this.renderer.render(this.scene, this.camera); return; }
    this.time += dt;
    const s = g.s;
    const T = this.time;
    this.fast = (ui.speed || 1) >= 4;
    if (g.s.bver !== this.openVer || g.s.completedCount !== this.openCnt) {
      this.openVer = g.s.bver; this.openCnt = g.s.completedCount;
      if (this.island.syncOpen(g.open, true)) { this.placeFlutter(); this.updateZoomLimits(); this.resetView(); }
      this.island.syncRocks();
    }
    if (this.titleDawn || this.epilogue) this.setMood(11); else if (ui.chapter) this.setMood(ui.chapter);
    this.stepMood(dt);
    this.sxMoodTint(dt);
    const M = this.mood.cur;

    // Camera
    const c = this.cam;
    if (c.goal) {
      const k = 1 - Math.pow(0.003, dt);
      c.tx += (c.goal.tx - c.tx) * k; c.tz += (c.goal.tz - c.tz) * k; c.d += (c.goal.d - c.d) * k;
      if (Math.abs(c.goal.tx - c.tx) + Math.abs(c.goal.tz - c.tz) + Math.abs(c.goal.d - c.d) < 0.02) {
        if (c.goal.hold !== undefined && c.goal.back) {
          c.goal.hold -= dt;
          if (c.goal.hold <= 0) c.goal = { ...c.goal.back };
        } else c.goal = null;
      }
    }
    let sx = 0, sz = 0;
    if (this.shakeT > 0 && ui.shake !== false) {
      this.shakeT -= dt;
      sx = (Math.random() - 0.5) * this.shakeA;
      sz = (Math.random() - 0.5) * this.shakeA;
      if (this.shakeT <= 0) this.shakeA = 0;
    }
    if (this.title) {
      // Title screen: a slow look at the lighthouse from lower down.
      const land = this.vw > this.vh;
      this.placeCamera(this.lhX + (land ? 1.6 : 0), this.lhZ - 1.2, land ? 13 : 17, 0.2, Math.sin(T * 0.12) * 0.35 + 0.25, land ? 2.1 : 1.5);
    } else this.placeCamera(c.tx + sx, c.tz + sz, c.d);
    this.scene.fog.near = this.title ? 40 : c.d + 8;
    this.scene.fog.far = this.title ? 140 : c.d + 60;

    // Sun follows the view so the single shadow map stays sharp.
    const fx0 = this.title ? this.lhX : c.tx, fz0 = this.title ? this.lhZ : c.tz;
    const span = this.title ? 12 : Math.max(7, Math.min(15, c.d * 0.42));
    const sc = this.sun.shadow.camera;
    if (sc.right !== span) { sc.left = -span; sc.right = span; sc.top = span; sc.bottom = -span; sc.updateProjectionMatrix(); }
    this.sun.target.position.set(fx0, 0, fz0);
    this.sun.position.set(fx0 + this.sunDir.x * 40, this.sunDir.y * 40, fz0 + this.sunDir.z * 40);

    // Lighthouse (fades when the player works with the cells hidden behind it)
    const L = this.lh;
    const fadeTo = ui.fadeLH && !this.title ? 0.25 : 1;
    if (this.lhFade !== fadeTo) {
      this.lhFade += (fadeTo - this.lhFade) * Math.min(1, dt * 10);
      if (Math.abs(this.lhFade - fadeTo) < 0.01) this.lhFade = fadeTo;
      const tr = this.lhFade < 1;
      for (const m of [L.body.material, L.vane.material, L.glowMat]) { if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } m.opacity = this.lhFade; }
      L.body.castShadow = this.lhFade > 0.6;
    }
    let lf = s.light / s.maxLight;
    this.lampFlash = Math.max(0, this.lampFlash - dt);
    const fin = this.finaleLight(s, dt, T);
    if (fin !== null) lf = fin;
    let blink = lf < 0.3 ? 0.5 + 0.5 * Math.abs(Math.sin(T * 5)) : 1;
    if (this.lampFlash > 0) blink *= 0.35 + 0.65 * Math.abs(Math.sin(this.lampFlash * 22));
    const glow = (0.3 + 0.7 * lf) * blink * (this.lampMul ?? 1);
    L.glow.material.opacity = (this.glowOn ? 0.16 + 0.3 * this.dark : 0.0) * glow;
    L.glow.scale.setScalar(0.82 + 0.1 * Math.sin(T * 2.3));
    L.crystal.material.color.setHex(C.amber).multiplyScalar(0.35 + 0.9 * glow);
    L.crystal.rotation.y = T * 0.8;
    L.glass.material.emissiveIntensity = 0.5 + glow;
    L.glowMat.color.setRGB(0.5 + 0.5 * glow, 0.5 + 0.5 * glow, 0.5 + 0.5 * glow);
    L.glass.material.opacity = 0.32 * this.lhFade;
    L.vane.rotation.y = Math.sin(T * 0.4) * 0.9 + Math.sin(T * 1.7) * 0.1;
    const beamA = s.beam;
    L.pivot.rotation.y = -beamA - (this.beamExtra || 0);
    L.beamMat.opacity = (0.07 + 0.08 * M.beam) * glow * (this.beamBoost ?? 1);
    L.beamMat.color.setHex(this.beamGold ? 0xFFD86B : 0xFFF0C0);
    const bxA = beamA + (this.beamExtra || 0);
    const bx = this.lhX + Math.cos(bxA) * LH.reach, bz = this.lhZ + Math.sin(bxA) * LH.reach;
    this.beamSpot.position.set(bx, 0.07, bz);
    this.beamSpot.rotation.y = -bxA;
    this.beamSpot.scale.set(2.1, 1, 1.35);
    this.beamSpot.material.opacity = (0.1 + 0.07 * M.beam) * glow * Math.min(1.6, this.beamBoost ?? 1);
    this.spot.target.position.set(bx, 0, bz);
    this.spot.intensity = M.beam * 2.2 * glow * Math.min(1.5, this.beamBoost ?? 1);
    this.sxLamp(L, T);

    this.island.update(T, dt, g.occ);
    this.ambient(T, dt);
    this.shadows.begin();
    this.sxPoolsBegin();
    this.drawBuildings(T, dt);
    this.drawEnemies(alpha, T, dt);
    this.drawKnot(alpha, T, dt, ui);
    this.sxFrame(alpha, T, dt, ui);
    this.drawProjectiles(alpha, T);
    this.drawRails(T, dt);
    this.fx.update(dt);
    this.drawOverlays(ui, T);
    this.sxPoolsEnd();

    if (this.post.enabled) this.post.render(this.scene, this.camera);
    else this.renderer.render(this.scene, this.camera);
  }

  // Small things that make the world alive: butterflies, ripples, smoke, sparkles.
  ambient(T, dt) {
    const g = this.game, fx = this.fx, A = this.amb, isl = this.island;
    const low = this.quality === 'low';
    // butterflies (only in the bright chapters) and dragonflies over water
    this.wings.begin();
    if (this.dark < 0.35) {
      const n = low ? 5 : this.flutter.length;
      for (let i = 0; i < n; i++) {
        const f = this.flutter[i];
        if (f.off) continue;
        const sp = f.dragon ? 2.2 : 1;
        const x = f.hx + Math.sin(T * f.a * sp + f.ph) * f.r, z = f.hz + Math.cos(T * f.b * sp + f.ph * 1.3) * f.r * 0.8;
        const y = (f.dragon ? 0.35 : 0.55) + Math.sin(T * 1.9 + f.ph) * 0.14;
        const vx = Math.cos(T * f.a * sp + f.ph) * f.a, vz = -Math.sin(T * f.b * sp + f.ph * 1.3) * f.b * 0.8;
        const yaw = -Math.atan2(vz, vx);
        const flap = Math.sin(T * (f.dragon ? 40 : 16) + f.ph) * (f.dragon ? 0.5 : 1.0);
        const cx = Math.floor(x + W / 2), cy = Math.floor(z + H / 2);
        if (!inBounds(cx, cy) || !g.open[idx(cx, cy)]) continue;
        const col = f.dragon ? 0x9ADFE3 : f.c, s = f.dragon ? 1.25 : 1;
        this.wings.push(x, y, z, s, 1, f.dragon ? 0.5 : 1, yaw + Math.PI / 2, 0, flap, col);
        this.wings.push(x, y, z, s, 1, f.dragon ? 0.5 : 1, yaw - Math.PI / 2, 0, flap, col);
      }
    }

    const openCell = (c) => g.open[idx(c.x, c.y)];
    A.ripple -= dt;
    if (A.ripple <= 0 && isl.waterCells.length) {
      A.ripple = 1.2 + Math.random() * 2;
      const c = isl.waterCells[Math.floor(Math.random() * isl.waterCells.length)];
      if (openCell(c)) fx.ring(wx(c.x + 0.2 + Math.random() * 0.6), -0.06, wz(c.y + 0.2 + Math.random() * 0.6), 0.05, 0.3, 1.2, 0x5FA9B5);
    }
    A.smoke -= dt;
    if (A.smoke <= 0) {
      A.smoke = low ? 0.9 : 0.45;
      const ch = this.BM.mine.chimney;
      for (const b of g.s.buildings) {
        if (b.type !== 'mine' || Math.random() < 0.4) continue;
        const y = isl.topAt(b.x, b.y) + this.topY(b) + ch[1];
        fx.spawn(K_PUFF, wx(b.x + 0.5) + ch[0], y, wz(b.y + 0.5) + ch[2], 0.12, 0.5, 0, 1.6, 0.13, 0xE6E0DA, 0, 0);
      }
    }
    A.spring -= dt;
    if (A.spring <= 0 && isl.spring) {
      A.spring = 0.09;
      const a = Math.random() * 6.28;
      fx.spawn(K_CUBE, isl.spring.x, 0.42, isl.spring.z, Math.cos(a) * 0.35, 1.5 + Math.random() * 0.5, Math.sin(a) * 0.35, 0.55, 0.05, 0xC8F3F7, 7, 3);
    }
    A.ore -= dt;
    if (A.ore <= 0 && isl.oreCells.length) {
      A.ore = 0.5 + Math.random() * 0.7;
      const c = isl.oreCells[Math.floor(Math.random() * isl.oreCells.length)];
      if (openCell(c) && !g.occ[idx(c.x, c.y)]) fx.spawn(K_GLOW, wx(c.x + 0.15 + Math.random() * 0.7), 0.12, wz(c.y + 0.15 + Math.random() * 0.7), 0, 0.15, 0, 0.7, 0.05, C.gold, 0, 0);
    }
    A.mud -= dt;
    if (A.mud <= 0 && isl.mudCells.length) {
      A.mud = 0.8 + Math.random() * 1.4;
      const c = isl.mudCells[Math.floor(Math.random() * isl.mudCells.length)];
      if (openCell(c) && !g.occ[idx(c.x, c.y)]) fx.spawn(K_PUFF, wx(c.x + 0.2 + Math.random() * 0.6), -0.03, wz(c.y + 0.2 + Math.random() * 0.6), 0, 0.12, 0, 0.5, 0.09, 0x8E7868, 0, 0);
    }
    // Chapter specials: dust (2), fireflies and haze (3), dust and birds (4), heavy mist (5).
    const ch = this.mood.ch;
    A.mood = (A.mood || 0) - dt;
    if (A.mood <= 0 && !this.title) {
      A.mood = low ? 0.25 : 0.1;
      const rx = (Math.random() - 0.5) * 17, rz = (Math.random() - 0.5) * 19;
      const cx = Math.floor(rx + W / 2), cy = Math.floor(rz + H / 2);
      const ok = inBounds(cx, cy) && g.open[idx(cx, cy)];
      if (ch === 2 && ok) fx.spawn(K_GLOW, rx, 0.4 + Math.random() * 1.2, rz, 0.15, 0.04, 0.05, 3.5, 0.03, 0xF3E1B8, 0, 0);
      else if (ch === 3) {
        if (ok) fx.spawn(K_GLOW, rx, 0.3 + Math.random() * 0.8, rz, (Math.random() - 0.5) * 0.3, 0.05, (Math.random() - 0.5) * 0.3, 2.4, 0.06, Math.random() < 0.5 ? 0xD8FF7A : 0xFFF08A, 0, 0);
        if (isl.mudCells.length && Math.random() < 0.6) { const c = isl.mudCells[Math.floor(Math.random() * isl.mudCells.length)]; if (openCell(c)) fx.spawn(K_PUFF, wx(c.x + Math.random()), 0.05, wz(c.y + Math.random()), 0.05, 0.08, 0, 3, 0.45, 0xC9B8D4, 0, 0); }
      } else if (ch === 4 && ok && Math.random() < 0.5) fx.spawn(K_PUFF, rx, 0.05, rz, 0.25, 0.1, 0.05, 2.5, 0.22, 0xE6C9A6, 0, 0);
      else if (ch === 5 && ok) {
        if (Math.random() < 0.55) fx.spawn(K_PUFF, rx, 0.15 + Math.random() * 0.4, rz, 0.1, 0.02, 0.04, 3.5, 0.5, 0x9AA6CC, 0, 0);
        if (isl.crystalCells.length && Math.random() < 0.3) { const c = isl.crystalCells[Math.floor(Math.random() * isl.crystalCells.length)]; if (openCell(c)) fx.spawn(K_GLOW, wx(c.x + 0.2 + Math.random() * 0.6), 0.2, wz(c.y + 0.2 + Math.random() * 0.6), 0, 0.3, 0, 1, 0.06, C.crystal, 0, 0); }
      }
    }
    // birds on the horizon at sunset
    if (ch === 4 && !low) {
      for (let i = 0; i < 6; i++) {
        const t = T * 0.05 + i * 0.37;
        const bx = -30 + ((t * 40) % 60), bz = -26 - (i % 3) * 3, by = 9 + Math.sin(t * 5 + i) * 1.5 + i * 0.4;
        const flap = Math.sin(T * 7 + i * 2) * 0.6;
        this.wings.push(bx, by, bz, 5, 1, 3, Math.PI / 2, 0, flap, 0x3B2F3F);
        this.wings.push(bx, by, bz, 5, 1, 3, -Math.PI / 2, 0, flap, 0x3B2F3F);
      }
    }
    if (this.island.matCrystal) { const glow = ch === 5 ? 1.25 + 0.15 * Math.sin(T * 2) : 1; if (this.island.matCrystal.color.r !== glow) this.island.matCrystal.color.setRGB(glow, glow, glow); }
    this.lateAmbient(T, dt, ch, low);

    this.wings.end();
    A.crack -= dt;
    if (A.crack <= 0 && isl.cracks.length) {
      A.crack = 0.7;
      for (const c of isl.cracks) if (openCell(c)) fx.spawn(K_PUFF, wx(c.x + 0.3 + Math.random() * 0.4), 0.05, wz(c.y + 0.3 + Math.random() * 0.4), 0, 0.35, 0, 1.8, 0.16, C.mist, 0, 0);
    }
  }

  // Draws one building model. Used for real buildings, for the merge / sell animation and for the gallery.
  drawModel(type, level, X, Y, Z, sy, sxz, aim, id, T, a, tint = null, spec = null, bo = null) {
    const B = this.B, M = this.BM[type];
    if (!M) return;
    if (type === 'wreck') { B.wreck.push(X, Y, Z, sxz, sy, sxz, id * 1.7, 0, 0, tint); return; }
    const floors = Math.max(0, level - 1);
    const topY = Y + (M.bodyH + (M.floorH || 0) * floors) * sy;
    switch (type) {
      case 'wall':
        B.wall.push(X, Y, Z, sxz, sy, sxz, 0, 0, 0, tint);
        break;
      case 'archer': {
        B.archerBody.push(X, Y, Z, sxz, sy, sxz, 0, 0, 0, tint);
        for (let i = 0; i < floors; i++) B.archerFloor.push(X, Y + (M.bodyH + M.floorH * i) * sy, Z, sxz, sy, sxz, 0, 0, 0, tint);
        const r = a ? Math.max(0, 1 - (T - a.shot) / 0.22) : 0;
        const k = r * r * 0.09;
        const topPool = spec === 'A' ? B.sniperTop : spec === 'B' ? B.gatlingTop : B.archerTop;
        topPool.push(X - Math.cos(aim) * k, topY, Z - Math.sin(aim) * k, sxz, sy, sxz, -aim, 0, r * (spec === 'B' ? 0.03 : 0.12), tint);
        break;
      }
      case 'cannon': {
        const r = a ? Math.max(0, 1 - (T - a.shot) / 0.4) : 0;
        const sq = 1 - 0.14 * Math.sin(r * Math.PI) * r;
        B.cannonBody.push(X, Y, Z, sxz * (2 - sq), sy * sq, sxz * (2 - sq), 0, 0, 0, tint);
        for (let i = 0; i < floors; i++) B.cannonFloor.push(X, Y + (M.bodyH * sq + M.floorH * i) * sy, Z, sxz, sy, sxz, 0, 0, 0, tint);
        const ty = topY - M.bodyH * (1 - sq) * sy;
        B.cannonTop.push(X, ty, Z, sxz, sy, sxz, -aim, 0, 0, tint);
        const k = r * r * 0.16;
        const bp = spec === 'A' ? B.barrelWide : spec === 'B' ? B.barrelHot : B.cannonBarrel;
        bp.push(X - Math.cos(aim) * k, ty + 0.2 * sy, Z - Math.sin(aim) * k, sxz, sy, sxz, -aim, 0, 0.24, tint);
        break;
      }
      case 'frost': {
        B.frostBody.push(X, Y, Z, sxz, sy, sxz, 0, 0, 0, tint);
        for (let i = 0; i < floors; i++) B.frostFloor.push(X, Y + (M.bodyH + M.floorH * i) * sy, Z, sxz, sy, sxz, 0, 0, 0, tint);
        const r = a ? Math.max(0, 1 - (T - a.pulse) / 0.5) : 0;
        const cs = (1 + 0.1 * floors) * (1 + r * 0.35) * sxz * (spec === 'A' ? 1.25 : 1);
        const cy = topY + (0.36 + Math.sin(T * 2 + id) * 0.05) * sy;
        _c.setRGB(1 + r * 1.2, 1 + r * 1.2, 1 + r * 1.2);
        if (spec === 'A') _c.multiply(_c2.setRGB(0.55, 0.8, 1.25));
        if (spec === 'B') _c.lerp(WHITE, 0.5).multiplyScalar(1.15);
        if (tint) _c.multiply(tint);
        B.frostCrystal.push(X, cy, Z, cs, cs, cs, T * 1.1 + id, 0, 0, _c);
        const shards = spec === 'B' ? 6 : 3;
        for (let i = 0; i < shards; i++) {
          const an = T * 1.6 + id + i * Math.PI * 2 / shards;
          B.frostShard.push(X + Math.cos(an) * 0.3 * sxz, cy + Math.sin(T * 2.4 + i * 2) * 0.07, Z + Math.sin(an) * 0.3 * sxz, sxz, sy, sxz, an, 0.3, 0, _c);
        }
        break;
      }
      case 'mine': {
        B.mineBody.push(X, Y, Z, sxz, sy, sxz, 0, 0, 0, tint);
        for (let i = 0; i < floors; i++) B.mineFloor.push(X, Y + (M.bodyH + M.floorH * i) * sy, Z, sxz, sy, sxz, 0, 0, 0, tint);
        B.mineTop.push(X, topY, Z, sxz, sy, sxz, 0, 0, 0, tint);
        B.mineCart.push(X + Math.sin(T * 0.9 + id * 1.7) * 0.28 * sxz, Y, Z + 0.365 * sxz, sxz, sy, sxz, 0, 0, 0, tint);
        break;
      }
      case 'lightning': {
        B.lightBody.push(X, Y, Z, sxz, sy, sxz, 0, 0, 0, tint);
        for (let i = 0; i < floors; i++) B.lightFloor.push(X, Y + (M.bodyH + M.floorH * i) * sy, Z, sxz, sy, sxz, 0, 0, 0, tint);
        const r = a ? Math.max(0, 1 - (T - a.shot) / 0.25) : 0;
        _c.setHex(0xFFE9A0).lerp(WHITE, r).multiplyScalar(0.8 + 0.2 * Math.sin(T * 7 + id) + r * 0.6);
        const big = spec === 'B' ? 1.6 : 1;
        B.lightBall.push(X, topY + 0.12 * sy, Z, sxz * big, sy * big, sxz * big, 0, 0, 0, _c);
        if (spec === 'A') for (let i = 0; i < 3; i++) { const an = T * 2.5 + id + i * 2.094; B.lightSmall.push(X + Math.cos(an) * 0.26, topY + 0.1 * sy, Z + Math.sin(an) * 0.26, sxz, sy, sxz, 0, 0, 0, _c); }
        if (!this.fast && Math.random() < 0.08) this.fx.sparks(X + (Math.random() - 0.5) * 0.3, Y + 0.25 + Math.random() * 0.3, Z + (Math.random() - 0.5) * 0.3, 0xFFF2A8, 1, 1.2, 0.035, 0.15);
        break;
      }
      case 'amplifier': {
        B.ampBody.push(X, Y, Z, sxz, sy, sxz, 0, 0, 0, tint);
        const pz = 0.85 + 0.25 * Math.sin(T * 3 + id);
        _c.setHex(C.amber).multiplyScalar(pz);
        B.ampCore.push(X, topY + 0.02, Z, pz * sxz, pz * sy, pz * sxz, T, 0, 0, _c);
        break;
      }
      case 'trap': {
        B.trapBody.push(X, Y, Z, sxz, sy, sxz, 0, 0, 0, tint);
        // spikes: up when ready, shoot up when they bite, slowly come back while recharging
        const tr = a ? T - a.trap : 9;
        const cd = bo ? Math.max(0, bo.cd || 0) : 0;
        let up = cd > 0 ? -0.16 * Math.min(1, cd / 6) : 0.0;
        if (tr < 0.2) up = 0.1 * (1 - tr / 0.2);
        B.trapSpikes.push(X, Y + up * sy, Z, sxz * (1 + 0.1 * level), sy * (0.9 + 0.1 * level), sxz * (1 + 0.1 * level), 0, 0, 0, tint);
        break;
      }
      case 'bank': {
        B.bankBody.push(X, Y, Z, sxz, sy, sxz, 0, 0, 0, tint);
        const sh = a && a.bank ? Math.max(0, 1 - (T - a.bank) / 0.8) : 0;
        _c.setRGB(1 + sh * 1.5, 1 + sh * 1.5, 1 + sh);
        if (tint) _c.multiply(tint);
        B.bankCoin.push(X, topY + 0.13 * sy + sh * 0.15, Z, sxz * (1 + sh * 0.3), sy * (1 + sh * 0.3), sxz * (1 + sh * 0.3), T * 1.6 + id, 0, 0, _c);
        break;
      }
      case 'mortar': case 'icebow': case 'gauss': case 'snowcannon': case 'stormcannon': case 'aurora': {
        B[type + 'Body'].push(X, Y, Z, sxz, sy, sxz, 0, 0, 0, tint);
        for (let i = 0; i < floors; i++) B[type + 'Floor'].push(X, Y + (M.bodyH + M.floorH * i) * sy, Z, sxz, sy, sxz, 0, 0, 0, tint);
        const r = a ? Math.max(0, 1 - (T - a.shot) / 0.3) : 0;
        const k = r * r * (type === 'gauss' ? 0.18 : 0.12);
        if (M.top) B[type + 'Top'].push(X - Math.cos(aim) * k, topY, Z - Math.sin(aim) * k, sxz, sy, sxz, -aim, 0, 0, tint);
        if (type === 'aurora') {
          const pr = a ? Math.max(0, 1 - (T - a.pulse) / 0.5) : 0;
          const cy = topY + (0.36 + Math.sin(T * 2 + id) * 0.05) * sy;
          const hue = 0.5 + 0.5 * Math.sin(T * 0.8 + id);
          _c.setRGB(0.55 + 0.6 * hue + pr, 1.15 + pr, 0.9 + 0.5 * (1 - hue) + pr);
          if (tint) _c.multiply(tint);
          const cs = (1 + 0.1 * floors) * (1 + pr * 0.3) * sxz;
          B.frostCrystal.push(X, cy, Z, cs, cs, cs, T * 0.9 + id, 0, 0, _c);
          _c2.setHex(0xFFF2A8).multiplyScalar(0.8 + 0.3 * Math.sin(T * 6 + id));
          for (let i = 0; i < 3; i++) { const an = -T * 1.8 + id + i * 2.094; B.lightSmall.push(X + Math.cos(an) * 0.3 * sxz, cy + Math.sin(T * 3 + i) * 0.08, Z + Math.sin(an) * 0.3 * sxz, sxz, sy, sxz, 0, 0, 0, _c2); }
        }
        if (type === 'stormcannon' && !this.fast && Math.random() < 0.06) this.fx.sparks(X + (Math.random() - 0.5) * 0.3, topY + 0.5, Z + (Math.random() - 0.5) * 0.3, 0xFFF2A8, 1, 1.2, 0.035, 0.15);
        if ((type === 'snowcannon' || type === 'icebow') && !this.fast && Math.random() < 0.04) this.fx.spawn(K_GLOW, X + (Math.random() - 0.5) * 0.5, topY + 0.4, Z + (Math.random() - 0.5) * 0.5, 0, -0.4, 0, 0.9, 0.035, 0xE6FAFF, 0, 0);
        break;
      }
      case 'teleport': {
        B.tpBody.push(X, Y, Z, sxz, sy, sxz, 0, 0, 0, tint);
        const ready = !bo || !(bo.cd > 0);
        const fl = a ? Math.max(0, 1 - (T - a.tp) / 0.5) : 0;
        _c.setHex(0xFFC870).multiplyScalar((ready ? 0.9 : 0.35) + fl * 1.5);
        B.tpSpiral.push(X, Y + 0.03, Z, sxz * (1 + fl * 0.3), 1, sxz * (1 + fl * 0.3), -T * (ready ? 2.2 : 0.6) - id, 0, 0, _c);
        break;
      }
    }
    if (level >= 3 && M.gem && type !== 'mine') {
      const p = 0.85 + 0.25 * Math.sin(T * 3 + id);
      _c.setHex(M.gem).multiplyScalar(p * 1.3);
      B.gem.push(X, topY - 0.05 * sy, Z, M.r * 0.8 * sxz, sy * 0.45, M.r * 0.8 * sxz, 0, 0, 0, _c);
    }
    if (level >= 4) {
      const cy = topY + M.topH * sy + 0.08 + Math.sin(T * 2 + id) * 0.03;
      B.crown.push(X, cy, Z, sxz, sy, sxz, T * 0.6, 0, 0, tint);
      _c.setHex(C.gold).multiplyScalar(0.55 + 0.35 * Math.sin(T * 2.5 + id));
      B.lv4.push(X, Y + 0.06, Z, 1 + 0.06 * Math.sin(T * 2.5 + id), 1, 1 + 0.06 * Math.sin(T * 2.5 + id), T * 0.3, 0, 0, _c);
      if (!this.fast && Math.random() < 0.25) { const an = T * 2.2 + id; this.fx.spawn(K_GLOW, X + Math.cos(an) * 0.45, cy - 0.1, Z + Math.sin(an) * 0.45, 0, 0.2, 0, 0.5, 0.045, C.gold, 0, 0); }
    }
  }

  drawBuildings(T, dt) {
    const s = this.game.s, g = this.game;
    const B = this.B;
    for (const k in B) B[k].begin();
    for (const b of s.buildings) {
      if (!this.BM[b.type]) continue;
      const X = wx(b.x + 0.5), Z = wz(b.y + 0.5);
      const base = this.island.topAt(b.x, b.y);
      const a = this.anim(b.id);
      a.type = b.type; a.level = b.level; a.x = b.x; a.y = b.y; a.wreck = !!b.wreck;
      let dy = 0, sy = 1, sxz = 1, level = b.level, still = true;
      const tb = T - a.born;
      if (tb < 0.25) { const k = tb / 0.25; dy = 2 * (1 - k * k); still = false; }
      else if (tb < 0.8) { const k = (tb - 0.25) / 0.55; sy = 1 - 0.2 * Math.exp(-5 * k) * Math.cos(k * 11); sxz = 1 + (1 - sy) * 0.6; still = false; }
      const tm = T - a.merge;
      if (tm < 0.3) { level = b.level - 1; dy = 0.3 * Math.sin(Math.PI * tm / 0.3 * 0.5); still = false; }
      else if (tm < 0.85) { const k = (tm - 0.3) / 0.55; const p = 1 + 0.28 * Math.exp(-5 * k) * Math.cos(k * 10); sy = p; sxz = 0.75 + 0.25 * p; dy = 0.3 * Math.max(0, 1 - k * 4); still = false; }
      const off = !b.wreck && g.isOff && g.isOff(b);
      if (b.skin && !b.wreck && this.sxSkin(b, X, base + dy, Z)) continue;
      this.drawModel(b.wreck ? 'wreck' : b.type, level, X, base + dy, Z, sy, sxz, b.aim || 0, b.id, T, a, off ? this.offTint : null, b.spec || null, b);
      if (off) { _c.setHex(b.stunT > 0 ? 0xFFE9A0 : 0x8FD0FF).multiplyScalar(0.6 + 0.4 * Math.sin(T * 9 + b.id)); B.offMark.push(X, base + 0.08, Z, 1.1, 1, 1.1, T * (b.stunT > 0 ? 1 : -2), 0, 0, _c); if (!this.fast && Math.random() < 0.05) this.fx.sparks(X, base + 0.6, Z, b.stunT > 0 ? 0xFFE9A0 : 0x8FD0FF, 1, 1, 0.04, 0.2); }
      // Without real shadows (low quality) a dark circle keeps the building on the ground.
      if (this.quality === 'low' && !BUILDINGS[b.type].onPath) this.shadows.push(X + 0.1, base + 0.03, Z - 0.06, 1.25, 1, 1.25);
      // Neighbouring walls join into one line.
      if (b.type === 'wall' && still && !b.wreck) {
        const e = g.buildingAt(b.x + 1, b.y), so = g.buildingAt(b.x, b.y + 1);
        if (e && e.type === 'wall' && !e.wreck && T - this.anim(e.id).born > 0.8 && this.island.topAt(e.x, e.y) === base) B.wallLink.push(X + 0.5, base, Z);
        if (so && so.type === 'wall' && !so.wreck && T - this.anim(so.id).born > 0.8 && this.island.topAt(so.x, so.y) === base) B.wallLink.push(X, base, Z + 0.5, 1, 1, 1, Math.PI / 2);
      }
    }
    // Buildings that fly (merge) or shrink (sell).
    for (let i = this.flyers.length - 1; i >= 0; i--) {
      const f = this.flyers[i];
      f.t += dt;
      const k = Math.min(1, f.t / f.dur);
      if (f.mode === 'merge') {
        const x = f.x0 + (f.x1 - f.x0) * k, y = f.y0 + (f.y1 - f.y0) * k;
        const lift = 0.3 + Math.sin(k * Math.PI) * 0.9;
        const sc = 1 - 0.35 * k;
        this.drawModel(f.type, f.level, wx(x + 0.5), this.island.topAt(f.x1, f.y1) + lift, wz(y + 0.5), sc, sc, 0, 0, T, null);
      } else {
        const sc = 1 - k;
        this.drawModel(f.type, f.level, wx(f.x0 + 0.5), this.island.topAt(f.x0, f.y0), wz(f.y0 + 0.5), sc, 1 + 0.2 * k, 0, 0, T, null);
      }
      if (k >= 1) this.flyers.splice(i, 1);
    }
    for (const k in B) B[k].end();
    if (this.banim.size > s.buildings.length + 40) {
      for (const id of [...this.banim.keys()]) if (!g.byId.has(id)) this.banim.delete(id);
    }
  }

  drawEnemies(alpha, T, dt) {
    const s = this.game.s, isl = this.island, fx = this.fx;
    const KP = this.kindPools;
    this.blob.begin(); this.runner.begin(); this.eyes.begin(); this.pupils.begin(); this.shine.begin(); this.bubble.begin();
    this.crown.begin(); this.barBg.begin(); this.barFg.begin();
    for (const k in KP) KP[k].begin();
    this.rotor.begin(); this.lantern.begin(); this.cloudVis.begin(); this.cloudHid.begin(); this.healRing.begin(); this.glowEyes.begin();
    this.yEyes.begin(); this.lateEnemiesBegin();
    const many = s.enemies.length > 90;
    // In a crowd the dark circles under the enemies are enough; real shadows would draw everything twice.
    this.blob.mesh.castShadow = this.runner.mesh.castShadow = !many;
    for (const k in KP) KP[k].mesh.castShadow = !many;
    if (this.hpMap.size > s.enemies.length * 2 + 60) { this.hpMap.clear(); this.flashMap.clear(); }
    for (const e of s.enemies) {
      const look = ENEMY_LOOK[e.type] || ENEMY_LOOK.sliz;
      if (e.dead) continue;
      if (look.kind === 'heart' || e.under) { this.drawSpecialEnemy(e, look, alpha, T, dt); continue; }
      const x = e.px + (e.x - e.px) * alpha, y = e.py + (e.y - e.py) * alpha;
      const X = wx(x), Z = wz(y);
      const gy = Math.max(0, isl.topAt(Math.floor(e.x), Math.floor(e.y)));
      const r = look.r, d = r * 2;
      // hit flash: white for a moment after losing life
      const prev = this.hpMap.get(e.id);
      if (prev !== undefined && e.hp < prev - 1e-6) this.flashMap.set(e.id, T);
      this.hpMap.set(e.id, e.hp);
      const ft = T - (this.flashMap.get(e.id) ?? -9);
      const flash = ft < 0.09;
      if (look.vc) { if (e.golden) _c.setHex(C.golden).lerp(WHITE, 0.15); else if (look.res) this.resColor(e, T, _c); else _c.setRGB(1, 1, 1); }
      else _c.setHex(e.golden ? C.golden : look.color);
      if (e.black) _c.setRGB(0.09, 0.08, 0.12); else if (this.sx.pumpkin && look.kind === 'blob' && !e.golden) _c.setHex(0xF28C38);
      if (e.ret) _c.lerp(_c2.setHex(0xC9D6F0), 0.5).multiplyScalar(1.15);
      if (e.frozen) _c.multiplyScalar(0.75);
      if (e.golden) _c.multiplyScalar(0.92 + 0.16 * Math.sin(T * 9 + e.seed * 30));
      if (e.slowT > 0) _c.lerp(ICE, 0.45);
      if (flash) { if (look.vc) _c.multiplyScalar(2.2); else _c.lerp(WHITE, 0.85); }
      const moving = Math.abs(e.vx) + Math.abs(e.vy) > 0.01;
      let ang = moving ? Math.atan2(e.vy, e.vx) : (e.dir >= 0 ? [-Math.PI / 2, 0, Math.PI / 2, Math.PI][e.dir] : Math.PI / 2);
      if (e.frozen && e.lookX !== undefined) ang = Math.atan2(e.lookY - e.y, e.lookX - e.x);
      if (e.home) ang = moving ? ang : Math.PI / 2;
      ang = this.sxAngle(e, ang);
      const fwx = Math.cos(ang), fwz = Math.sin(ang);
      const ph = (x + y) * (look.kind === 'runner' ? 5.2 : 3.4 / Math.max(0.5, d)) + e.seed * 6.28;
      const soft = look.kind === 'blob' || look.kind === 'runner' || look.kind === 'cloud';
      const st = e.stunT > 0 ? -0.6 : Math.sin(ph + (moving ? 0 : T * 2));
      let sy = 1 + (soft ? 0.15 : 0.04) * st, sxz = 1 - (soft ? 0.07 : 0.02) * st;
      if (flash) { sy *= 0.9; sxz *= 1.05; }
      if (this.sxDance > 0) { const dk = Math.sin(T * 9 + e.seed * 3); sy *= 1 + 0.16 * dk; sxz *= 1 - 0.08 * dk; }
      let hop = soft ? Math.max(0, st) * 0.07 * d : 0;
      if (e.ram && isl.topAt(Math.floor(e.x), Math.floor(e.y)) > 0.5) hop += 0.35; // jumping over a rock
      let base = gy + hop;
      if (e.fly) base = gy + 1.15 + Math.sin(T * 3 + e.seed * 6) * 0.07;
      if (look.kind === 'egg') { const w = e.hatchT !== undefined && e.hatchT < 2.5 ? Math.sin(T * 30) * 0.12 * (1 - e.hatchT / 2.5) : 0; sxz *= 1 + w * 0.3; sy *= 1 - w * 0.2; }
      if (look.kind === 'worm' && e.bur && e.bur.t > (ENEMIES_BUR_UP[e.type] || 9) - 0.6) { const k = ((ENEMIES_BUR_UP[e.type] || 9) - e.bur.t) / 0.6; base -= (1 - k) * d * 0.6; }
      if (e.ret && !this.fast && Math.random() < dt * 6) fx.spawn(K_PUFF, X + (Math.random() - 0.5) * d, base + Math.random() * d, Z + (Math.random() - 0.5) * d, 0, 0.3, 0, 1.2, 0.18 * d, 0xC9D6F0, 0, 0);
      let eyeH, eyeF, es, e2 = 1, one = false;
      if (look.kind === 'cloud') {
        const wob = 1 + 0.05 * Math.sin(T * 3 + e.seed * 9);
        if (!e.vis) {
          // invisible: only a faint shimmer of the air
          _c.setRGB(1, 1, 1);
          this.cloudHid.push(X, base + 0.05 * Math.sin(T * 5 + e.seed * 7), Z, d * wob, d * 0.9, d * wob, T * 0.3 + e.seed * 6, 0, 0, _c);
          continue;
        }
        this.cloudVis.push(X, base, Z, d * wob, d * sy, d * wob, -ang, 0, 0, _c);
        eyeH = d * look.eyeH; eyeF = d * look.eyeF; es = d * look.eye;
      } else if (look.vc) {
        const P = KP[look.kind];
        const tilt = e.fly ? Math.sin(T * 2.3 + e.seed * 5) * 0.12 : (look.kind === 'robot' ? Math.sin(ph * 1.3) * 0.05 : 0);
        let ry = -ang;
        if (look.kind === 'roller') ry = -ang;
        P.push(X, base, Z, d * sxz, d * sy, d * sxz, ry, 0, tilt, _c);
        eyeH = d * look.eyeH * sy; eyeF = d * look.eyeF; es = d * look.eye; e2 = look.eye2 || 1; one = !!look.one;
        if (look.kind === 'drone') this.rotor.push(X, base + d * 0.62, Z, d, d, d, T * 22 + e.seed * 9, 0, 0, _c);
        if (e.type === 'ucen_dron') this.rotor.push(X, base + d * 1.05, Z, d * 0.8, d, d * 0.8, T * 22 + e.seed * 9, 0, 0, _c);
        this.lateEnemyExtras(e, look, X, base, Z, d, sy, ang, T, dt, many);
      } else if (look.kind === 'runner') {
        this.runner.push(X, base, Z, d * sxz, d * sy, d * sxz, -ang, 0, 0, _c);
        eyeH = d * 0.43 * sy; eyeF = d * (0.5 - look.eye * 0.45); es = d * look.eye;
        if (!this.fast && !many && moving && Math.random() < dt * 9) fx.spawn(K_PUFF, X - fwx * 0.15, gy + 0.06, Z - fwz * 0.15, 0, 0.1, 0, 0.35, 0.09, look.kind === 'runner' && e.type === 'pulec' ? 0x8E7868 : 0xD6EE9A, 0, 0);
      } else {
        const w = look.wide || 1;
        this.blob.push(X, base, Z, d * sxz * w, d * sy, d * sxz * w, -ang, 0, 0, _c);
        eyeH = d * 0.5 * sy; eyeF = d * (0.457 - look.eye * 0.45) * w; es = d * look.eye;
        if (look.bubbles && !many) {
          for (let k = 0; k < 3; k++) {
            const an = T * 0.5 + k * 2.1 + e.seed * 6;
            this.bubble.push(X + Math.cos(an) * d * 0.33, base + d * (0.3 + 0.1 * Math.sin(T * 1.3 + k * 2)) * sy, Z + Math.sin(an) * d * 0.33, d * 0.13, d * 0.13, d * 0.13);
          }
        }
        if (look.lantern) {
          const lx = X - fwz * d * 0.42, lz = Z + fwx * d * 0.42;
          _c2.setHex(C.heal).multiplyScalar(0.85 + 0.3 * Math.sin(T * 4 + e.seed * 9));
          this.lantern.push(lx, base, lz, d * 1.1, d * 1.1, d * 1.1, -ang, 0, 0, _c2);
          if (!many) this.healRing.push(X, gy + 0.05, Z, 1 + 0.03 * Math.sin(T * 3), 1, 1 + 0.03 * Math.sin(T * 3));
        }
        if (e.type === 'bahnak' && !this.fast && !many && moving && Math.random() < dt * 4) fx.spawn(K_PUFF, X - fwx * 0.2, gy + 0.05, Z - fwz * 0.2, 0, 0.05, 0, 0.6, 0.1, 0x6E5A4E, 0, 0);
      }
      if (look.crown) { const ch = look.crown === true ? 0.72 : look.crown; this.crown.push(X, base + d * ch * sy, Z, d * 0.55, d * 0.55, d * 0.55, T * 0.5); }
      if (look.cap) this.capPool.push(X, base + d * 0.78 * sy, Z, d * 0.62, d * 0.62, d * 0.62, -ang);
      if (e.hat || e.sign || e.flag || e.banner || e.wav || this.sx.xmas || this.sx.pumpkin) this.sxEnemyExtras(e, look, X, base, Z, d, sy, ang, T);
      if (look.cap && !e.home) this.letterPool.push(X + Math.cos(ang) * d * 0.48, base + d * 0.32, Z + Math.sin(ang) * d * 0.48, d * 0.5, d * 0.5, d * 0.5, -ang + 0.3, 0.4, 0);
      if (e.golden && !this.fast && Math.random() < dt * 7) fx.spawn(K_GLOW, X + (Math.random() - 0.5) * d, base + Math.random() * d * 0.8, Z + (Math.random() - 0.5) * d, 0, 0.4, 0, 0.5, 0.05, C.gold, 0, 0);
      // eyes on the front side
      const eg = es * 1.15;
      for (let side = -1; side <= 1 && !look.noEyes; side += 2) {
        const sc = side > 0 ? e2 : 1;
        const ox = one ? fwx * eyeF : fwx * eyeF - fwz * side * eg, oz = one ? fwz * eyeF : fwz * eyeF + fwx * side * eg;
        const ex = es * sc * (this.sxV.stareId === e.id && (T % 3.4) < 0.2 ? 0.15 : 1);
        if (look.yEyes) this.yEyes.push(X + ox, base + eyeH, Z + oz, ex * 0.8, ex * 0.8, ex * 0.8);
        else if (look.glowEyes) this.glowEyes.push(X + ox, base + eyeH, Z + oz, ex * 0.8, ex * 0.8, ex * 0.8);
        else {
          this.eyes.push(X + ox, base + eyeH, Z + oz, ex, ex, ex);
          this.pupils.push(X + ox + fwx * ex * 0.24, base + eyeH + ex * 0.17, Z + oz + fwz * ex * 0.24 + ex * 0.08, ex * 0.56, ex * 0.56, ex * 0.56);
        }
        if (one) break;
      }
      if (!many && soft && look.kind !== 'cloud') this.shine.push(X - d * 0.17, base + d * 0.6 * sy, Z + d * 0.16, d * 0.11, d * 0.07, d * 0.09);
      const sh = e.fly ? 0.6 : 1.12 - hop;
      this.shadows.push(X, gy + 0.025, Z, d * sh, 1, d * sh);
      if (e.hp < e.mhp && !e.boss && !e.home) {
        const w = Math.max(0.5, d * 0.9);
        const f = Math.max(0, e.hp / e.mhp);
        const by = base + d * 0.8 + 0.3;
        this.barBg.push(X, by, Z, w + 0.06, 0.12, 1, 0, -PITCH, 0);
        _c2.setHex(f > 0.5 ? 0x7AD35B : f > 0.25 ? C.amber : C.coral);
        this.barFg.push(X - (w * (1 - f)) / 2, by + 0.004, Z + 0.004, w * f, 0.07, 1, 0, -PITCH, 0, _c2);
      }
    }
    this.blob.end(); this.runner.end(); this.eyes.end(); this.pupils.end(); this.shine.end(); this.bubble.end(); this.crown.end();
    for (const k in KP) KP[k].end();
    this.rotor.end(); this.lantern.end(); this.cloudVis.end(); this.cloudHid.end(); this.healRing.end(); this.glowEyes.end();
    this.yEyes.end(); this.lateEnemiesEnd();
    this.barBg.end(); this.barFg.end();
    this.blobX.count = this.blob.mesh.count; this.runnerX.count = this.runner.mesh.count;
    // the shadow pool is finished in drawProjectiles (shells add their shadows)
  }

  drawKnot(alpha, T, dt, ui) {
    const h = this.game.s.hero, K = this.K;
    const hx = h.px + (h.x - h.px) * alpha, hy = h.py + (h.y - h.py) * alpha;
    const gy = Math.max(0, this.island.topAt(Math.floor(h.x), Math.floor(h.y)));
    K.root.position.set(wx(hx), gy, wz(hy));
    this.knotYaw = lerpAngle(this.knotYaw, -h.face + Math.PI / 2, 1 - Math.exp(-14 * dt));
    K.rig.rotation.y = this.knotYaw;
    const down = h.down > 0;
    const moving = !down && (Math.abs(h.x - h.px) + Math.abs(h.y - h.py) > 1e-4);
    if (moving) this.knotWalk += dt * 11; else this.knotWalk = 0;
    const w = this.knotWalk;
    this.knotJoy = Math.max(0, this.knotJoy - dt);
    const joy = down ? 0 : Math.sin(Math.min(1, this.knotJoy / 0.7) * Math.PI);
    const sw = h.swing > 0 ? Math.sin(Math.min(1, h.swing / 0.3) * Math.PI) : 0;
    // body: waddle when walking, breathe when idle, sit when switched off
    K.rig.position.y = down ? -0.11 : (moving ? Math.abs(Math.sin(w)) * 0.035 : Math.sin(T * 2) * 0.006) + joy * 0.28;
    K.rig.rotation.z = moving ? Math.sin(w) * 0.13 : 0;
    K.torso.rotation.x = down ? -0.3 : sw * 0.35;
    K.legL.position.y = moving ? Math.max(0, Math.sin(w)) * 0.06 : 0;
    K.legR.position.y = moving ? Math.max(0, -Math.sin(w)) * 0.06 : 0;
    K.legL.position.z = moving ? Math.cos(w) * 0.04 : 0;
    K.legR.position.z = moving ? -Math.cos(w) * 0.04 : 0;
    // head: looks around when idle
    const confused = h.confusedT > 0;
    K.head.rotation.y = confused ? Math.sin(T * 9) * 0.9 : down || moving ? 0 : Math.sin(T * 0.7) * 0.55;
    if (confused) { K.rig.rotation.z = Math.sin(T * 6) * 0.12; K.rig.position.y += Math.abs(Math.sin(T * 8)) * 0.03; }
    K.head.rotation.x = down ? 0.55 : 0;
    // arms: wrench over the shoulder when walking, a full swing when hitting, wiping the forehead now and then
    const wipe = !down && !moving && sw === 0 ? Math.max(0, Math.sin(T * 0.45) - 0.92) / 0.08 : 0;
    const plug = h.plugT > 0 && !down;
    K.armL.rotation.x = joy > 0 ? -2.6 * joy : -2.3 * Math.min(1, wipe) + (moving ? Math.sin(w) * 0.5 : 0);
    K.armL.rotation.z = plug ? 1.3 : confused ? 0.5 : 0;
    K.armR.rotation.z = plug ? -1.3 : 0;
    K.armR.rotation.x = sw > 0 ? -0.9 + sw * 2.6 : joy > 0 ? -2.4 * joy : (moving ? -0.35 : 0);
    K.wrench.rotation.x = sw > 0 ? 0 : moving ? -0.75 : -0.12;
    K.wrench.rotation.z = down ? 1.2 : 0;
    K.glowMat.color.setHex(down ? 0x4A3320 : C.amber).multiplyScalar(down ? 1 : 0.9 + 0.2 * Math.sin(T * 3));
    K.aura.visible = K.auraFill.visible = !down;
    const over = h.overT > 0;
    K.aura.material.opacity = over ? 0.6 + 0.3 * Math.sin(T * 12) : ui.heroMode ? 0.55 : 0.2 + 0.05 * Math.sin(T * 2);
    K.auraFill.material.opacity = over ? 0.12 : ui.heroMode ? 0.08 : 0.03;
    const ar = (this.game.auraRange ? this.game.auraRange() : 2) / 2;
    K.aura.scale.setScalar(ar * (1 + 0.012 * Math.sin(T * 2)));
    K.auraFill.scale.setScalar(ar);
    K.root.visible = !(h.swallowT > 0);
    this.sxKnot(T, dt);
    this.drawLateCharacters(alpha, T, dt, ui);
  }

  drawProjectiles(alpha, T) {
    const s = this.game.s;
    this.arrows.begin(); this.trails.begin(); this.shells.begin();
    for (const p of s.projectiles) {
      const x = p.px + (p.x - p.px) * alpha, y = p.py + (p.y - p.py) * alpha;
      if (p.k === 'arrow') {
        const a = Math.atan2(p.ty - p.y, p.tx - p.x);
        this.arrows.push(wx(x), 0.62, wz(y), 1, 1, 1, -a);
        if (!this.fast) this.trails.push(wx(x), 0.62, wz(y), 0.45, 1, 1, -a);
      } else {
        const f = Math.min(1, (p.t + alpha / 30) / p.T);
        const hgt = 0.6 + 2.2 * f * (1 - f) * 2;
        this.shells.push(wx(x), hgt, wz(y));
        this.shadows.push(wx(x), 0.03, wz(y), 0.3, 1, 0.3);
      }
    }
    this.arrows.end(); this.trails.end(); this.shells.end(); this.shadows.end();
    // lightning: jagged lines that glow for a moment
    this.boltSeg.begin();
    const dt = this.lastDt || 0.016;
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i];
      b.t += dt;
      const life = b.sky ? 0.25 : 0.14;
      if (b.t > life) { this.bolts.splice(i, 1); continue; }
      const k = 1 - b.t / life;
      _c.setHex(C.zap).multiplyScalar(0.6 + k);
      for (let j = 0; j + 1 < b.pts.length; j++) {
        const [ax, ay] = b.pts[j], [bx, by] = b.pts[j + 1];
        const h0 = b.sky && j === 0 ? 6 : j === 0 ? 0.95 : 0.45, h1 = 0.45;
        let px = wx(ax), py = h0, pz = wz(ay);
        const n = 4;
        for (let q = 1; q <= n; q++) {
          const f = q / n;
          const jit = q < n ? (Math.sin(b.seed + q * 7.3 + j * 3.1 + T * 40) * 0.18) : 0;
          const nx = wx(ax + (bx - ax) * f) + jit, ny = h0 + (h1 - h0) * f + jit * 0.5, nz = wz(ay + (by - ay) * f) - jit;
          const dx = nx - px, dy = ny - py, dz = nz - pz, L = Math.hypot(dx, dy, dz);
          const yaw = -Math.atan2(dz, dx), pitch = Math.atan2(dy, Math.hypot(dx, dz));
          const th = b.big ? 2.2 : 1.2;
          this.boltSeg.push(px, py, pz, L, th, th, yaw, 0, pitch, _c);
          px = nx; py = ny; pz = nz;
        }
      }
    }
    this.boltSeg.end();
  }

  drawOverlays(ui, T) {
    const g = this.game, isl = this.island;
    this.dots.begin(); this.markers.begin(); this.rangeRing.begin(); this.rangeFill.begin(); this.links.begin();
    this.gates.begin(); this.swirl.begin(); this.portal.begin();
    // Path dots (moving toward the lighthouse)
    const drawPath = (cells, color, phase, size) => {
      if (!cells || cells.length < 2) return;
      _c.setHex(color);
      const step = 0.5;
      const total = cells.length - 1;
      const off = this.sxBack ? step - ((T * 1.2 + phase) % step) : (T * 1.2 + phase) % step;
      for (let d = off; d < total; d += step) {
        const i = Math.floor(d), f = d - i;
        const a = cells[i], b = cells[Math.min(i + 1, total)];
        const x = a[0] + (b[0] - a[0]) * f + 0.5, y = a[1] + (b[1] - a[1]) * f + 0.5;
        const top = Math.max(isl.topAt(a[0], a[1]), 0);
        this.dots.push(wx(x), top + 0.06, wz(y), size, 1, size, 0, 0, 0, _c);
      }
    };
    if (!this.title) {
      const paths = ui.previewPaths || ui.paths;
      const dim = 0.55 + 0.45 * (1 - this.dark * 0.3);
      if (paths) for (const p of paths) drawPath(p.cells, ui.previewPaths ? (ui.previewOk ? 0xFFE9A8 : C.coral) : 0xFFF2C8, 0, dim);
      if (ui.previewPaths && ui.paths) for (const p of ui.paths) drawPath(p.cells, 0x7A7062, 0.25, 0.7);
    }

    // The straight line of the ram (chapter 4): from the north entry down to the lighthouse.
    const wn = g.currentWaveNumber();
    if (!this.title && ((wn >= 31 && wn <= 40) || wn === 93 || wn === 94) && g.isOpen(9, 5)) {
      _c.setHex(C.coral).multiplyScalar(0.55 + 0.25 * Math.sin(T * 3));
      for (let yy = 6; yy <= 19; yy++) for (let q = 0; q < 2; q++) {
        const top = Math.max(0, isl.topAt(9, yy) > 0.5 ? 0.92 : isl.topAt(9, yy));
        this.dots.push(wx(9.5), top + 0.07, wz(yy + 0.25 + q * 0.5), 1.6, 1, 1.6, 0, 0, 0, _c);
      }
    }
    // Knot's Plug: his cell is closed
    const hh = g.s.hero;
    if (hh.plugT > 0 && hh.down <= 0) {
      _c.setHex(C.coral).multiplyScalar(0.7 + 0.3 * Math.sin(T * 8));
      this.markers.push(wx(hh.plugX + 0.5), 0.09, wz(hh.plugY + 0.5), 1.25, 1, 1.25, 0, 0, 0, _c);
    }
    // Amplifier links to the towers it boosts
    const ampR = g.has('fifth') ? 2 : 1;
    for (const b of g.s.buildings) {
      if (b.type !== 'amplifier' || b.wreck) continue;
      for (const t of g.s.buildings) {
        if (!BUILDINGS[t.type].tower || t.wreck || Math.max(Math.abs(t.x - b.x), Math.abs(t.y - b.y)) > ampR) continue;
        const dx = t.x - b.x, dy = t.y - b.y, L = Math.hypot(dx, dy);
        _c.setHex(C.amber).multiplyScalar(0.35 + 0.3 * Math.sin(T * 4 + t.id));
        this.links.push(wx(b.x + 0.5), 0.75, wz(b.y + 0.5), L * 0.9, 1, 1, -Math.atan2(dy, dx), 0, -0.25, _c);
      }
    }
    // Burning ground and slime puddles
    this.fireDisc.begin(); this.puddles.begin();
    for (const f of g.s.fires) {
      const k = Math.min(1, f.t / 0.5);
      this.fireDisc.push(wx(f.x), 0.06, wz(f.y), f.r * (0.9 + 0.1 * Math.sin(T * 9 + f.x)), 1, f.r * (0.9 + 0.1 * Math.cos(T * 8 + f.y)), 0, 0, 0);
      if (!this.fast && Math.random() < 0.5 * k) this.fx.spawn(K_GLOW, wx(f.x) + (Math.random() - 0.5) * f.r * 1.4, 0.1, wz(f.y) + (Math.random() - 0.5) * f.r * 1.4, 0, 0.9, 0, 0.45, 0.07, Math.random() < 0.5 ? 0xFF8A3A : 0xFFD27A, 0, 0);
    }
    for (const pd of g.s.puddles) { const k = Math.min(1, pd.t / 0.4); this.puddles.push(wx(pd.x), 0.045, wz(pd.y), k, 1, k); }
    this.fireDisc.end(); this.puddles.end();
    // The journal page lying on the island near the lighthouse
    this.paper.visible = !this.title && g.s.pages.length > 0;
    if (this.paper.visible) {
      this.paper.position.set(wx(10.5), 0.25 + Math.sin(T * 2) * 0.08, wz(18.6));
      this.paper.rotation.set(Math.sin(T * 1.3) * 0.25, T * 0.6, Math.cos(T * 1.7) * 0.2);
      if (!this.fast && Math.random() < 0.05) this.fx.spawn(K_GLOW, wx(10.5) + (Math.random() - 0.5) * 0.5, 0.3, wz(18.6) + (Math.random() - 0.5) * 0.5, 0, 0.3, 0, 0.8, 0.05, C.gold, 0, 0);
    }

    // Entry gates
    for (const e of g.activeEntries()) {
      const X = wx(e.x + 0.5), Z = wz(e.y + 0.5);
      const hot = !!(ui.waveEntries && ui.waveEntries.some((w) => w.x === e.x && w.y === e.y));
      const face = e.key === 'V' ? -Math.PI / 2 : e.key === 'Z' ? Math.PI / 2 : 0;
      if (e.key === 'S' || e.key === 'V' || e.key === 'Z') {
        this.gates.push(X, 0, Z, 1, 1, 1, face);
        const p = hot ? 0.8 + 0.2 * Math.sin(T * 4) : 0.5;
        for (let i = 0; i < 3; i++) {
          _c.setHex(i === 1 ? 0xDDE6F5 : 0x9FB8E8).multiplyScalar(p * (0.8 - i * 0.15));
          const sc = 0.4 - i * 0.09;
          this.swirl.push(X, 0.5, Z, sc, sc * 1.15, sc, face, 0, T * (1.4 + i * 0.9) * (i % 2 ? -1 : 1) + i * 2, _c);
        }
      }
      this.portal.push(X, 0.035, Z);
      const pulse = hot ? 0.75 + 0.25 * Math.sin(T * 4) : 0.35;
      _c.setHex(0x8FD0FF).multiplyScalar(pulse);
      const ms = 1.08 + (hot ? 0.12 * Math.sin(T * 4) : 0);
      this.markers.push(X, 0.07, Z, ms, 1, ms, 0, 0, 0, _c);
    }

    // Beacon links to the towers next to it
    for (const b of isl.beacons) {
      if (!g.open[idx(b.x, b.y)]) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const t = g.buildingAt(b.x + dx, b.y + dy);
        if (!t || !BUILDINGS[t.type].tower) continue;
        const pz = 0.45 + 0.4 * Math.sin(T * 5 + dx + dy * 2);
        _c.setHex(C.amber).multiplyScalar(pz);
        const yaw = -Math.atan2(dy, dx);
        this.links.push(wx(b.x + 0.5), 1.0, wz(b.y + 0.5), 0.75, 1, 1, yaw, 0, -0.45, _c);
      }
    }

    // Selection and ranges
    const sel = ui.selected;
    if (sel) {
      const top = Math.max(0, isl.topAt(sel.x, sel.y) > 0.5 ? 0 : isl.topAt(sel.x, sel.y));
      _c.setHex(C.amber);
      this.markers.push(wx(sel.x + 0.5), top + 0.09, wz(sel.y + 0.5), 1.15, 1, 1.15, 0, 0, 0, _c);
      if (sel.range) {
        _c.setHex(C.amber).multiplyScalar(0.8);
        this.rangeRing.push(wx(sel.x + 0.5), 0.08, wz(sel.y + 0.5), sel.range, 1, sel.range, 0, 0, 0, _c);
        _c.setHex(C.amber);
        this.rangeFill.push(wx(sel.x + 0.5), 0.05, wz(sel.y + 0.5), sel.range, 1, sel.range, 0, 0, 0, _c);
      }
    }
    if (ui.selectedEnemy) {
      const e = g.findEnemy(ui.selectedEnemy);
      if (e) { const d = (ENEMY_LOOK[e.type]?.r || 0.3) * 2; _c.setHex(0x8FD0FF); this.markers.push(wx(e.x), 0.08, wz(e.y), d * 1.5 + 0.5, 1, d * 1.5 + 0.5, 0, 0, 0, _c); }
    }
    if (ui.partners) {
      for (const p of ui.partners) {
        _c.setHex(C.ok).multiplyScalar(0.7 + 0.3 * Math.sin(T * 6));
        this.markers.push(wx(p.x + 0.5), isl.topAt(p.x, p.y) + 0.1, wz(p.y + 0.5), 1.25, 1, 1.25, 0, 0, 0, _c);
      }
    }
    if (ui.dragCell) {
      _c.setHex(ui.dragOk ? C.ok : C.coral);
      this.markers.push(wx(ui.dragCell.x + 0.5), 0.12, wz(ui.dragCell.y + 0.5), 1.4, 1, 1.4, 0, 0, 0, _c);
    }
    // Build ghost
    if (ui.ghost) {
      const gh = ui.ghost;
      this.setGhostType(gh.type);
      const shake = gh.shakeT > 0 ? Math.sin(gh.shakeT * 60) * 0.1 * gh.shakeT * 3 : 0;
      const top = Math.max(0, isl.topAt(gh.x, gh.y) > 0.5 ? 0 : isl.topAt(gh.x, gh.y));
      this.ghost.visible = true;
      this.ghost.position.set(wx(gh.x + 0.5) + shake, top + 0.04 + Math.sin(T * 3) * 0.02, wz(gh.y + 0.5));
      this.ghostMat.color.setHex(gh.ok ? C.ok : C.coral);
      this.ghostMat.opacity = 0.5 + 0.1 * Math.sin(T * 4);
      _c.setHex(gh.ok ? C.ok : C.coral);
      this.markers.push(wx(gh.x + 0.5), top + 0.08, wz(gh.y + 0.5), 1.12, 1, 1.12, 0, 0, 0, _c);
      if (gh.range) {
        _c.setHex(gh.ok ? 0xFFE9A8 : C.coral);
        this.rangeRing.push(wx(gh.x + 0.5), 0.08, wz(gh.y + 0.5), gh.range, 1, gh.range, 0, 0, 0, _c);
        this.rangeFill.push(wx(gh.x + 0.5), 0.05, wz(gh.y + 0.5), gh.range, 1, gh.range, 0, 0, 0, _c);
      }
    } else this.ghost.visible = false;
    // Hero target
    const h = g.s.hero;
    if (h.path.length) {
      _c.setHex(C.amber).multiplyScalar(0.8);
      this.markers.push(wx(h.tx + 0.5), 0.08, wz(h.ty + 0.5), 0.7 + 0.08 * Math.sin(T * 6), 1, 0.7 + 0.08 * Math.sin(T * 6), 0, 0, 0, _c);
    }
    this.lateOverlays(ui, T);
    this.dots.end(); this.markers.end(); this.rangeRing.end(); this.rangeFill.end(); this.links.end();
    this.gates.end(); this.swirl.end(); this.portal.end();
  }
}

Object.assign(View.prototype, lateView, secretView);
const ENEMIES_BUR_UP = { cervik: 7, hlubinny_cerv: 9 };
