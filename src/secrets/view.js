// View of the surprises of stage 5: props on the island, things in the sky, little animations.
// Mixed into View (this = View). The logic is in world.js, the interface in ui.js.
import * as THREE from '../../vendor/three.module.min.js';
import { W, H, idx, inBounds } from '../sim/grid.js';
import { C } from '../render/palette.js';
import { Pool, Builder, additive, lit, unlit, seeded } from '../render/geo.js';
import { wx, wz } from '../render/island.js';
import { K_PUFF, K_GLOW, K_CUBE } from '../render/fx.js';
import { LH } from '../render/models.js';
import { chapterOf } from '../data/waves.js';
import { CROSSES, POND } from './world.js';
import { SX } from './texts2.js';

const _c = new THREE.Color();
const _c2 = new THREE.Color();
const _v = new THREE.Vector3();
const FOV = 28;
const SHORE = { bottle: [7.35, 20.62], boat: [12.4, 20.78], pepa: [8.3, 20.42] };
const NIGHT = [6, 8, 10];
// 5 × 7 dots: D O M Ů
const FONT = {
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
};

function hatGeos(EM) {
  const g = [null];
  let b = new Builder();                                   // 1 cylindr
  b.cyl(0.5, 0.5, 0.06, 12, 0x1D1826, { shade: 1 }); b.cyl(0.3, 0.32, 0.5, 12, 0x1D1826, { y: 0.05, shade: 0.8 }); b.cyl(0.33, 0.33, 0.09, 12, C.red, { y: 0.07, shade: 1 });
  g.push(b.build());
  b = new Builder();                                       // 2 kovbojský
  b.cyl(0.62, 0.56, 0.05, 12, 0x8F6449, { shade: 0.9 }); b.cyl(0.24, 0.32, 0.3, 10, 0x8F6449, { y: 0.04, shade: 0.8 }); b.cyl(0.33, 0.33, 0.06, 10, 0x3B2F2F, { y: 0.06, shade: 1 });
  g.push(b.build());
  b = new Builder();                                       // 3 kulich
  b.cone(0.4, 0.56, 10, C.red, { y: 0.04, shade: 0.8 }); b.cyl(0.42, 0.42, 0.12, 10, 0xFFFFFF, { shade: 0.95 }); b.sphere(0.13, 0xFFFFFF, { y: 0.62, shade: 1 }, 6, 5);
  g.push(b.build());
  b = new Builder();                                       // 4 koruna
  b.cyl(0.36, 0.36, 0.16, 10, C.gold, { shade: 0.8 });
  for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; b.cone(0.1, 0.26, 4, C.gold, { x: Math.cos(a) * 0.3, y: 0.14, z: Math.sin(a) * 0.3, shade: 0.9 }); b.sphere(0.05, C.red, { x: Math.cos(a) * 0.3, y: 0.42, z: Math.sin(a) * 0.3, shade: 1 }, 5, 4); }
  g.push(b.build());
  b = new Builder();                                       // 5 papírová lodička
  b.cone(0.5, 0.42, 4, 0xFFFDF2, { y: 0.06, sz: 0.45, ry: Math.PI / 4, shade: 0.85 }); b.box(0.8, 0.12, 0.34, 0xF1EBDD, { shade: 0.95 });
  g.push(b.build());
  b = new Builder();                                       // 6 hrnec
  b.cyl(0.38, 0.34, 0.42, 12, 0x9A9CA5, { shade: 0.75 }); b.cyl(0.41, 0.41, 0.05, 12, 0x6C6E78, { y: 0.4, shade: 1 });
  b.box(0.18, 0.05, 0.09, 0x3B2F2F, { x: 0.46, y: 0.3 }); b.box(0.18, 0.05, 0.09, 0x3B2F2F, { x: -0.46, y: 0.3 });
  g.push(b.build());
  g.push(EM.cap);                                          // 7 kapitánská čepice
  return g;
}

export const secretView = {
  // ---------- building the props ----------
  buildSecret(s, EM) {
    const P = [];
    const pool = (geo, mat, cap, o = {}) => { const p = new Pool(s, geo, mat, cap, { color: true, ...o }); P.push(p); return p; };
    const mesh = (geo, mat, parent = s) => { const m = new THREE.Mesh(geo, mat); m.visible = false; parent.add(m); return m; };
    this.sxPools = P;
    this.sxTaps = [];
    this.sx = this.sx || {};          // flags set by the interface (ui.js)
    this.sxT = {};                    // countdowns of running animations
    this.sxV = {};                    // other values the animations keep
    const flat = this.matFlat, warmM = this.matWarm;

    // hats (enemies, Knot)
    this.sxHatGeo = hatGeos(EM);
    this.sxHat = this.sxHatGeo.map((g, i) => (g ? pool(g, flat, i === 3 ? 520 : 10, { shadow: false }) : null));
    // little slimes of our own (the wanderer, the pet, the dancers) with eyes
    this.sxBlob = pool(EM.blob, this.matSmooth, 24, { shadow: true });
    this.sxEye = pool(EM.ball, new THREE.MeshBasicMaterial({ color: 0xffffff }), 80);
    this.sxPupil = pool(EM.dot, new THREE.MeshBasicMaterial({ color: C.ink }), 80);
    this.sxRobot = pool(EM.robot, flat, 2, { shadow: true });
    this.sxRoller = pool(EM.roller, flat, 2, { shadow: true });
    // white flag, sign stick, pumpkin stem
    const fl = new Builder();
    fl.box(0.04, 0.9, 0.04, C.wood, { shade: 1 }); fl.box(0.42, 0.26, 0.03, 0xFFFFFF, { x: 0.22, y: 0.62, shade: 0.95 });
    this.sxFlag = pool(fl.build(), flat, 3);
    this.sxStick = pool(new Builder().box(0.05, 1.0, 0.05, C.wood, { shade: 1 }).build(), flat, 6);
    this.sxStem = pool(new Builder().cyl(0.05, 0.07, 0.16, 5, 0x4E8A45, { shade: 1 }).build(), flat, 200);
    // signs and the banner: one small picture with all the texts
    const cv = document.createElement('canvas');
    cv.width = 512; cv.height = 320;
    const g2 = cv.getContext('2d');
    g2.fillStyle = '#FFFDF2'; g2.fillRect(0, 0, 512, 320);
    g2.fillStyle = '#3B2F2F'; g2.textAlign = 'center'; g2.textBaseline = 'middle';
    const rows = [SX.signs[1], SX.signs[2], SX.signs[3], SX.signs[4], SX.banner];
    rows.forEach((t, i) => { g2.font = `900 ${i === 4 ? 30 : 42}px system-ui, sans-serif`; g2.fillText(t, 256, 32 + i * 64, 500); g2.strokeStyle = '#8F6449'; g2.lineWidth = 4; g2.strokeRect(2, i * 64 + 2, 508, 60); });
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const signMat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
    this.sxBoards = rows.map((t, i) => {
      const wd = i === 4 ? 2.6 : 1.7, hg = wd * 60 / 512 * (i === 4 ? 1 : 1.25);
      const geo = new THREE.PlaneGeometry(wd, hg);
      const uv = geo.attributes.uv;
      for (let k = 0; k < uv.count; k++) uv.setY(k, 1 - (i + (1 - uv.getY(k))) * 64 / 320);
      const m = mesh(geo, signMat);
      m.renderOrder = 8;
      return m;
    });
    // crosses in the grass, footprints, garden, flowers, ore, lanterns
    this.sxCross = pool(new THREE.BoxGeometry(0.5, 0.012, 0.07), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }), 12, { order: 1 });
    this.sxFoot = pool(new THREE.CircleGeometry(0.5, 10).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x1D2A3A, transparent: true, opacity: 0.4, depthWrite: false }), 60, { order: 1 });
    const gd = new Builder();
    gd.box(0.84, 0.06, 0.84, C.soil, { shade: 1 });
    const fr = seeded(71);
    for (let i = 0; i < 9; i++) { const x = (fr() - 0.5) * 0.7, z = (fr() - 0.5) * 0.7; gd.box(0.02, 0.16, 0.02, 0x4E8A45, { x, z, y: 0.05 }); gd.sphere(0.055, [C.coral, C.amber, 0xFFFFFF, 0xD88AD8][i % 4], { x, y: 0.24, z, shade: 1 }, 5, 4); }
    gd.cyl(0.13, 0.17, 0.12, 8, 0xE0B050, { x: 0.18, y: 0.06, z: -0.16 }); gd.cyl(0.09, 0.13, 0.1, 8, 0xE8BE60, { x: 0.18, y: 0.18, z: -0.16 }); gd.cyl(0.03, 0.09, 0.08, 8, 0xF0CC70, { x: 0.18, y: 0.28, z: -0.16 });
    gd.box(0.05, 0.05, 0.02, 0x3B2F2F, { x: 0.18, y: 0.1, z: -0.0 });
    this.sxGarden = pool(gd.build(), flat, 8, { shadow: true });
    const fw = new Builder();
    fw.box(0.02, 0.13, 0.02, 0x4E8A45, {}); fw.sphere(0.05, 0xffffff, { y: 0.15, shade: 1 }, 5, 4);
    this.sxFlower = pool(fw.build(), flat, 360);
    this.sxOre = pool(new Builder().dodeca(0.13, C.ore, { shade: 0.8, top: C.oreDot, topFrom: 0.6 }).build(), flat, 8, { shadow: true });
    const ln = new Builder();
    ln.cyl(0.11, 0.08, 0.26, 6, 0xFFB060, { shade: 0.8 }); ln.cyl(0.09, 0.11, 0.04, 6, 0xB5553C, { y: 0.26, shade: 1 }); ln.box(0.05, 0.05, 0.05, 0x3B2F2F, { y: -0.05, shade: 1 });
    this.sxLantern = pool(ln.build(), unlit(), 12);
    this.sxGlow = pool(new THREE.IcosahedronGeometry(1, 1), additive(0xffffff, 0.5), 40, { order: 6 });
    this.sxRing = pool(new THREE.RingGeometry(0.4, 0.5, 32).rotateX(-Math.PI / 2), additive(0xffffff, 1), 6, { order: 3 });
    // secret buildings (P-17)
    const ic = new Builder();
    ic.bevel(0.78, 0.4, 0.7, 0.04, C.cream, { shade: 0.8 }); ic.box(0.8, 0.05, 0.3, C.woodLight, { y: 0.4, z: 0.26, shade: 1 });
    for (let i = 0; i < 5; i++) ic.box(0.17, 0.06, 0.86, i % 2 ? 0xFFFFFF : C.coral, { x: -0.34 + i * 0.17, y: 0.92, rx: 0.12, shade: 1 });
    ic.box(0.05, 0.5, 0.05, C.wood, { x: -0.36, y: 0.42, z: -0.3 }); ic.box(0.05, 0.5, 0.05, C.wood, { x: 0.36, y: 0.42, z: -0.3 });
    ic.cone(0.16, 0.36, 8, 0xD9A066, { y: 1.34, rx: Math.PI, shade: 0.9 }); ic.sphere(0.17, 0xFFB6C9, { y: 1.42, shade: 0.9 }, 8, 6); ic.sphere(0.13, 0xFFFDF2, { y: 1.62, shade: 0.95 }, 8, 6); ic.sphere(0.05, C.red, { y: 1.76, shade: 1 }, 5, 4);
    this.sxIce = pool(ic.build(), warmM, 3, { shadow: true });
    const vt = new Builder();
    vt.bevel(0.8, 0.82, 0.76, 0.05, 0x4B4652, { shade: 0.75 }); vt.box(0.62, 0.62, 0.04, 0x5E5966, { y: 0.1, z: 0.39, shade: 0.9 });
    vt.torus(0.16, 0.035, C.brass, { y: 0.42, z: 0.43, rx: Math.PI / 2, shade: 1 }, 4, 12); vt.box(0.3, 0.04, 0.04, C.brass, { y: 0.4, z: 0.43 }); vt.box(0.04, 0.3, 0.04, C.brass, { y: 0.27, z: 0.43 });
    vt.box(0.07, 0.14, 0.05, C.brass, { x: -0.25, y: 0.5, z: 0.41 }); vt.box(0.07, 0.14, 0.05, C.brass, { x: -0.25, y: 0.2, z: 0.41 });
    this.sxVault = pool(vt.build(), warmM, 2, { shadow: true });
    // eyes in the mist (P-36), aurora ribbons
    this.sxMistEye = pool(new THREE.SphereGeometry(0.085, 6, 4), new THREE.MeshBasicMaterial({ color: 0xFFE14A, fog: false }), 460, { color: false });
    const er = seeded(977);
    this.sxEyeSpots = [];
    for (let i = 0; i < 230; i++) this.sxEyeSpots.push({ side: Math.floor(er() * 4), u: er(), out: 0.5 + er() * 3.2, y: 0.9 + er() * 0.9, ph: er() * 60, sp: 0.25 + er() * 0.5 });
    this.sxAur = pool(new THREE.BoxGeometry(0.55, 1, 0.02), additive(0xffffff, 0.2, { side: THREE.DoubleSide, fog: false }), 22, { order: 5 });
    // small stars around a dizzy head
    this.sxStarP = pool(new THREE.OctahedronGeometry(0.06, 0), new THREE.MeshBasicMaterial({ color: C.gold }), 6, { color: false });

    // ---- single objects ----
    // the bottle
    const bt = new Builder();
    bt.cyl(0.09, 0.09, 0.3, 8, 0x5FB58A, { rz: Math.PI / 2, x: 0.15, y: 0.09, shade: 0.9 }); bt.cyl(0.035, 0.07, 0.14, 8, 0x5FB58A, { rz: Math.PI / 2, x: -0.03, y: 0.09, shade: 0.9 });
    bt.cyl(0.04, 0.04, 0.05, 6, C.woodLight, { rz: Math.PI / 2, x: -0.17, y: 0.09 }); bt.box(0.16, 0.1, 0.1, 0xFFFDF2, { x: 0.02, y: 0.04, shade: 1 });
    this.sxBottle = mesh(bt.build(), lit({ transparent: true, opacity: 0.92 }));
    // the pedlar's boat
    const bo = new Builder();
    bo.box(1.3, 0.2, 0.56, C.wood, { shade: 0.75 }); bo.box(1.1, 0.08, 0.42, C.woodLight, { y: 0.18, shade: 1 }); bo.cone(0.28, 0.4, 4, C.wood, { x: 0.82, y: 0.0, rz: -Math.PI / 2, sz: 1, shade: 0.9 });
    bo.box(0.05, 0.9, 0.05, C.wood, { x: -0.1, y: 0.2 }); bo.box(0.03, 0.5, 0.62, 0xF4E9D8, { x: -0.07, y: 0.52, shade: 0.9 });
    bo.cyl(0.14, 0.17, 0.36, 8, 0x7A4FA0, { x: 0.36, y: 0.24, shade: 0.8 }); bo.sphere(0.12, 0xF2D2B8, { x: 0.36, y: 0.7, shade: 0.9 }, 8, 6);
    bo.cyl(0.2, 0.2, 0.03, 10, 0x3B2F2F, { x: 0.36, y: 0.78 }); bo.cyl(0.11, 0.12, 0.16, 10, 0x3B2F2F, { x: 0.36, y: 0.8 });
    bo.box(0.22, 0.2, 0.22, 0xC9A227, { x: -0.42, y: 0.24, shade: 0.85 }); bo.box(0.26, 0.24, 0.26, 0x8F6449, { x: -0.38, y: 0.24, z: 0.02, sy: 0.6, shade: 0.9 });
    bo.box(0.08, 0.1, 0.08, C.amber, { x: 0.62, y: 0.26, glow: 1.4, shade: 1 });
    this.sxBoat = mesh(bo.build(), lit());
    this.sxBoat.castShadow = true;
    // the cat
    const ct = new Builder();
    ct.sphere(0.13, 0x8D8F98, { y: 0.14, sx: 1.5, shade: 0.8 }, 8, 6); ct.sphere(0.095, 0x8D8F98, { x: 0.2, y: 0.27, shade: 0.85 }, 8, 6);
    ct.cone(0.035, 0.08, 4, 0x8D8F98, { x: 0.2, y: 0.34, z: -0.05 }); ct.cone(0.035, 0.08, 4, 0x8D8F98, { x: 0.2, y: 0.34, z: 0.05 });
    ct.box(0.26, 0.03, 0.03, 0x6C6E78, { x: -0.3, y: 0.2, rz: 0.7 });
    ct.sphere(0.016, 0x9DFF7A, { x: 0.285, y: 0.29, z: -0.035, shade: 1 }, 4, 3); ct.sphere(0.016, 0x9DFF7A, { x: 0.285, y: 0.29, z: 0.035, shade: 1 }, 4, 3);
    for (const [x, z] of [[0.1, 0.06], [0.1, -0.06], [-0.1, 0.06], [-0.1, -0.06]]) ct.box(0.04, 0.1, 0.04, 0x7C7E88, { x, z });
    this.sxCat = mesh(ct.build(), lit());
    this.sxCat.castShadow = true;
    // the egg and Pepa
    const eg = new THREE.SphereGeometry(0.16, 10, 8); eg.scale(1, 1.3, 1);
    this.sxEgg = mesh(new Builder().add(eg, 0xE9E2C8, { y: 0.16, shade: 0.8 }).sphere(0.03, 0x6E5A4E, { x: 0.08, y: 0.22, z: 0.12 }, 4, 3).sphere(0.025, 0x6E5A4E, { x: -0.06, y: 0.14, z: 0.14 }, 4, 3).build(), lit());
    const pp = new Builder();
    pp.add(EM.runner, C.pulec, { shade: 1 }); pp.sphere(0.09, 0xffffff, { x: 0.3, y: 0.42, z: 0.17, shade: 1 }, 6, 5); pp.sphere(0.09, 0xffffff, { x: 0.3, y: 0.42, z: -0.17, shade: 1 }, 6, 5);
    pp.sphere(0.045, C.ink, { x: 0.37, y: 0.43, z: 0.17, shade: 1 }, 5, 4); pp.sphere(0.045, C.ink, { x: 0.37, y: 0.43, z: -0.17, shade: 1 }, 5, 4);
    this.sxPepa = mesh(pp.build(), lit());
    // the gull (body and two wings) and the owl
    const gb = new Builder();
    gb.sphere(0.1, 0xFFFFFF, { sx: 1.7, shade: 0.85 }, 8, 6); gb.sphere(0.07, 0xFFFFFF, { x: 0.17, y: 0.06, shade: 0.9 }, 6, 5); gb.cone(0.025, 0.09, 4, C.amber, { x: 0.27, y: 0.05, rz: -Math.PI / 2 });
    gb.sphere(0.012, C.ink, { x: 0.21, y: 0.09, z: 0.05 }, 4, 3); gb.sphere(0.012, C.ink, { x: 0.21, y: 0.09, z: -0.05 }, 4, 3); gb.box(0.1, 0.02, 0.1, 0xC9D0DA, { x: -0.2, y: -0.01 });
    this.sxGull = new THREE.Group();
    this.sxGull.visible = false;
    s.add(this.sxGull);
    const gm = lit();
    this.sxGull.add(new THREE.Mesh(gb.build(), gm));
    const wg = new Builder().box(0.14, 0.015, 0.36, 0xC9D0DA, { z: 0.18, shade: 1 }).box(0.08, 0.015, 0.1, 0x3B2F2F, { z: 0.4, shade: 1 }).build();
    this.sxWingL = new THREE.Mesh(wg, gm); this.sxWingR = new THREE.Mesh(wg, gm);
    this.sxWingR.scale.z = -1;
    this.sxGull.add(this.sxWingL); this.sxGull.add(this.sxWingR);
    const ow = new Builder();
    ow.sphere(0.13, 0x8F6449, { y: 0.14, sy: 1.25, shade: 0.75 }, 8, 6); ow.sphere(0.055, 0xFFFDF2, { x: -0.05, y: 0.21, z: 0.1, shade: 1 }, 6, 5); ow.sphere(0.055, 0xFFFDF2, { x: 0.05, y: 0.21, z: 0.1, shade: 1 }, 6, 5);
    ow.sphere(0.025, C.ink, { x: -0.05, y: 0.21, z: 0.14 }, 5, 4); ow.sphere(0.025, C.ink, { x: 0.05, y: 0.21, z: 0.14 }, 5, 4); ow.cone(0.02, 0.05, 4, C.amber, { y: 0.14, z: 0.14, rx: Math.PI / 2 });
    ow.cone(0.03, 0.08, 4, 0x6B4A3A, { x: -0.08, y: 0.27 }); ow.cone(0.03, 0.08, 4, 0x6B4A3A, { x: 0.08, y: 0.27 });
    this.sxOwl = mesh(ow.build(), lit());
    this.sxOwl.position.set(this.lhX, LH.top + 0.04, this.lhZ);
    // Knot's thermos and hats
    this.sxThermos = mesh(new Builder().cyl(0.05, 0.05, 0.18, 8, C.red, { shade: 0.85 }).cyl(0.055, 0.055, 0.05, 8, 0xC9D0DA, { y: 0.18 }).build(), lit(), this.K.root);
    this.sxThermos.position.set(0.3, 0, 0.12);
    this.sxKnotHats = this.sxHatGeo.map((g) => { if (!g) return null; const m = mesh(g, flat, this.K.head); m.position.y = 0.2; m.scale.setScalar(0.46); return m; });
    this.sxKnotHats[7].rotation.y = -Math.PI / 2;
    // the moon over the mist, its face, the cheese holes and the mouse
    this.sxMoon = new THREE.Group();
    this.sxMoon.visible = false;
    s.add(this.sxMoon);
    this.sxMoonMat = new THREE.MeshBasicMaterial({ color: 0xF2F0E0, fog: false });
    this.sxMoon.add(new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 12), this.sxMoonMat));
    const dk = new THREE.MeshBasicMaterial({ color: 0x8C8A78, fog: false });
    this.sxMoonEyeL = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), dk); this.sxMoonEyeL.position.set(-0.2, 0.47, 0.32);
    this.sxMoonEyeR = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), dk); this.sxMoonEyeR.position.set(0.2, 0.47, 0.32);
    this.sxMoon.add(this.sxMoonEyeL); this.sxMoon.add(this.sxMoonEyeR);
    this.sxHoles = new THREE.Group(); this.sxHoles.visible = false; this.sxMoon.add(this.sxHoles);
    const hm = new THREE.MeshBasicMaterial({ color: 0xD9A93A, fog: false });
    for (const [x, y, z, r] of [[-0.3, 0.38, -0.2, 0.13], [0.28, 0.44, -0.15, 0.1], [0.05, 0.56, 0.05, 0.11], [-0.1, 0.4, 0.4, 0.08]]) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), hm); m.position.set(x, y, z); this.sxHoles.add(m); }
    this.sxBite = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), new THREE.MeshBasicMaterial({ color: 0x141A3A, fog: false }));
    this.sxBite.position.set(0.5, 0.3, 0.35); this.sxHoles.add(this.sxBite);
    this.sxMouse = new THREE.Mesh(new Builder().sphere(0.07, 0x8D8F98, { sx: 1.5 }, 6, 5).sphere(0.03, 0xE8A0A0, { x: 0.02, y: 0.06, z: 0.04 }, 4, 3).sphere(0.03, 0xE8A0A0, { x: 0.02, y: 0.06, z: -0.04 }, 4, 3).box(0.14, 0.012, 0.012, 0xE8A0A0, { x: -0.16 }).build(), new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }));
    this.sxMouse.visible = false; this.sxMoon.add(this.sxMouse);
    // rainbows: the big one behind the island and the small one over the spring
    const mkBow = () => {
      const g = new THREE.Group();
      [0xFF5A45, 0xFFA43A, 0xFFE45A, 0x6CE06C, 0x5AA8FF, 0xA070FF].forEach((col, i) => { const m = new THREE.Mesh(new THREE.TorusGeometry(1 - i * 0.05, 0.026, 4, 28, Math.PI), additive(col, 0.3, { fog: false, side: THREE.DoubleSide })); m.renderOrder = 5; g.add(m); });
      g.visible = false; s.add(g); return g;
    };
    this.sxBow = mkBow(); this.sxBowS = mkBow();
    // the whale of mist
    const wh = new Builder();
    wh.sphere(1, 0xffffff, { sx: 2.6, sy: 0.95, sz: 1.1, shade: 0.7 }, 14, 10); wh.sphere(0.6, 0xffffff, { x: -2.4, sx: 1.8, sy: 0.7, shade: 0.75 }, 10, 8);
    wh.box(0.9, 0.12, 1.9, 0xffffff, { x: -3.6, y: 0.1, shade: 0.9 }); wh.box(0.9, 0.1, 0.5, 0xffffff, { x: 0.8, y: -0.5, z: 1.1, ry: 0.5, shade: 0.9 }); wh.box(0.9, 0.1, 0.5, 0xffffff, { x: 0.8, y: -0.5, z: -1.1, ry: -0.5, shade: 0.9 });
    wh.sphere(0.09, C.ink, { x: 2.0, y: 0.15, z: 0.82 }, 6, 5); wh.sphere(0.09, C.ink, { x: 2.0, y: 0.15, z: -0.82 }, 6, 5);
    this.sxWhale = mesh(wh.build(), new THREE.MeshLambertMaterial({ vertexColors: true, color: 0xDDE6F5, emissive: 0x5A6A8A, transparent: true, opacity: 0.62, depthWrite: false }));
    this.sxWhale.renderOrder = 6;
    // the plane and the paper plane
    const pl = new Builder();
    pl.cyl(0.12, 0.08, 1.0, 8, 0xF4F1EA, { rz: -Math.PI / 2, x: -0.5, shade: 0.9 }); pl.box(0.3, 0.04, 1.5, C.coral, { x: 0.05, y: 0.02, shade: 1 }); pl.box(0.16, 0.03, 0.56, C.coral, { x: -0.44, y: 0.02 }); pl.box(0.16, 0.26, 0.03, C.coral, { x: -0.46, y: 0.02 });
    for (let i = 0; i < 4; i++) pl.box(0.07, 0.07, 0.01, 0x9FE8FF, { x: 0.3 - i * 0.16, y: 0.02, z: 0.115, shade: 1 });
    this.sxPlane = mesh(pl.build(), lit());
    this.sxPaper = mesh(new Builder().cone(0.16, 0.5, 3, 0xFFFDF2, { rz: -Math.PI / 2, sy: 0.25, shade: 0.9 }).build(), unlit());
    // the fish
    this.sxFish = mesh(new Builder().sphere(0.08, 0xC9D0DA, { sx: 2, sz: 0.5, shade: 0.9 }, 6, 5).cone(0.07, 0.1, 3, 0xC9D0DA, { x: -0.2, rz: -Math.PI / 2, sz: 0.3 }).build(), lit());
    // the pond: the reflection of the lighthouse, the figure on its gallery, the eye
    const px = wx((POND.x0 + POND.x1 + 1) / 2), pz = wz((POND.y0 + POND.y1 + 1) / 2);
    const flatM = (col, op, add) => (add ? additive(col, op) : new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false }));
    const decal = (w, d, mat, x, z, order = 2) => { const m = mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), mat); m.position.set(px + x, -0.045, pz + z); m.renderOrder = order; return m; };
    this.sxRefl = [decal(0.46, 1.5, flatM(0x1D2A3A, 0.16), 0, -0.25), decal(0.62, 0.1, flatM(0x1D2A3A, 0.2), 0, 0.5), decal(0.34, 0.34, flatM(0x1D2A3A, 0.2), 0, 0.72), decal(0.2, 0.2, flatM(C.amber, 0.5, true), 0, 0.72, 3)];
    this.sxFig = [decal(0.09, 0.26, flatM(0x0E1420, 0.6), 0.2, 0.62, 3), decal(0.08, 0.08, flatM(C.amber, 0.9, true), 0.27, 0.56, 4)];
    this.sxEyeD = [decal(2.0, 3.0, flatM(0x05060F, 0.9), 0, 0, 3), decal(1, 1, flatM(0xF2F0E0, 1), 0, 0, 4), decal(1, 1, flatM(0x1D1826, 1), 0, 0, 5), decal(0.12, 0.12, flatM(0xffffff, 1), 0.12, -0.1, 6)];
    this.sxEyeD[1].geometry = new THREE.CircleGeometry(0.5, 24).rotateX(-Math.PI / 2);
    this.sxEyeD[2].geometry = new THREE.CircleGeometry(0.5, 20).rotateX(-Math.PI / 2);
    this.sxPondC = { x: px, z: pz };
    this.sxFlowers = new Map(); // P-50: flower places per building
    this.sxExtra = [];        // short-lived slimes (the dancers, the sleeper from the mine)
    this.sxPet = { x: 0, y: 0, on: false };
  },

  // ---------- helpers ----------
  sxPoolsBegin() { for (const p of this.sxPools) p.begin(); for (const b of this.sxBoards) b.visible = false; this.sxTaps.length = 0; },
  sxPoolsEnd() { for (const p of this.sxPools) p.end(); },
  sxTap(k, X, Y, Z, r = 0.5) { this.sxTaps.push({ k, X, Y, Z, r }); },

  // Which thing of the surprises is under this point of the screen (or null).
  sxHit(lx, ly) {
    if (!this.vh) return null;
    const pxPerUnit = this.vh / (2 * this.cam.d * Math.tan(FOV * Math.PI / 360));
    let best = null, bd = 1e9;
    for (const t of this.sxTaps) {
      _v.set(t.X, t.Y, t.Z).project(this.camera);
      if (_v.z > 1) continue;
      const x = (_v.x + 1) / 2 * this.vw, y = (1 - _v.y) / 2 * this.vh;
      const d = Math.hypot(lx - x, ly - y), r = Math.max(24, t.r * pxPerUnit);
      if (d < r && d < bd) { bd = d; best = t.k; }
    }
    return best;
  },

  // A place on the "shelf" of free screen around the open part of the island: behind its north edge
  // when the screen is tall, beside its west edge when it is wide. u = 0..1 along, out = how far, y = height.
  sxShelf(u, out, y, v) {
    const r = this.openRect || { x0: -9.5, x1: 9.5, z0: -10.5, z1: 10.5 };
    if (this.vw > this.vh) v.set(r.x0 - out, y, r.z1 - 1 + (r.z0 + 1 - r.z1) * u);
    else v.set(r.x0 + (r.x1 - r.x0) * u, y, r.z0 - out);
    return v;
  },

  sxSlime(X, Y, Z, d, ang, color, T, seed, hop = 0) {
    const st = Math.sin(T * 3.4 + seed);
    const sy = 1 + 0.14 * st, sxz = 1 - 0.07 * st, base = Y + hop;
    this.sxBlob.push(X, base, Z, d * sxz, d * sy, d * sxz, -ang, 0, 0, color);
    const fx = Math.cos(ang), fz = Math.sin(ang), es = d * 0.2, eg = es * 1.15, ef = d * 0.37, eh = d * 0.5 * sy;
    for (const side of [-1, 1]) {
      const ox = fx * ef - fz * side * eg, oz = fz * ef + fx * side * eg;
      this.sxEye.push(X + ox, base + eh, Z + oz, es, es, es);
      this.sxPupil.push(X + ox + fx * es * 0.24, base + eh + es * 0.17, Z + oz + fz * es * 0.24 + es * 0.08, es * 0.56, es * 0.56, es * 0.56);
    }
    this.shadows.push(X, Y + 0.025, Z, d * 1.1, 1, d * 1.1);
  },

  // ---------- enemies ----------

  // Where an enemy looks (pause stare, the dark of wave 66, the waving learner).
  sxAngle(e, ang) {
    if (this.sxT.stareAll > 0 || this.sxV.stareId === e.id || (e.wav && e.waitT > 0)) return Math.PI / 2;
    return ang;
  },

  sxEnemyExtras(e, look, X, base, Z, d, sy, ang, T) {
    const top = base + d * (look.kind === 'blob' ? 0.8 : look.kind === 'runner' ? 0.62 : look.kind === 'cloud' ? 0.6 : look.kind === 'mite' ? 0.86 : look.kind === 'drone' ? 0.72 : 0.95) * sy;
    const hat = e.hat || (this.sx.xmas && !e.boss && look.kind !== 'heart' ? 3 : 0);
    if (hat && this.sxHat[hat]) this.sxHat[hat].push(X, top, Z, d * 0.6, d * 0.6, d * 0.6, hat === 7 ? -ang : T * 0.0 + e.seed * 6);
    if (this.sx.pumpkin && look.kind === 'blob' && !e.golden && !hat) this.sxStem.push(X, top + d * 0.02, Z, d, d, d);
    if (e.sign) {
      const sx = X + d * 0.42, sway = Math.sin(T * 5 + e.seed * 9) * 0.08;
      this.sxStick.push(sx, base, Z, 1, 1, 1, 0, 0, sway);
      const b = this.sxBoards[e.sign - 1];
      if (b && !b.visible) { b.visible = true; b.position.set(sx - sway * 0.9, base + 1.12, Z); b.rotation.set(-0.5, 0, sway); }
    }
    if (e.banner) {
      const b = this.sxBoards[4];
      b.visible = true;
      b.position.set(X - Math.cos(ang) * 1.6, base + 0.05, Z - Math.sin(ang) * 1.6);
      b.rotation.set(-0.55, 0, Math.sin(T * 4) * 0.04);
      this.sxStick.push(X - Math.cos(ang) * 0.3, base - 0.3, Z - Math.sin(ang) * 0.3, 1, 0.5, 1, 0, 0, 1.2);
    }
    if (e.flag) this.sxFlag.push(X - Math.sin(ang) * d * 0.4, base + d * 0.25, Z + Math.cos(ang) * d * 0.4, 1, 1, 1, 0.4 + Math.sin(T * 3) * 0.2, 0, Math.sin(T * 5) * 0.06);
    if (e.wav && e.waitT > 0) { const s = d * 0.2; this.sxEye.push(X + d * 0.5, base + d * (1.0 + 0.16 * Math.sin(T * 14)), Z, s, s, s); }
  },

  // The wreck of the Válec lies where a wall would stand (P-22).
  sxSkin(b, X, base, Z) {
    if (b.skin !== 'valec') return false;
    _c.setRGB(0.62, 0.58, 0.55);
    this.sxRoller.push(X, base + 0.12, Z, 0.9, 0.9, 0.9, 0.7, 0.0, 0.42, _c);
    if (!this.fast && Math.random() < 0.02) this.fx.spawn(K_PUFF, X, base + 0.5, Z, 0.05, 0.4, 0, 1.4, 0.12, 0x6C6E78, 0, 0);
    return true;
  },

  // ---------- every frame ----------
  sxFrame(alpha, T, dt, ui) {
    const g = this.game, s = g.s, x = s.sec || {}, fx = this.fx, isl = this.island, tm = this.sxT, V = this.sxV, F = this.sx;
    const play = !this.title;
    const build = s.waves.length === 0;
    const ch = this.mood.ch;
    const cc = s.completedCount;
    for (const k in tm) if (tm[k] > 0) tm[k] -= dt;
    const h = s.hero;

    // P-01: the wandering slime and the pet
    if (play && x.wander && build) {
      const px = 6.85 + 1.45 * Math.sin(T * 0.25), dir = Math.cos(T * 0.25) >= 0 ? 0 : Math.PI;
      const hop = tm.petHop > 0 ? Math.sin((1 - tm.petHop / 0.45) * Math.PI) * 0.35 : 0;
      this.sxSlime(wx(px), -0.02, wz(20.55), 0.46, dir, 0x7FE0C8, T, 3, hop);
      this.sxTap('pet', wx(px), 0.2, wz(20.55), 0.5);
    }
    if (play && x.pet && x.pet === chapterOf(g.currentWaveNumber())) {
      const P = this.sxPet;
      const tx = h.x - Math.cos(h.face) * 0.62, ty = h.y - Math.sin(h.face) * 0.62;
      if (!P.on) { P.on = true; P.x = tx; P.y = ty; }
      const k = 1 - Math.exp(-3 * dt);
      const mx = (tx - P.x) * k, my = (ty - P.y) * k;
      P.x += mx; P.y += my;
      const mov = Math.abs(mx) + Math.abs(my) > 0.002;
      const gy = Math.max(0, isl.topAt(Math.max(0, Math.min(W - 1, Math.floor(P.x))), Math.max(0, Math.min(H - 1, Math.floor(P.y)))));
      if (!(h.swallowT > 0)) this.sxSlime(wx(P.x), gy > 0.5 ? 0 : gy, wz(P.y), 0.36, Math.atan2(h.y - P.y, h.x - P.x), 0x7FE0C8, T * (mov ? 2 : 1), 5, mov ? Math.abs(Math.sin(T * 9)) * 0.08 : 0);
    } else this.sxPet.on = false;
    // short-lived slimes: dancers around the lighthouse (P-30), the sleeper from the mine (P-29)
    if (F.dance) for (let i = 0; i < 8; i++) { const a = T * 0.9 + i * Math.PI / 4; this.sxSlime(this.lhX + Math.cos(a) * 1.7, 0, this.lhZ + Math.sin(a) * 1.3 - 0.2, 0.42, a + Math.PI / 2, [C.sliz, C.smejdil, 0x7FE0C8][i % 3], T * 2, i, Math.abs(Math.sin(T * 6 + i)) * 0.22); }
    for (let i = this.sxExtra.length - 1; i >= 0; i--) {
      const o = this.sxExtra[i];
      o.t += dt;
      if (o.t > o.life) { this.sxExtra.splice(i, 1); continue; }
      const k = o.t / o.life;
      this.sxSlime(o.x + o.vx * o.t, 0.02, o.z + o.vz * o.t, 0.4 * (k > 0.8 ? (1 - k) / 0.2 : 1), Math.atan2(o.vz, o.vx), C.sliz, T * 2, i, Math.abs(Math.sin(o.t * 7)) * 0.1);
    }

    // the bottle and the pedlar's boat at the shore
    const bottle = play && !!x.bottle;
    this.sxBottle.visible = bottle;
    if (bottle) {
      const X = wx(SHORE.bottle[0]), Z = wz(SHORE.bottle[1]);
      this.sxBottle.position.set(X, -0.1 + Math.sin(T * 1.6) * 0.03, Z);
      this.sxBottle.rotation.set(Math.sin(T * 1.1) * 0.15, 0.6, Math.sin(T * 1.6) * 0.2 - 0.2);
      _c.setHex(C.gold).multiplyScalar(0.5 + 0.4 * Math.sin(T * 3));
      this.sxRing.push(X, -0.04, Z, 0.9, 1, 0.9, 0, 0, 0, _c);
      this.sxTap('bottle', X, 0.05, Z, 0.6);
      if (!this.fast && Math.random() < dt * 2) fx.spawn(K_GLOW, X + (Math.random() - 0.5) * 0.4, 0.1, Z + (Math.random() - 0.5) * 0.3, 0, 0.35, 0, 0.9, 0.04, C.gold, 0, 0);
    }
    const boat = play && (!!x.merchant || tm.boatOut > 0);
    this.sxBoat.visible = boat;
    if (boat) {
      const k = x.merchant ? Math.max(0, tm.boatIn || 0) / 2.5 : 1 - Math.max(0, tm.boatOut) / 2.5;
      const X = wx(SHORE.boat[0]) + k * k * 9, Z = wz(SHORE.boat[1]);
      this.sxBoat.position.set(X, -0.16 + Math.sin(T * 1.3) * 0.03, Z);
      this.sxBoat.rotation.set(Math.sin(T * 0.9) * 0.04, Math.PI + 0.25, Math.sin(T * 1.3) * 0.05);
      if (x.merchant) { this.sxTap('boat', X, 0.3, Z, 0.9); _c.setHex(C.amber).multiplyScalar(0.5 + 0.4 * Math.sin(T * 3)); this.sxRing.push(X, -0.04, Z, 1.9, 1, 1.9, 0, 0, 0, _c); }
    }

    // P-24: the cat walks the maze, then lives at the lighthouse
    const walker = x.walk && x.walk.find((k) => k.k === 'cat');
    const benchCat = this.epilogue || this.titleDawn || s.finished;
    this.sxCat.visible = (!!walker && play) || (x.cat === 2 && !benchCat);
    if (walker && play) {
      const cx = walker.px + (walker.x - walker.px) * alpha, cy = walker.py + (walker.y - walker.py) * alpha;
      const mov = Math.abs(walker.x - walker.px) + Math.abs(walker.y - walker.py) > 1e-4;
      const a = mov ? Math.atan2(walker.y - walker.py, walker.x - walker.px) : Math.PI / 2;
      V.catA = a;
      const gy = Math.max(0, isl.topAt(Math.floor(walker.x), Math.floor(walker.y)));
      this.sxCat.position.set(wx(cx), gy + (mov ? Math.abs(Math.sin(T * 12)) * 0.03 : 0), wz(cy));
      this.sxCat.rotation.set(0, -a, 0);
      this.sxCat.scale.setScalar(1.25);
      this.shadows.push(wx(cx), gy + 0.025, wz(cy), 0.5, 1, 0.5);
    } else if (this.sxCat.visible) {
      const jump = tm.catJump > 0 ? Math.sin((1 - tm.catJump / 0.6) * Math.PI) : 0;
      this.sxCat.position.set(this.lhX - 0.42 + jump * 0.5, 0.23 + jump * 0.5, this.lhZ + 0.86 - jump * 0.4);
      this.sxCat.rotation.set(0, -Math.PI / 2 + Math.sin(T * 0.5) * 0.25, 0);
      this.sxCat.scale.setScalar(1.05);
      if (play) this.sxTap('cat', this.lhX - 0.42, 0.4, this.lhZ + 0.86, 0.4);
    }
    // P-23: the egg, then Pepa in the shallow water
    const eggOn = !!x.egg && !x.pepa;
    this.sxEgg.visible = eggOn;
    this.sxPepa.visible = !!x.pepa;
    if (eggOn) { this.sxEgg.position.set(wx(SHORE.pepa[0]), -0.06, wz(SHORE.pepa[1])); this.sxEgg.rotation.z = Math.sin(T * 2) * (cc >= x.egg + 4 ? 0.2 : 0.04); }
    if (x.pepa) {
      const sc = 0.55 * (1 + Math.min(1.3, x.pepa.n * 0.03)), lunge = tm.gulp > 0 ? Math.sin((1 - tm.gulp / 0.5) * Math.PI) : 0;
      this.sxPepa.position.set(wx(SHORE.pepa[0]) + lunge * 0.7, -0.1 + Math.sin(T * 2.2) * 0.02 + lunge * 0.25, wz(SHORE.pepa[1]) - lunge * 0.5);
      this.sxPepa.rotation.set(0, 0.5 - lunge * 0.9, 0);
      this.sxPepa.scale.set(sc, sc * (1 + 0.06 * Math.sin(T * 3)), sc);
    }
    // P-21: the tin soldier who stayed
    if (x.mech) {
      this.sxRobot.push(this.lhX + 0.45, 0.05, this.lhZ + 0.86, 0.5, 0.5, 0.5, -Math.PI / 2 + Math.sin(T * 0.6) * 0.3);
      this.sxFlag.push(this.lhX + 0.72, 0.05, this.lhZ + 0.92, 0.8, 0.8, 0.8, 0.4, 0, Math.sin(T * 2) * 0.05);
    }

    if (play) {
      // P-26: barely visible crosses in the grass
      _c.setRGB(0.2, 0.42, 0.18).multiplyScalar(1 - this.dark * 0.72);
      for (let i = 0; i < CROSSES.length; i++) {
        const [cx, cy] = CROSSES[i];
        if ((x.dug && x.dug[i]) || !g.open[idx(cx, cy)] || g.occ[idx(cx, cy)]) continue;
        const X = wx(cx + 0.5), Z = wz(cy + 0.5), y = Math.max(0, isl.topAt(cx, cy)) + 0.014;
        this.sxCross.push(X, y, Z, 1, 1, 1, Math.PI / 4, 0, 0, _c);
        this.sxCross.push(X, y, Z, 1, 1, 1, -Math.PI / 4, 0, 0, _c);
      }
      // P-16: gardens with bees
      for (const gd of g.sxGardens || []) {
        const X = wx(gd.x + 0.5), Z = wz(gd.y + 0.5);
        this.sxGarden.push(X, Math.max(0, isl.topAt(gd.x, gd.y)), Z);
        if (!this.fast && Math.random() < dt * 5) { const a = Math.random() * 6.28, r = 0.3 + Math.random() * 1.5; fx.spawn(K_GLOW, X + Math.cos(a) * r, 0.4 + Math.random() * 0.5, Z + Math.sin(a) * r, -Math.sin(a) * 1.2, 0, Math.cos(a) * 1.2, 0.5, 0.03, 0xFFE14A, 0, 0); }
      }
      // P-50: flowers around buildings that have stood for a long time; secret buildings; P-66 notes
      for (const b of s.buildings) {
        const X = wx(b.x + 0.5), Z = wz(b.y + 0.5), base = isl.topAt(b.x, b.y);
        if (cc - b.w0 >= 30) {
          let fl = this.sxFlowers.get(b.id);
          if (!fl) {
            const r = seeded(b.id * 7 + 3);
            fl = [];
            for (let i = 0; i < 6; i++) { const a = r() * 6.28, d = 0.44 + r() * 0.05; fl.push(Math.cos(a) * d, Math.sin(a) * d, a, [C.coral, C.amber, 0xFFFFFF, 0xD88AD8, 0xFFE9A8][Math.floor(r() * 5)]); }
            if (this.sxFlowers.size > 400) this.sxFlowers.clear();
            this.sxFlowers.set(b.id, fl);
          }
          for (let i = 0; i < 24; i += 4) this.sxFlower.push(X + fl[i], base, Z + fl[i + 1], 1, 1, 1, fl[i + 2], Math.sin(T * 1.4 + i) * 0.14, 0, fl[i + 3]);
        }
        if (b.type === 'icecream' && !b.wreck) this.sxIce.push(X, base, Z);
        else if (b.type === 'vault' && !b.wreck) this.sxVault.push(X, base, Z);
        if (g.sxQuart && g.sxQuart.has(b.id) && !this.fast && Math.random() < dt * 0.5) fx.spawn(K_GLOW, X, base + 1.5, Z, 0.1, 0.5, 0, 1, 0.05, 0xFFE9A8, 0, 0);
      }
      // P-25: the ore the meteor left
      if (x.meteor && !(tm.meteor > 0)) {
        const i = x.meteor - 1, mx = i % W, my = (i / W) | 0;
        if (!g.occ[i]) for (const [ox, oz, sc] of [[0.2, 0.2, 1], [-0.22, 0.1, 0.8], [0.05, -0.24, 1.2], [-0.15, -0.2, 0.7], [0.28, -0.1, 0.6]]) this.sxOre.push(wx(mx + 0.5) + ox, 0.06 * sc, wz(my + 0.5) + oz, sc, sc, sc, ox * 9);
      }
    }
    if (tm.meteor > 0) {
      const k = 1 - tm.meteor / 1.1, M = this.sxMeteorAt;
      const X = M.X + (1 - k) * 7, Y = 0.3 + (1 - k) * 12, Z = M.Z - (1 - k) * 6;
      for (let i = 0; i < 3; i++) fx.spawn(K_GLOW, X + (Math.random() - 0.5) * 0.3, Y + (Math.random() - 0.5) * 0.3, Z, 0.5, 0.8, -0.4, 0.5, 0.22 - i * 0.05, i ? 0xFF8A3A : 0xFFF2C8, 0, 0);
      if (tm.meteor - dt <= 0) { fx.flash(M.X, 0.4, M.Z, 2.4, 0xFFF2C8, 0.6); fx.ring(M.X, 0.08, M.Z, 0.3, 3.2, 0.9, C.orange); fx.debris(M.X, 0.2, M.Z, C.soil, 18, 3.6, 0.14); fx.debris(M.X, 0.2, M.Z, C.ore, 8, 2.6, 0.1); fx.dust(M.X, 0.1, M.Z, 14, 0xE9DCC2, 1.2, 0.35); this.shake(0.3); }
    }

    // ---- the sky shelf: lanterns, the moon, the aurora, the rainbow ----
    const lanterns = Math.min(9, Math.floor(Math.min(cc, 90) / 10));
    for (let i = 0; i < lanterns; i++) {
      if (this.title) _v.set(this.lhX + (i - 4) * 0.95, 5.0 + (i % 3) * 0.8, this.lhZ - 1.2 - (i % 2) * 1.2);
      else this.sxShelf(0.08 + i * 0.105, 0.5 + (i % 2) * 0.7, 1.7 + ((i * 37) % 10) * 0.09, _v);
      let X = _v.x, Y = _v.y + Math.sin(T * 0.7 + i * 1.7) * 0.12, Z = _v.z;
      if (i === lanterns - 1 && tm.lantern > 0) { const k = 1 - tm.lantern / 7, e = k * k * (3 - 2 * k); X = this.lhX + (X - this.lhX) * e; Y = LH.top - 0.8 + (Y - LH.top + 0.8) * e + Math.sin(k * Math.PI) * 1.5; Z = this.lhZ + (Z - this.lhZ) * e; }
      this.sxLantern.push(X, Y, Z, 1, 1, 1, i);
      _c.setHex(0xFFB060).multiplyScalar(0.3 + 0.08 * Math.sin(T * 2 + i));
      this.sxGlow.push(X, Y + 0.12, Z, 0.42, 0.42, 0.42, 0, 0, 0, _c);
    }
    const night = NIGHT.includes(ch) && play && !this.epilogue;
    this.sxMoon.visible = night;
    if (night) {
      this.sxShelf(0.8, 1.3, 1.5, _v);
      this.sxMoon.position.copy(_v);
      const cheese = !!F.cheese;
      this.sxMoonMat.color.setHex(cheese ? 0xFFD86B : 0xF2F0E0).multiplyScalar(ch === 10 ? 0.75 : 1);
      this.sxHoles.visible = cheese;
      this.sxMoonEyeR.scale.y = tm.wink > 0 ? 0.12 : 1;
      this.sxMouse.visible = tm.mouse > 0;
      if (tm.mouse > 0) { const k = 1 - tm.mouse / 2.4, a = -1.2 + k * 2.4; this.sxMouse.position.set(Math.sin(a) * 0.66, 0.1 + Math.cos(a) * 0.62, 0.2); this.sxMouse.rotation.z = -a; }
      _c.setHex(0xF2F0E0).multiplyScalar(0.12);
      this.sxGlow.push(_v.x, _v.y, _v.z, 1.1, 1.1, 1.1, 0, 0, 0, _c);
      this.sxTap('moon', _v.x, _v.y, _v.z, 0.8);
    }
    if (tm.aurora > 0 && play) {
      const fade = Math.min(1, tm.aurora / 4, (V.auroraLen - tm.aurora) / 4);
      for (let i = 0; i < 18; i++) {
        const u = 0.06 + i * 0.052, wv = Math.sin(T * 0.5 + i * 0.7);
        this.sxShelf(u, 1.6 + wv * 0.5, 2.6 + Math.sin(T * 0.35 + i) * 0.4, _v);
        _c.setHex(0x6CFFB0).lerp(_c2.setHex(0xB07AFF), 0.5 + 0.5 * Math.sin(T * 0.3 + i * 0.5)).multiplyScalar(fade * (0.34 + 0.2 * Math.sin(T * 1.3 + i * 2)));
        this.sxAur.push(_v.x, _v.y, _v.z, 2.6, 2.4 + wv * 0.8, 1, this.vw > this.vh ? Math.PI / 2 : 0, -0.5, 0, _c);
      }
    }
    const bow = tm.rainbow > 0 && play;
    this.sxBow.visible = bow;
    if (bow) {
      const r = this.openRect, wide = this.vw > this.vh, R = (wide ? r.z1 - r.z0 : r.x1 - r.x0) * 0.46;
      this.sxShelf(0.5, 1.0, -0.6, _v);
      this.sxBow.position.copy(_v);
      this.sxBow.scale.setScalar(R);
      this.sxBow.rotation.set(-0.45, wide ? Math.PI / 2 : 0, 0);
      const op = 0.34 * Math.min(1, tm.rainbow / 5, (V.rainbowLen - tm.rainbow) / 5);
      for (const m of this.sxBow.children) m.material.opacity = op;
    }
    // P-68: a small rainbow over the spring while Knot rests there (only in daylight)
    const atSpring = play && !h.path.length && h.down <= 0 && Math.hypot(h.x - 10.5, h.y - 20.5) <= 1.1 && this.dark < 0.4;
    V.springUp = atSpring ? (V.springUp || 0) + dt : 0;
    this.sxBowS.visible = V.springUp > 4;
    if (this.sxBowS.visible) {
      this.sxBowS.position.set(wx(10.5), 0.1, wz(20.5));
      this.sxBowS.scale.setScalar(0.75);
      this.sxBowS.rotation.set(-0.5, 0, 0);
      const op = 0.4 * Math.min(1, (V.springUp - 4) / 2);
      for (const m of this.sxBowS.children) m.material.opacity = op;
      if (this.sxNote && !V.bowTold) { V.bowTold = 1; this.sxNote('P-68'); }
    } else V.bowTold = 0;

    // P-44: the whale of mist rises behind the island, glides over its far edge and sinks again
    const whale = tm.whale > 0 && play;
    this.sxWhale.visible = whale;
    if (whale) {
      const k = 1 - tm.whale / 14, r = this.openRect, wide = this.vw > this.vh;
      const along = -0.25 + 1.5 * k, lift = Math.sin(Math.min(1, Math.max(0, k)) * Math.PI);
      let X, Z, yaw;
      if (wide) { X = r.x0 + 1.8; Z = r.z1 + (r.z0 - r.z1) * along; yaw = Math.PI / 2; } else { X = r.x0 + (r.x1 - r.x0) * along; Z = r.z0 + 1.8; yaw = 0; }
      const Y = -2.4 + lift * 5.2;
      this.sxWhale.position.set(X, Y, Z);
      this.sxWhale.rotation.set(0, yaw, Math.cos(k * Math.PI) * 0.35 + Math.sin(T * 1.2) * 0.04);
      this.sxWhale.scale.setScalar(Math.min(1.25, (wide ? r.z1 - r.z0 : r.x1 - r.x0) / 9));
      if (Y > 0) this.shadows.push(X, 0.03, Z, 7, 1, 3);
      if (!this.fast && Math.random() < dt * 12) fx.spawn(K_PUFF, X + (Math.random() - 0.5) * 4, Y - 0.6, Z + (Math.random() - 0.5) * 1.6, 0, -0.5, 0, 1.6, 0.5, 0xDDE6F5, 0, 0);
      if (x.whaleUp > s.tick && !x.song) this.sxTap('whale', X, Y, Z, 2.2);
    }
    // P-47: the little plane high above, and the paper plane that comes down from it
    const plane = tm.plane > 0 && play;
    this.sxPlane.visible = plane;
    if (plane) {
      const k = 1 - tm.plane / 13, c = this.cam;
      const X = c.tx - 14 + k * 28, Z = c.tz - 1.5 + Math.sin(k * 3) * 0.8, Y = 6.2;
      this.sxPlane.position.set(X, Y, Z);
      this.sxPlane.rotation.set(Math.sin(T * 1.5) * 0.08, 0, 0.03);
      this.shadows.push(X, 0.03, Z, 1.6, 1, 1.6);
      V.planeX = X; V.planeZ = Z;
      if (!V.planeHit) this.sxTap('plane', X, Y, Z, 1.2);
    }
    this.sxPaper.visible = tm.paper > 0;
    if (tm.paper > 0) {
      const k = 1 - tm.paper / 3.2, e = k * k * (3 - 2 * k);
      const X = V.planeX + (wx(h.x) - V.planeX) * e + Math.sin(k * 9) * (1 - k) * 1.5, Z = V.planeZ + (wz(h.y) - V.planeZ) * e, Y = 6.2 * (1 - e) + 0.4;
      this.sxPaper.position.set(X, Y, Z);
      this.sxPaper.rotation.set(0, -Math.atan2(wz(h.y) - Z, wx(h.x) - X + Math.cos(k * 9)), -0.3);
    }
    // P-45: a falling star
    if (tm.star > 0 && play) {
      const k = 1 - tm.star / 2.6, c = this.cam;
      const X = c.tx - 7 + k * 14, Z = c.tz - 4 + k * 4.5, Y = 5.5 - k * 2.5;
      fx.spawn(K_GLOW, X, Y, Z, -1.2, 0.3, -0.4, 0.55, 0.16, 0xFFF2C8, 0, 0);
      fx.spawn(K_GLOW, X, Y, Z, -2.2 + Math.random(), 0.6, -0.8, 0.4, 0.07, C.gold, 0, 0);
      if (!V.starHit) this.sxTap('star', X, Y, Z, 1.6);
    }
    // P-43: the owl on the roof of the lighthouse
    this.sxOwl.visible = !!F.owl && !this.epilogue;
    if (this.sxOwl.visible) this.sxOwl.rotation.y = Math.sin(T * 0.4) * 1.2;

    // ---- the pond ----
    const pondOpen = g.open[idx(POND.x0, POND.y0)] && play;
    const refl = pondOpen && ch >= 5 && !(tm.eye > 0);
    for (const m of this.sxRefl) m.visible = refl;
    if (refl) this.sxRefl[3].material.opacity = 0.35 + 0.2 * Math.sin(T * 2.1);
    if (refl && !(tm.fig > 0)) {
      V.figWait = (V.figWait === undefined ? 20 + Math.random() * 40 : V.figWait) - dt;
      if (V.figWait <= 0) { tm.fig = 8; V.figWait = 70 + Math.random() * 90; if (this.sxNote) this.sxNote('P-37'); }
    }
    const fig = refl && tm.fig > 0;
    for (const m of this.sxFig) m.visible = fig;
    if (fig) { const op = Math.min(1, tm.fig / 1.5, (8 - tm.fig) / 1.5); this.sxFig[0].material.opacity = 0.6 * op; this.sxFig[1].material.opacity = (0.7 + 0.3 * Math.sin(T * 7)) * op; }
    const eye = tm.eye > 0 && pondOpen;
    for (const m of this.sxEyeD) m.visible = eye;
    if (eye) {
      const k = 1 - tm.eye / 2.0;
      const open = Math.max(0, Math.sin(Math.min(1, Math.max(0, (k - 0.2) / 0.6)) * Math.PI));
      this.sxEyeD[0].material.opacity = 0.9 * Math.min(1, k * 5, (1 - k) * 5);
      this.sxEyeD[1].scale.set(1.7, 1, 2.3 * open + 0.001); this.sxEyeD[1].material.opacity = open > 0.02 ? 1 : 0;
      this.sxEyeD[2].scale.set(0.8, 1, Math.min(0.8, 2.2 * open) + 0.001); this.sxEyeD[2].material.opacity = open > 0.05 ? 1 : 0;
      this.sxEyeD[2].position.x = this.sxPondC.x + Math.sin(T * 3) * 0.12;
      this.sxEyeD[3].material.opacity = open > 0.4 ? 1 : 0;
    }
    this.sxFish.visible = tm.fish > 0;
    if (tm.fish > 0) {
      const k = 1 - tm.fish / 0.8, F0 = this.sxFishAt;
      const taken = this.sxGullJob && this.sxGullJob.fish && this.sxGullJob.t > this.sxGullJob.dur * 0.5;
      if (taken) this.sxFish.position.copy(this.sxGull.position).y -= 0.12;
      else this.sxFish.position.set(F0.X + k * 0.5, -0.1 + Math.sin(k * Math.PI) * 1.0, F0.Z);
      this.sxFish.rotation.set(0, 0, Math.cos(k * Math.PI) * 1.2);
      if (!taken && tm.fish - dt <= 0) fx.ring(F0.X + 0.5, -0.05, F0.Z, 0.05, 0.5, 0.7, 0x9ADFE3);
    }

    // ---- the gull: sleeps on Knot's head, steals a coin, brings a present, takes the fish ----
    const J = this.sxGullJob;
    let gullOn = false;
    if (J) {
      J.t += dt;
      const k = Math.min(1, J.t / J.dur), a = J.from, b = J.via, c2 = J.to;
      const u = 1 - k;
      this.sxGull.position.set(u * u * a[0] + 2 * u * k * b[0] + k * k * c2[0], u * u * a[1] + 2 * u * k * b[1] + k * k * c2[1], u * u * a[2] + 2 * u * k * b[2] + k * k * c2[2]);
      this.sxGull.rotation.set(0, -Math.atan2(c2[2] - a[2], c2[0] - a[0]), 0);
      const flap = Math.sin(T * 16) * 0.8;
      this.sxWingL.rotation.x = flap; this.sxWingR.rotation.x = -flap;
      this.sxWingL.scale.z = 1; this.sxWingR.scale.z = -1;
      this.sxGull.scale.setScalar(1.5);
      gullOn = true;
      if (J.mid && k >= 0.5) { J.mid(); J.mid = null; }
      if (k >= 1) this.sxGullJob = null;
    } else if (F.sleep && play && !(h.down > 0)) {
      this.sxGull.position.set(wx(h.x), Math.max(0, isl.topAt(Math.floor(h.x), Math.floor(h.y))) + 0.8, wz(h.y));
      this.sxGull.rotation.set(0, Math.sin(T * 0.5) * 0.6, 0);
      // wings folded along the body, so the bird does not hide Knot under it
      this.sxWingL.rotation.x = 0.25; this.sxWingR.rotation.x = -0.25;
      this.sxWingL.scale.z = 0.32; this.sxWingR.scale.z = -0.32;
      this.sxGull.scale.setScalar(0.85);
      gullOn = true;
    }
    this.sxGull.visible = gullOn;

    // P-36: the less light, the more eyes in the mist around the island
    if (play && !this.epilogue && this.quality !== 'low' || (play && s.light < 20)) {
      const r = s.light / s.maxLight;
      const n = s.light < 20 ? this.sxEyeSpots.length : r > 0.8 ? 0 : Math.floor(this.sxEyeSpots.length * 0.6 * Math.pow(1 - r / 0.8, 1.6));
      const R = this.openRect;
      if (n && R) {
        for (let i = 0; i < n; i++) {
          const p = this.sxEyeSpots[i];
          if (Math.sin(T * p.sp + p.ph) < -0.3 || ((T + p.ph) % 4.1) < 0.12) continue;
          let X, Z;
          if (p.side === 0) { X = R.x0 + (R.x1 - R.x0) * p.u; Z = R.z0 - p.out; } else if (p.side === 1) { X = R.x0 - p.out; Z = R.z0 + (R.z1 - R.z0) * p.u; } else if (p.side === 2) { X = R.x1 + p.out; Z = R.z0 + (R.z1 - R.z0) * p.u; } else { X = R.x0 + (R.x1 - R.x0) * p.u; Z = R.z1 + 0.3 + p.out * 0.6; }
          const dxe = 0.11 + (i % 3) * 0.02;
          this.sxMistEye.push(X - dxe, p.y, Z); this.sxMistEye.push(X + dxe, p.y, Z);
        }
        if (n >= 30 && this.sxNote && !V.eyesTold) { V.eyesTold = 1; this.sxNote('P-36'); }
      }
    }
    // P-71: wet footprints that walk from the gate to the lighthouse door on their own
    if (this.sxSteps) {
      const S = this.sxSteps;
      S.t += dt;
      const head = S.t * 2.6;
      let any = false;
      for (let i = 0; i < S.pts.length; i++) {
        const age = (head - i) / 2.6;
        if (age < 0 || age > 7) continue;
        any = true;
        const p = S.pts[i], k = age < 0.3 ? age / 0.3 : age > 5 ? Math.max(0, (7 - age) / 2) : 1;
        this.sxFoot.push(p[0], 0.03, p[1], 0.13 * k, 1, 0.24 * k, p[2]);
      }
      if (!any && S.t > 3) this.sxSteps = null;
    }
    // P-48: snow on the days around Christmas
    if (F.xmas && play && !this.fast && Math.random() < dt * 40) { const c = this.cam; fx.spawn(K_GLOW, c.tx + (Math.random() - 0.5) * 22, 6, c.tz + (Math.random() - 0.5) * 20, 0.2, -1.4, 0.1, 4, 0.035, 0xFFFFFF, 0, 0); }
    // P-02: coloured rings from the lighthouse while the island dances
    if (tm.disco > 0) { this.sxDance = tm.disco; if (Math.random() < dt * 4) fx.ring(this.lhX, 0.1, this.lhZ, 0.4, 9, 1.6, _c.setHSL(Math.random(), 1, 0.6).getHex()); } else this.sxDance = 0;
    // P-70: for a moment the dots of the path run the other way
    this.sxBack = tm.back > 0;
  },

  // Knot: hats, sleeping with the thermos, stars around a dizzy head, digging.
  sxKnot(T, dt) {
    const K = this.K, F = this.sx, tm = this.sxT, g = this.game, h = g.s.hero, x = g.s.sec || {};
    const hat = g.has('hugoCap') ? 7 : (F.knotHat || 0);
    for (let i = 1; i < this.sxKnotHats.length; i++) this.sxKnotHats[i].visible = i === hat;
    const sleep = !!F.sleep && !this.title && !(h.down > 0);
    this.sxThermos.visible = sleep;
    if (sleep) {
      K.rig.position.y = -0.1;
      K.rig.rotation.z = 0;
      K.torso.rotation.x = -0.22;
      K.head.rotation.x = 0.5 + Math.sin(T * 1.2) * 0.05; K.head.rotation.y = 0;
      K.armL.rotation.x = 0; K.armR.rotation.x = -0.5;
      K.legL.position.z = K.legR.position.z = 0.1;
      if (Math.random() < dt * 1.2) this.fx.spawn(K_GLOW, K.root.position.x + 0.2, K.root.position.y + 0.9, K.root.position.z, 0.15, 0.35, 0, 1.6, 0.05, 0xBFD6FF, 0, 0);
    }
    if (tm.dizzy > 0 && !this.title) {
      K.rig.rotation.z = Math.sin(T * 3.2) * 0.26;
      K.head.rotation.y = Math.sin(T * 2.3) * 0.8;
      for (let i = 0; i < 4; i++) { const a = T * 4 + i * Math.PI / 2; this.sxStarP.push(K.root.position.x + Math.cos(a) * 0.3, K.root.position.y + 0.82 + Math.sin(T * 5 + i) * 0.04, K.root.position.z + Math.sin(a) * 0.3, 1, 1, 1, a); }
    }
    if (x.digT > 0 && !this.title) {
      K.armR.rotation.x = -0.6 + Math.sin(T * 11) * 0.9;
      K.torso.rotation.x = 0.3;
      if (!this.fast && Math.random() < dt * 9) this.fx.spawn(K_CUBE, K.root.position.x + (Math.random() - 0.5) * 0.4, 0.1, K.root.position.z + 0.25, (Math.random() - 0.5) * 1.5, 2, (Math.random() - 0.5) * 1.5, 0.5, 0.06, C.soil, 9, 5);
    }
  },

  // The lamp of the lighthouse while the island dances (P-02).
  sxLamp(L, T) {
    if (!(this.sxT.disco > 0)) return;
    _c.setHSL((T * 0.9) % 1, 1, 0.6);
    L.crystal.material.color.copy(_c);
    L.beamMat.color.copy(_c);
    L.beamMat.opacity = Math.max(L.beamMat.opacity, 0.3);
    this.beamSpot.material.opacity = Math.max(this.beamSpot.material.opacity, 0.3);
  },

  // A red sky for the wave that started with 666 gold (P-33).
  sxMoodTint(dt) {
    const hell = !this.title && this.game.s.waves.some((w) => w.hell);
    this.sxHellT = (this.sxHellT || 0) - dt;
    if (hell && this.sxHellT <= 0) {
      this.sxHellT = 0.8;
      const m = this.mood.cur, t = { ...m, top: m.top.clone().lerp(_c.setHex(0x3A0808), 0.75), horizon: m.horizon.clone().lerp(_c.setHex(0x9A1F1A), 0.75), mist: m.mist.clone().lerp(_c.setHex(0x7A1A16), 0.6), sun: m.sun.clone().lerp(_c.setHex(0xFF6A4A), 0.5), ground: m.ground };
      this.applyMood(t);
      this.sxHellOn = true;
    } else if (!hell && this.sxHellOn) { this.sxHellOn = false; this.applyMood(this.mood.cur); }
  },

  // ---------- things the interface starts ----------
  sxGo(what, a, b, c) {
    const tm = this.sxT, V = this.sxV, fx = this.fx;
    switch (what) {
      case 'star': tm.star = 2.6; V.starHit = 0; break;
      case 'plane': tm.plane = 13; V.planeHit = 0; break;
      case 'aurora': tm.aurora = V.auroraLen = a || 45; break;
      case 'rainbow': tm.rainbow = V.rainbowLen = a || 45; break;
      case 'wink': tm.wink = 0.35; break;
      case 'mouse': tm.mouse = 2.4; break;
      case 'dizzy': tm.dizzy = 7; break;
      case 'back': tm.back = 3.2; break;
      case 'stare': V.stareId = a; break;
      case 'stareAll': tm.stareAll = a; break;
      case 'steps': {
        // a: cells of a path [[x, y], ...]
        const pts = [];
        for (let i = 0; i + 1 < a.length; i++) for (let q = 0; q < 2; q++) {
          const f = q * 0.5, cx = a[i][0] + (a[i + 1][0] - a[i][0]) * f + 0.5, cy = a[i][1] + (a[i + 1][1] - a[i][1]) * f + 0.5;
          const ang = Math.atan2(a[i + 1][1] - a[i][1], a[i + 1][0] - a[i][0]), side = (i * 2 + q) % 2 ? 0.1 : -0.1;
          pts.push([wx(cx) - Math.sin(ang) * side, wz(cy) + Math.cos(ang) * side, -ang + Math.PI / 2]);
        }
        this.sxSteps = { pts, t: 0 };
        break;
      }
      case 'domu': {
        // fireflies gather into a word over the meadow
        const word = ['D', 'O', 'M', 'U'], x0 = wx(9.5) - 2.75, z0 = wz(15.2), st = 0.24;
        word.forEach((ch, li) => {
          FONT[ch].forEach((row, ry) => { for (let cx = 0; cx < 5; cx++) if (row[cx] === '1') fx.spawn(K_GLOW, x0 + li * 1.45 + cx * st, 1.0, z0 + ry * st, 0, 0, 0, 3.4 + Math.random() * 0.5, 0.075, cx % 2 ? 0xD8FF7A : 0xFFF08A, 0, 0); });
          if (ch === 'U') fx.spawn(K_GLOW, x0 + li * 1.45 + 2 * st, 1.0, z0 - 1.6 * st, 0, 0, 0, 3.6, 0.06, 0xFFF08A, 0, 0);
        });
        break;
      }
      case 'chime': fx.ring(wx(a + 0.5), 0.1, wz(b + 0.5), 0.1, 1.0, 0.8, C.crystal); fx.sparks(wx(a + 0.5), 0.5, wz(b + 0.5), C.crystal, 8, 1.6, 0.05, 0.7); break;
      case 'chimeAll': for (const [cx, cy] of a) { fx.flash(wx(cx + 0.5), 0.6, wz(cy + 0.5), 1.2, C.crystal, 0.9); for (let i = 0; i < 10; i++) fx.spawn(K_GLOW, wx(cx + 0.5), 0.3 + i * 0.35, wz(cy + 0.5), 0, 0.6, 0, 1.6, 0.09, 0xE6FAFF, 0, 0); } break;
      case 'radio': fx.ring(wx(a + 0.5), 1.0, wz(b + 0.5), 0.1, 1.2, 0.8, 0xFF5A45); fx.ring(wx(a + 0.5), 1.0, wz(b + 0.5), 0.1, 0.8, 0.6, 0xFF5A45); break;
      case 'note': fx.spawn(K_GLOW, wx(a + 0.5), 1.4, wz(b + 0.5), 0.15, 0.7, 0, 0.9, 0.07, C.zap, 0, 0); fx.ring(wx(a + 0.5), 0.1, wz(b + 0.5), 0.2, 0.8, 0.4, C.zap); break;
      case 'mistEyes': fx.spawn(K_GLOW, wx(a + 0.36), 1.25, wz(b + 0.5), 0, 0, 0, 2.2, 0.07, 0xFFE14A, 0, 0); fx.spawn(K_GLOW, wx(a + 0.64), 1.25, wz(b + 0.5), 0, 0, 0, 2.2, 0.07, 0xFFE14A, 0, 0); break;
      case 'fireworks': for (let i = 0; i < 6; i++) { const X = this.cam.tx + (Math.random() - 0.5) * 10, Z = this.cam.tz + (Math.random() - 0.5) * 8; fx.later(i * 0.35, 2, X, 3 + Math.random() * 2.5, Z, 1.4, [C.gold, C.coral, 0x9FE8FF, 0x9DFF7A, 0xD88AD8][i % 5]); } break;
      case 'hearts': for (let i = 0; i < 5; i++) fx.spawn(K_GLOW, a + (Math.random() - 0.5) * 0.3, b + 0.2, (c || 0) + (Math.random() - 0.5) * 0.3, 0, 0.6 + Math.random() * 0.4, 0, 1.0, 0.06, C.coral, 0, 0); break;
    }
  },

  // ---------- events from the logic ----------
  sxEvent(e) {
    const fx = this.fx, tm = this.sxT, V = this.sxV, h = this.game.s.hero;
    const HX = wx(h.x), HZ = wz(h.y);
    switch (e.code) {
      case 'P-01':
        if (e.what === 'squeak') { tm.petHop = 0.45; fx.sparks(wx(6.85 + 1.45 * Math.sin(this.time * 0.25)), 0.4, wz(20.55), 0x7FE0C8, 4, 1.2, 0.05, 0.4); }
        else { fx.ring(HX, 0.08, HZ, 0.2, 1.2, 0.7, 0x7FE0C8); this.sxGo('hearts', HX, 0.5, HZ); }
        break;
      case 'P-02': tm.disco = 10; this.shake(0.05); break;
      case 'P-04': {
        const X = e.what === 'gift' ? HX : wx(e.x), Z = e.what === 'gift' ? HZ : wz(e.y);
        this.sxGullJob = { t: 0, dur: 1.8, from: [X - 9, 5, Z - 3], via: [X, e.what === 'gift' ? -0.2 : -1.2, Z], to: [X + 9, 5, Z - 4], mid: () => { if (e.what === 'gift') { fx.sparks(X, 0.3, Z, C.gold, 14, 2.4, 0.06, 0.7); fx.coinPop(X, 0.4, Z, 5); } else fx.sparks(X, 0.9, Z, 0xFFFFFF, 4, 1.4, 0.05, 0.3); } };
        break;
      }
      case 'P-05': fx.sparks(wx(e.x), 0.8, wz(e.y), C.gold, 10, 2.4, 0.06, 0.6); fx.coinPop(wx(e.x), 0.6, wz(e.y), 3); break;
      case 'P-11': if (e.what === '777') { fx.coinPop(this.lhX, 1.2, this.lhZ, 8); fx.later(0.25, 2, this.lhX, 2.4, this.lhZ, 1.2, C.gold); fx.later(0.5, 2, this.lhX + 1, 3, this.lhZ - 1, 1.0, C.gold); } break;
      case 'P-14':
        this.sxFishAt = { X: wx(e.x), Z: wz(e.y) };
        tm.fish = 0.8;
        fx.ring(wx(e.x), -0.05, wz(e.y), 0.05, 0.5, 0.6, 0x9ADFE3);
        fx.debris(wx(e.x), 0, wz(e.y), 0x9ADFE3, 5, 1.6, 0.05);
        if (e.what === 'gull') { const X = wx(e.x) + 0.25, Z = wz(e.y); tm.fish = 1.9; this.sxGullJob = { t: 0, dur: 1.6, fish: 1, from: [X - 8, 5, Z - 2], via: [X, -1.6, Z], to: [X + 8, 6, Z - 3] }; }
        break;
      case 'P-16': fx.ring(wx(e.x + 0.5), 0.1, wz(e.y + 0.5), 0.2, 1.4, 0.8, 0x9DFF7A); fx.sparks(wx(e.x + 0.5), 0.4, wz(e.y + 0.5), 0xFFE14A, 12, 1.8, 0.05, 0.8); break;
      case 'P-17':
        if (e.what === 'serve') { if (!this.fast) { fx.spawn(K_PUFF, wx(e.x), 0.7, wz(e.y), 0, 0.5, 0, 0.6, 0.12, 0xFFB6C9, 0, 0); fx.coinPop(wx(e.bx + 0.5), 1.2, wz(e.by + 0.5), 1); } }
        else fx.sparks(wx(e.x), 0.5, wz(e.y), C.zap, 8, 2.6, 0.06, 0.3);
        break;
      case 'P-18':
        if (e.what === 'come') tm.boatIn = 2.5;
        if (e.what === 'leave') tm.boatOut = 2.5;
        if (e.what === 'swap') { fx.flash(wx(e.x + 0.5), 0.6, wz(e.y + 0.5), 1.1, C.amber, 0.4); fx.dust(wx(e.x + 0.5), 0.1, wz(e.y + 0.5), 10, 0xE9DCC2, 0.7, 0.3); const a = this.anim(e.id); a.born = this.time; }
        break;
      case 'P-20': if (e.what === 'passed') { fx.sparks(this.lhX, 0.6, this.lhZ - 0.8, C.gold, 16, 2.6, 0.06, 0.8); fx.coinPop(this.lhX, 0.8, this.lhZ - 0.8, 8); } break;
      case 'P-21': if (e.what === 'arrived') { fx.ring(this.lhX, 0.1, this.lhZ, 0.4, 2, 0.8, 0xFFFFFF); fx.sparks(this.lhX + 0.45, 0.6, this.lhZ + 0.86, 0xFFFFFF, 10, 1.8, 0.05, 0.7); } break;
      case 'P-22': { const X = wx(e.x + 0.5), Z = wz(e.y + 0.5); fx.dust(X, 0.1, Z, 12, 0xC8C2B8, 0.9, 0.3); fx.debris(X, 0.4, Z, C.plech, 10, 2.6, 0.1); this.shake(0.12); break; }
      case 'P-23':
        if (e.what === 'hatch') { const X = wx(SHORE.pepa[0]), Z = wz(SHORE.pepa[1]); fx.debris(X, 0.2, Z, 0xE9E2C8, 10, 2, 0.07); fx.ring(X, 0, Z, 0.1, 0.8, 0.6, 0x9ADFE3); }
        if (e.what === 'gulp') { tm.gulp = 0.5; fx.ring(wx(e.x), 0.08, wz(e.y), 0.5, 0.1, 0.35, C.pulec); if (!this.fast) fx.dust(wx(e.x), 0.1, wz(e.y), 4, 0x9ADFE3, 0.4, 0.15); }
        break;
      case 'P-24':
        if (e.what === 'arrived') this.sxGo('hearts', this.lhX - 0.42, 0.5, this.lhZ + 0.86);
        if (e.what === 'hunt') { tm.catJump = 0.6; fx.sparks(wx(e.x), 0.3, wz(e.y), 0xFFFFFF, 6, 1.8, 0.05, 0.3); }
        break;
      case 'P-25': tm.meteor = 1.1; this.sxMeteorAt = { X: wx(e.x + 0.5), Z: wz(e.y + 0.5) }; this.focusOn(e.x + 0.5, e.y + 0.5, 13, 2.4); break;
      case 'P-26': case 'P-28':
        fx.debris(HX, 0.2, HZ, C.soil, 12, 2.4, 0.09); fx.coinPop(HX, 0.5, HZ, e.code === 'P-28' ? 10 : 5); fx.ring(HX, 0.08, HZ, 0.2, 1.2, 0.6, C.gold);
        if (e.what === 'cap') { fx.flash(HX, 0.8, HZ, 1, C.gold, 0.5); fx.sparks(HX, 0.9, HZ, C.gold, 16, 2.6, 0.06, 0.9); }
        this.knotJoy = 0.7;
        break;
      case 'P-29': {
        const X = wx(e.x + 0.5), Z = wz(e.y + 0.5);
        fx.debris(X, 0.5, Z + 0.36, C.soil, 8, 2, 0.08);
        if (e.what === 'chest') fx.coinPop(X, 0.6, Z + 0.36, 5);
        if (e.what === 'slime') this.sxExtra.push({ x: X, z: Z + 0.5, vx: 0.5, vz: 0.35, t: 0, life: 7 });
        else fx.spawn(K_CUBE, X, 0.6, Z + 0.4, 0.4, 2.6, 0.5, 1.2, 0.13, e.what === 'boot' ? 0x3B2F2F : 0xC9B8A0, 9, 5);
        break;
      }
      case 'P-31': tm.eye = 2.0; this.focusOn((POND.x0 + POND.x1 + 1) / 2, (POND.y0 + POND.y1 + 1) / 2, 11, 1.6); break;
      case 'P-44':
        if (e.what === 'come') tm.whale = 14;
        if (e.what === 'sing') { const p = this.sxWhale.position; for (let i = 0; i < 4; i++) fx.ring(p.x, 0.1, p.z, 0.5 + i, 6 + i * 3, 1.6 + i * 0.4, 0xBFD6FF); for (const b of this.game.s.buildings) if (Math.random() < 0.5) fx.spawn(K_GLOW, wx(b.x + 0.5), 1.2, wz(b.y + 0.5), 0, 0.6, 0, 1.2, 0.06, 0xBFD6FF, 0, 0); }
        break;
      case 'P-45':
        if (e.what === 'aurora') this.sxGo('aurora', 60);
        if (e.what === 'rainbow') this.sxGo('rainbow', 60);
        if (e.what === 'star') { V.starHit = 1; tm.star = 0; fx.sparks(this.cam.tx, 3, this.cam.tz - 1, C.gold, 14, 3, 0.07, 0.9); }
        break;
      case 'P-47': V.planeHit = 1; tm.paper = 3.2; break;
      case 'P-49': tm.lantern = 7; break;
      case 'P-50': fx.ring(wx(e.x + 0.5), 0.1, wz(e.y + 0.5), 0.2, 1.2, 0.8, C.coral); break;
      case 'P-66': fx.ring(wx(e.x), 0.1, wz(e.y), 0.3, 1.8, 0.8, 0xFFE9A8); fx.sparks(wx(e.x), 1.2, wz(e.y), 0xFFE9A8, 14, 2, 0.05, 0.8); break;
      case 'P-73': fx.flash(wx(e.x + 0.5), 1.2, wz(e.y + 0.5), 0.8, C.gold, 0.5); fx.sparks(wx(e.x + 0.5), 1.2, wz(e.y + 0.5), C.gold, 12, 2.2, 0.06, 0.8); break;
      case 'P-64': fx.sparks(HX, 0.7, HZ, C.amber, 4, 1.5, 0.05, 0.3); break;
    }
  },
};

void inBounds; void NIGHT;
