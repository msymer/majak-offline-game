// The island: terrain tiles, rocks and other fixed decorations, water, the body of the floating island,
// the sea of mist around it and the wall of mist over locked sectors.
import * as THREE from '../../vendor/three.module.min.js';
import { W, H, idx, tileAt, inBounds } from '../sim/grid.js';
import { C } from './palette.js';
import { BREAKABLE_ROCKS, MAP_ROWS, TILES, MAP_EVENTS } from '../data/map.js';
const COLLAPSE = MAP_EVENTS.filter((e) => e.kind === 'collapse').flatMap((e) => e.cells);
const HOLES = MAP_EVENTS.filter((e) => e.kind === 'holes').flatMap((e) => e.cells);
const TILES_BY_CHAR = (ch) => TILES[ch];
import { Builder, Pool, bevelBoxGeometry, lit, unlit, additive, seeded } from './geo.js';

export function wx(x) { return x - W / 2; }
export function wz(y) { return y - H / 2; }

const WATER_Y = -0.1;
const _col = new THREE.Color();
const _o = new THREE.Object3D();

function isWater(x, y) { return inBounds(x, y) && tileAt(x, y).kind === 'water'; }

export class Island {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.top = new Float32Array(W * H);
    this.kindOf = new Array(W * H);
    this.matLit = lit();
    this.matBody = lit({ side: THREE.DoubleSide });
    this.matGlow = unlit();
    this.matCrystal = unlit();
    this.matWater = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    this.waterCells = [];
    this.mudCells = [];
    this.oreCells = [];
    this.crystalCells = [];
    this.beacons = [];
    this.cracks = [];
    this.decorScale = 1;
    this.buildStatic();
    this.buildSea();
    this.buildClouds();
  }

  // Rocks that a boss broke (or that fell down) for good: hide them and flatten the cell. Holes appear.
  syncRocks() {
    let any = false, fell = false;
    for (const r of this.breakRocks) {
      const broken = tileAt(r.x, r.y).kind !== 'rock';
      this.top[r.i] = broken ? 0.02 : 0.9;
      if (r.collapse) fell = fell || broken; else any = any || broken;
    }
    if (this.breakMesh) this.breakMesh.visible = !any;
    if (this.collapseMesh) this.collapseMesh.visible = !fell;
    if (this.rubbleMesh) this.rubbleMesh.visible = fell;
    const holes = HOLES.length && tileAt(HOLES[0][0], HOLES[0][1]).kind === 'hole';
    if (this.holeMesh) { this.holeMesh.visible = holes; this.holeGlow.visible = holes; }
    this.holesOpen = holes;
    return any;
  }

  topAt(x, y) { return inBounds(x, y) ? this.top[idx(x, y)] : 0; }

  // ---------- fixed geometry ----------

  buildStatic() {
    const rnd = seeded(20240611);
    const tiles = new Builder(), decor0 = new Builder(), glow = new Builder(), crystals = new Builder(), breakable = new Builder(), collapse = new Builder(), rubble = new Builder();
    let decor = decor0;
    this.breakRocks = [];
    const TG = bevelBoxGeometry(0.98, 0.3, 0.98, 0.055);
    const tufts = [], flowers = [];

    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      // the static island is built from the original map; lasting changes are applied by syncRocks()
      const t = TILES_BY_CHAR(MAP_ROWS[y][x]);
      const X = wx(x + 0.5), Z = wz(y + 0.5), i = idx(x, y);
      decor = BREAKABLE_ROCKS.some((r) => r.x === x && r.y === y) ? breakable : COLLAPSE.some((c) => c[0] === x && c[1] === y) ? collapse : decor0;
      if (decor === breakable) this.breakRocks.push({ x, y, i });
      if (decor === collapse) {
        this.breakRocks.push({ x, y, i, collapse: true });
        for (let k = 0; k < 4; k++) rubble.dodeca(0.08 + rnd() * 0.07, 0x9A9CA5, { x: X + (rnd() - 0.5) * 0.7, y: 0.02, z: Z + (rnd() - 0.5) * 0.7, ry: rnd() * 6, sy: 0.6, shade: 0.7, top: C.moss, topFrom: 0.7 });
      }
      const jit = 1 + (rnd() - 0.5) * 0.08;
      let top = 0, color = null;
      this.kindOf[i] = t.kind;
      switch (t.kind) {
        case 'water':
          this.waterCells.push({ x, y, cliff: y === H - 1 });
          this.top[i] = WATER_Y;
          if (y === H - 1) {
            // Cliff edge: a rim of stones on the outer side.
            const n = 1 + (rnd() < 0.6 ? 1 : 0);
            for (let k = 0; k < n; k++) {
              const s = 0.16 + rnd() * 0.12;
              decor.dodeca(s, k ? C.stoneL : 0x7C7E88, { x: X + (rnd() - 0.5) * 0.7, y: -0.06, z: Z + 0.42 + rnd() * 0.12, ry: rnd() * 6, rx: rnd() * 2, sy: 0.7 + rnd() * 0.4, shade: 0.7, top: C.moss, topFrom: 0.8 });
            }
          }
          continue;
        case 'rock': {
          top = 0.02; color = 0x7B8478;
          const s1 = 0.4 + rnd() * 0.1;
          decor.dodeca(s1, 0xA9ABB3, { x: X + (rnd() - 0.5) * 0.16, y: 0.22 + rnd() * 0.08, z: Z + (rnd() - 0.5) * 0.16, ry: rnd() * 6, rx: rnd() * 0.6, sy: 0.85 + rnd() * 0.35, shade: 0.7, top: C.moss, topFrom: 0.62 });
          const s2 = 0.24 + rnd() * 0.1, a = rnd() * 6.28;
          decor.dodeca(s2, 0x9A9CA5, { x: X + Math.cos(a) * 0.2, y: 0.5 + rnd() * 0.16, z: Z + Math.sin(a) * 0.2, ry: rnd() * 6, rz: rnd() * 0.8, shade: 0.75, top: C.moss, topFrom: 0.6 });
          if (rnd() < 0.6) { const b = a + 2.2 + rnd(); decor.dodeca(0.17 + rnd() * 0.06, 0x9A9CA5, { x: X + Math.cos(b) * 0.3, y: 0.1, z: Z + Math.sin(b) * 0.3, ry: rnd() * 6, shade: 0.7 }); }
          this.top[i] = 0.9;
          break;
        }
        case 'mud': {
          top = -0.05; color = C.mud; this.mudCells.push({ x, y });
          for (let k = 0; k < 2; k++) decor.cyl(0.12 + rnd() * 0.1, 0.14 + rnd() * 0.1, 0.012, 7, 0x8E7868, { x: X + (rnd() - 0.5) * 0.6, y: top, z: Z + (rnd() - 0.5) * 0.6, shade: 1 });
          this.top[i] = top;
          break;
        }
        case 'ore': {
          color = C.soil; this.oreCells.push({ x, y });
          for (let k = 0; k < 4; k++) {
            const a = (k / 4) * 6.28 + rnd(), r = 0.3 + rnd() * 0.1, s = 0.09 + rnd() * 0.05;
            decor.octa(s, C.ore, { x: X + Math.cos(a) * r, y: 0.03, z: Z + Math.sin(a) * r, ry: rnd() * 6, rx: rnd(), sy: 1.2, shade: 0.75 });
            glow.box(0.07, 0.05, 0.07, C.oreDot, { x: X + Math.cos(a + 0.8) * (r - 0.06), y: 0.0, z: Z + Math.sin(a + 0.8) * (r - 0.06), ry: rnd() * 3, shade: 1 });
          }
          break;
        }
        case 'plateau': {
          color = C.stoneD;
          decor.bevel(0.96, 0.4, 0.8, 0.05, 0xA9ABB3, { x: X, y: 0, z: Z - 0.08, shade: 0.72 });
          decor.box(0.4, 0.27, 0.1, 0x9A9CA5, { x: X, y: 0, z: Z + 0.37, shade: 0.8 });
          decor.box(0.4, 0.13, 0.08, 0x8D8F98, { x: X, y: 0, z: Z + 0.45, shade: 0.8 });
          decor.cyl(0.07, 0.085, 0.22 + rnd() * 0.12, 6, C.wallStone, { x: X - 0.39, y: 0.4, z: Z - 0.38, shade: 0.8 });
          this.top[i] = 0.4;
          break;
        }
        case 'crystal': {
          color = (x + y) % 2 === 0 ? C.grassL : 0x86C464; this.crystalCells.push({ x, y });
          for (let k = 0; k < 3; k++) {
            const a = k * 2.1 + rnd(), r = 0.34 + rnd() * 0.06, s = 0.08 + rnd() * 0.05;
            crystals.octa(s, C.crystal, { x: X + Math.cos(a) * r, y: 0.08, z: Z + Math.sin(a) * r, ry: rnd() * 6, rz: (rnd() - 0.5) * 0.5, sy: 1.7, shade: 0.6 });
          }
          break;
        }
        case 'beacon': {
          color = C.grassD; this.beacons.push({ x, y });
          decor.cyl(0.36, 0.42, 0.1, 8, C.stoneD, { x: X, y: 0, z: Z, shade: 0.8 });
          decor.cyl(0.07, 0.09, 0.66, 6, C.rust, { x: X - 0.03, y: 0.08, z: Z, rz: 0.1, shade: 0.75 });
          decor.cyl(0.05, 0.065, 0.62, 6, C.stoneL, { x: X - 0.06, y: 0.7, z: Z, rz: -0.12, shade: 0.85 });
          decor.box(0.36, 0.05, 0.05, C.rust, { x: X - 0.05, y: 0.62, z: Z, ry: 0.5, rz: 0.12 });
          decor.box(0.26, 0.045, 0.045, C.stoneL, { x: X, y: 0.95, z: Z, ry: -0.7, rz: -0.1 });
          decor.cyl(0.3, 0.07, 0.13, 9, C.brass, { x: X + 0.14, y: 1.02, z: Z + 0.08, rx: 0.55, rz: -0.45, shade: 0.7 });
          this.top[i] = 0;
          break;
        }
        case 'spring': {
          top = 0.0; color = C.stoneL;
          decor.cyl(0.36, 0.27, 0.24, 9, 0xA9ABB3, { x: X + 0.1, y: 0, z: Z, shade: 0.72 });
          decor.cyl(0.07, 0.09, 0.2, 6, C.stoneL, { x: X + 0.1, y: 0.2, z: Z });
          glow.cyl(0.29, 0.29, 0.03, 9, 0x8FE3EA, { x: X + 0.1, y: 0.225, z: Z, shade: 1 });
          this.spring = { x: X + 0.1, z: Z };
          break;
        }
        case 'lighthouse': top = 0.02; color = C.stoneL; break;
        case 'threshold':
          top = 0.02; color = C.wallStone;
          decor.box(0.5, 0.035, 0.3, C.wood, { x: X, y: 0.02, z: Z + 0.28, shade: 0.9 });
          break;
        case 'crack': {
          top = 0.0; color = C.stoneD; this.cracks.push({ x, y });
          decor.box(0.7, 0.02, 0.12, 0x26222C, { x: X, y: 0.0, z: Z, ry: 0.5, shade: 1 });
          decor.box(0.42, 0.02, 0.09, 0x26222C, { x: X + 0.18, y: 0.0, z: Z - 0.2, ry: -0.5, shade: 1 });
          decor.box(0.36, 0.02, 0.08, 0x26222C, { x: X - 0.2, y: 0.0, z: Z + 0.22, ry: -0.2, shade: 1 });
          break;
        }
        case 'entryE': color = 0xA98A64; break;
        default: {
          top = (rnd() - 0.5) * 0.06;
          color = (x + y) % 2 === 0 ? C.grassL : 0x86C464;
          // Tufts of grass and a few flowers near the tile corners.
          if (rnd() < 0.55) {
            const a = rnd() * 6.28, r = 0.32 + rnd() * 0.1;
            tufts.push({ x: X + Math.cos(a) * r, y: top, z: Z + Math.sin(a) * r, s: 0.8 + rnd() * 0.7, ry: rnd() * 6, cell: i, ph: rnd() * 6, c: rnd() > 0.5 ? C.grassD : 0x6FB85A });
          }
          if (rnd() < 0.16) {
            const a = rnd() * 6.28, r = 0.3 + rnd() * 0.12;
            flowers.push({ x: X + Math.cos(a) * r, y: top, z: Z + Math.sin(a) * r, s: 0.8 + rnd() * 0.5, ry: rnd() * 6, cell: i, ph: rnd() * 6, c: [0xFFFFFF, 0xFFE9A8, 0xFFC9B8][Math.floor(rnd() * 3)] });
          }
          this.top[i] = Math.max(0, top);
        }
      }
      tiles.add(TG, color, { x: X, y: top - 0.3, z: Z, shade: 0.72, glow: jit });
    }

    const mk = (builder, mat, cast, receive) => {
      const m = new THREE.Mesh(builder.build(), mat);
      m.castShadow = cast; m.receiveShadow = receive;
      this.group.add(m);
      return m;
    };
    this.tilesMesh = mk(tiles, this.matLit, false, true);
    this.decorMesh = mk(decor0, this.matLit, true, true);
    this.breakMesh = breakable.empty ? null : mk(breakable, this.matLit, true, true);
    this.collapseMesh = collapse.empty ? null : mk(collapse, this.matLit, true, true);
    this.rubbleMesh = rubble.empty ? null : mk(rubble, this.matLit, false, true);
    if (this.rubbleMesh) this.rubbleMesh.visible = false;
    // Holes in the ground (chapter 8): a dark pit with stones around and an orange glow from below.
    if (HOLES.length) {
      const hb = new Builder(), hg = new Builder();
      for (const [x, y] of HOLES) {
        const X = wx(x + 0.5), Z = wz(y + 0.5);
        hb.cyl(0.42, 0.36, 0.03, 12, 0x140C10, { x: X, y: 0.0, z: Z, shade: 1 });
        for (let k = 0; k < 7; k++) { const a = k * 0.9 + rnd(), r = 0.42 + rnd() * 0.05; hb.dodeca(0.09 + rnd() * 0.05, k % 2 ? 0x7A5139 : 0x5C5F6B, { x: X + Math.cos(a) * r, y: 0.03, z: Z + Math.sin(a) * r, ry: rnd() * 6, sy: 0.7, shade: 0.7 }); }
        hg.cyl(0.3, 0.3, 0.01, 12, 0xFF6A2A, { x: X, y: 0.035, z: Z, shade: 1 });
      }
      this.holeMesh = mk(hb, this.matLit, false, true);
      this.holeGlow = new THREE.Mesh(hg.build(), additive(0xFFFFFF, 0.7));
      this.holeGlow.renderOrder = 2;
      this.group.add(this.holeGlow);
      this.holeMesh.visible = this.holeGlow.visible = false;
    }
    this.glowMesh = mk(glow, this.matGlow, false, false);
    if (!crystals.empty) this.crystalMesh = mk(crystals, this.matCrystal, false, false);

    // Beacon lamps (blink) with a soft halo.
    this.beaconLamp = new Pool(this.group, new THREE.IcosahedronGeometry(0.075, 1), new THREE.MeshBasicMaterial({ color: C.red }), 4);
    this.beaconHalo = new Pool(this.group, new THREE.IcosahedronGeometry(0.2, 1), additive(C.coral, 0.5), 4, { order: 6 });
    this.beaconLamp.begin(); this.beaconHalo.begin();
    for (const b of this.beacons) {
      this.beaconLamp.push(wx(b.x + 0.5) + 0.015, 1.36, wz(b.y + 0.5));
      this.beaconHalo.push(wx(b.x + 0.5) + 0.015, 1.36, wz(b.y + 0.5));
    }
    this.beaconLamp.end(); this.beaconHalo.end();

    // Grass tufts (three blades) and flowers, swaying in the wind.
    const tg = new Builder();
    tg.cone(0.045, 0.2, 4, 0xffffff, { shade: 0.6 });
    tg.cone(0.04, 0.15, 4, 0xffffff, { x: 0.06, z: 0.02, rz: -0.35, shade: 0.6 });
    tg.cone(0.04, 0.16, 4, 0xffffff, { x: -0.05, z: -0.03, rz: 0.4, shade: 0.6 });
    this.tufts = tufts;
    this.tuftPool = new Pool(this.group, tg.build(), lit(), Math.max(1, tufts.length), { color: true });
    const fg = new Builder();
    fg.cyl(0.012, 0.016, 0.14, 4, 0x6FB85A);
    fg.octa(0.05, 0xffffff, { y: 0.16, sy: 0.7, shade: 0.9 });
    this.flowers = flowers;
    this.flowerPool = new Pool(this.group, fg.build(), lit(), Math.max(1, flowers.length), { color: true });

    this.buildWater();
    this.buildBody();
  }

  buildWater() {
    const pos = [], col = [];
    const shore = new THREE.Color(0x9ADFE3), mid = new THREE.Color(C.waterS), deep = new THREE.Color(C.waterD);
    const corner = (cx, cy) => {
      // A grid corner touches up to four cells; it is "shore" when any of them is not water.
      for (const [dx, dy] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) if (!isWater(cx + dx, cy + dy)) return true;
      return false;
    };
    this.waterBase = [];
    for (const c of this.waterCells) {
      // 2 x 2 quads per cell
      for (let qy = 0; qy < 2; qy++) for (let qx = 0; qx < 2; qx++) {
        const pts = [[qx, qy], [qx, qy + 1], [qx + 1, qy + 1], [qx, qy], [qx + 1, qy + 1], [qx + 1, qy]];
        for (const [ax, ay] of pts) {
          const gx = c.x + ax / 2, gy = c.y + ay / 2;
          const onCorner = Number.isInteger(gx) && Number.isInteger(gy);
          const onEdgeX = Number.isInteger(gx), onEdgeY = Number.isInteger(gy);
          let edge = false;
          if (onCorner) edge = corner(gx, gy);
          else if (onEdgeX) edge = !isWater(gx - 1, c.y) || !isWater(gx, c.y);
          else if (onEdgeY) edge = !isWater(c.x, gy - 1) || !isWater(c.x, gy);
          pos.push(wx(gx), WATER_Y, wz(gy));
          const k = edge ? shore : (c.cliff ? deep : mid);
          col.push(k.r, k.g, k.b);
          this.waterBase.push(edge ? 0 : 1);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    g.attributes.position.setUsage(THREE.DynamicDrawUsage);
    this.waterMesh = new THREE.Mesh(g, this.matWater);
    this.waterMesh.receiveShadow = true;
    this.group.add(this.waterMesh);
  }

  // The floating body: grass lip, soil, stone, a broken underside that narrows downward.
  buildBody() {
    const rnd = seeded(77123);
    const x0 = -W / 2, x1 = W / 2, z0 = -H / 2, z1 = H / 2;
    const pts = [];
    const push = (x, z, nx, nz) => pts.push({ x, z, nx, nz });
    for (let x = x0; x < x1; x += 1) push(x, z0, x === x0 ? -0.7 : 0, x === x0 ? -0.7 : -1);
    for (let z = z0; z < z1; z += 1) push(x1, z, z === z0 ? 0.7 : 1, z === z0 ? -0.7 : 0);
    for (let x = x1; x > x0; x -= 1) push(x, z1, x === x1 ? 0.7 : 0, x === x1 ? 0.7 : 1);
    for (let z = z1; z > z0; z -= 1) push(x0, z, z === z1 ? -0.7 : -1, z === z1 ? 0.7 : 0);
    const n = pts.length;
    const ring = (fn) => pts.map((p, i) => fn(p, i));
    const noise = pts.map(() => rnd());
    const inner = ring((p) => [p.x, 0, p.z]);
    const innerLow = ring((p) => [p.x, -0.3, p.z]);
    const r0 = ring((p, i) => { const o = 0.26 + noise[i] * 0.14; return [p.x + p.nx * o, -0.02 * noise[i], p.z + p.nz * o]; });
    const r1 = ring((p, i) => { const o = 0.34 + noise[(i + 3) % n] * 0.12; return [p.x + p.nx * o, -0.3 - noise[i] * 0.06, p.z + p.nz * o]; });
    const r2 = ring((p, i) => { const o = 0.2 + noise[(i + 7) % n] * 0.18; return [p.x + p.nx * o, -0.85 - noise[(i + 1) % n] * 0.12, p.z + p.nz * o]; });
    const r3 = ring((p, i) => { const o = -0.05 + noise[(i + 11) % n] * 0.3; return [p.x + p.nx * o, -1.5 - noise[(i + 5) % n] * 0.2, p.z + p.nz * o]; });
    const scaled = (s, y, amp, k) => ring((p, i) => [p.x * s + (noise[(i + k) % n] - 0.5) * amp, y - noise[(i + k * 2) % n] * amp * 0.7, p.z * s + (noise[(i + k + 9) % n] - 0.5) * amp]);
    const r4 = scaled(0.88, -2.3, 0.7, 13);
    const r5 = scaled(0.6, -3.3, 1.0, 17);
    const r6 = scaled(0.25, -4.3, 0.9, 23);
    const pos = [], col = [];
    const c = new THREE.Color();
    const tri = (a, b, d, hex, j) => {
      pos.push(...a, ...b, ...d);
      c.setHex(hex).multiplyScalar(j);
      for (let k = 0; k < 3; k++) col.push(c.r, c.g, c.b);
    };
    const strip = (A, B, hex, amp = 0.1) => {
      for (let i = 0; i < n; i++) {
        const k = (i + 1) % n, j = 1 + (rnd() - 0.5) * amp;
        tri(A[i], B[i], B[k], hex, j);
        tri(A[i], B[k], A[k], hex, j);
      }
    };
    strip(inner, r0, C.grassL, 0.05);
    strip(r0, r1, C.grassD, 0.08);
    strip(r1, r2, C.soil);
    strip(r2, r3, C.soilD);
    strip(r3, r4, 0x8A8690, 0.14);
    strip(r4, r5, C.stoneD, 0.16);
    strip(r5, r6, 0x4E5160, 0.16);
    strip(innerLow, inner, C.soil, 0.04);
    const apex = [0.6, -5.3, -0.4];
    for (let i = 0; i < n; i++) tri(r6[i], apex, r6[(i + 1) % n], 0x454857, 1 + (rnd() - 0.5) * 0.15);
    // floor under the tiles
    tri([x0, -0.3, z0], [x0, -0.3, z1], [x1, -0.3, z1], C.soilD, 1);
    tri([x0, -0.3, z0], [x1, -0.3, z1], [x1, -0.3, z0], C.soilD, 1);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    const body = new THREE.Mesh(g, this.matBody);
    body.receiveShadow = true;
    this.group.add(body);

    // A few boulders hanging under the island.
    const b = new Builder();
    for (let i = 0; i < 9; i++) {
      const a = rnd() * 6.28, r = 3 + rnd() * 6;
      b.dodeca(0.35 + rnd() * 0.5, rnd() > 0.5 ? C.stoneD : 0x6A6D78, { x: Math.cos(a) * r, y: -3.2 - rnd() * 1.6, z: Math.sin(a) * r * 1.05, ry: rnd() * 6, rx: rnd() * 3, sy: 0.8 + rnd() * 0.5, shade: 0.6 });
    }
    this.group.add(new THREE.Mesh(b.build(), this.matLit));
  }

  // ---------- sea of mist ----------

  buildSea() {
    this.seaMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
    const sea = new THREE.Mesh(new THREE.CircleGeometry(160, 40).rotateX(-Math.PI / 2), this.seaMat);
    sea.position.y = -5.6;
    this.group.add(sea);
    this.seaLayers = [];
    const rnd = seeded(4242);
    const geo = new THREE.IcosahedronGeometry(1, 1);
    for (let l = 0; l < 3; l++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.42 - l * 0.08, depthWrite: false, fog: false });
      const count = 30;
      const pool = new Pool(this.group, geo, mat, count, { order: -2 + l });
      const blobs = [];
      for (let i = 0; i < count; i++) {
        const a = rnd() * 6.28, r = 12 + rnd() * 26;
        blobs.push({ x: Math.cos(a) * r, z: Math.sin(a) * r * 0.9, s: 4 + rnd() * 5, ph: rnd() * 6 });
      }
      this.seaLayers.push({ pool, blobs, mat, y: -4.9 + l * 0.75, speed: 0.12 + l * 0.09 });
    }
  }

  setSeaColor(mist, horizon) {
    this.seaMat.color.copy(horizon);
    for (const l of this.seaLayers) l.mat.color.copy(mist);
    this.cloudMat.color.copy(mist);
    this.floorMat.color.copy(mist).multiplyScalar(0.93);
  }

  // ---------- wall of mist over locked sectors ----------

  buildClouds() {
    this.cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x7f8794, emissiveIntensity: 0.55 });
    this.floorMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const geo = new THREE.IcosahedronGeometry(1, 1);
    this.cloudCap = W * H * 2;
    this.cloudMesh = new THREE.InstancedMesh(geo, this.cloudMat, this.cloudCap);
    this.cloudMesh.frustumCulled = false;
    this.cloudMesh.count = 0;
    this.group.add(this.cloudMesh);
    this.clouds = [];
    this.floorMesh = new THREE.Mesh(new THREE.BufferGeometry(), this.floorMat);
    this.group.add(this.floorMesh);
    this.openKey = '';
    this.leaving = 0;
  }

  // Called whenever the set of open cells may have changed.
  syncOpen(open, animate) {
    let key = '';
    for (let i = 0; i < open.length; i++) key += open[i];
    if (key === this.openKey) return false;
    const first = this.openKey === '';
    this.openKey = key;
    if (first || !animate) this.makeClouds(open);
    else {
      // Clouds over newly opened cells roll away from the middle of the opened area.
      let cx = 0, cz = 0, cnt = 0;
      for (const c of this.clouds) if (c.on && open[c.cell]) { cx += c.x; cz += c.z; cnt++; }
      if (cnt) { cx /= cnt; cz /= cnt; }
      for (const c of this.clouds) {
        if (!c.on || !open[c.cell] || c.leave >= 0) continue;
        c.leave = 0;
        const dx = c.x - cx, dz = c.z - cz, d = Math.hypot(dx, dz) || 1;
        c.dx = dx / d; c.dz = dz / d;
        c.delay = Math.random() * 0.8;
      }
      this.leaving = 1;
    }
    this.makeFloor(open);
    return true;
  }

  makeClouds(open) {
    const rnd = seeded(99173);
    this.clouds = [];
    const openNear = (x, y) => {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (inBounds(nx, ny) && open[idx(nx, ny)]) return [dx, dy]; }
      return null;
    };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const a = rnd(), b = rnd(), c2 = rnd(), d = rnd(), e = rnd();
      const i = idx(x, y);
      if (open[i]) continue;
      const near = openNear(x, y);
      const X = wx(x + 0.5), Z = wz(y + 0.5);
      // Next to the open area the clouds are smaller and lean away, so they never hide playable cells.
      const push = near ? 0.12 : 0;
      const r = near ? 0.5 + a * 0.1 : 0.62 + a * 0.26;
      const jt = near ? 0.08 : 0.3;
      this.clouds.push({ cell: i, on: true, leave: -1, x: X + (b - 0.5) * jt - (near ? near[0] * push : 0), y: 0.42 + c2 * 0.2 + (near ? 0 : 0.14), z: Z + (d - 0.5) * jt - (near ? near[1] * push : 0), r, ph: e * 6.28 });
      if (!near && e < 0.45) this.clouds.push({ cell: i, on: true, leave: -1, x: X + (d - 0.5) * 0.7, y: 0.95 + a * 0.3, z: Z + (b - 0.5) * 0.7, r: 0.4 + c2 * 0.25, ph: a * 6.28 });
    }
    this.leaving = 0;
    this.writeClouds(0, true);
  }

  writeClouds(T, all) {
    let n = 0, stillLeaving = 0;
    for (const c of this.clouds) {
      if (!c.on) continue;
      let x = c.x, z = c.z, s = c.r, y = c.y + Math.sin(T * 0.5 + c.ph) * 0.05;
      if (c.leave >= 0) {
        const k = Math.max(0, c.leave - c.delay) / 2.2;
        if (k >= 1) { c.on = false; continue; }
        const e = k * k;
        x += c.dx * e * 4; z += c.dz * e * 4; y += e * 0.8; s *= 1 - e;
        stillLeaving++;
      }
      if (n >= this.cloudCap) break;
      _o.position.set(x, y, z);
      _o.scale.set(s, s * 0.78, s);
      _o.rotation.set(0, c.ph, 0);
      _o.updateMatrix();
      this.cloudMesh.setMatrixAt(n++, _o.matrix);
    }
    this.cloudMesh.count = n;
    this.cloudMesh.instanceMatrix.needsUpdate = true;
    this.leaving = stillLeaving;
    void all;
  }

  makeFloor(open) {
    const pos = [];
    const Y = 0.36;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (open[idx(x, y)]) continue;
      const a = wx(x) - 0.01, b = wx(x + 1) + 0.01, c = wz(y) - 0.01, d = wz(y + 1) + 0.01;
      pos.push(a, Y, c, a, Y, d, b, Y, d, a, Y, c, b, Y, d, b, Y, c);
      // skirt toward open neighbours so the edge of the mist is closed
      for (const [dx, dy, p] of [[1, 0, [b, c, b, d]], [-1, 0, [a, d, a, c]], [0, 1, [b, d, a, d]], [0, -1, [a, c, b, c]]]) {
        const nx = x + dx, ny = y + dy;
        if (!inBounds(nx, ny) || !open[idx(nx, ny)]) continue;
        pos.push(p[0], Y, p[1], p[0], -0.3, p[1], p[2], -0.3, p[3], p[0], Y, p[1], p[2], -0.3, p[3], p[2], Y, p[3]);
      }
    }
    this.floorMesh.geometry.dispose();
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    this.floorMesh.geometry = g;
    this.floorMat.side = THREE.DoubleSide;
    this.floorMesh.visible = pos.length > 0;
  }

  setQuality(q) { this.decorScale = q === 'low' ? 0.5 : 1; }

  // ---------- per-frame ----------

  update(T, dt, occ) {
    // sea of mist drifts (slowly, so every third frame is enough)
    for (const l of this.seaLayers) {
      if ((this.frameNo || 0) % 3 !== 0) break;
      l.pool.begin();
      for (const b of l.blobs) {
        const x = b.x + Math.sin(T * l.speed * 0.3 + b.ph) * 3, z = b.z + Math.cos(T * l.speed * 0.23 + b.ph * 1.7) * 2.4;
        l.pool.push(x, l.y + Math.sin(T * 0.2 + b.ph) * 0.2, z, b.s, b.s * 0.32, b.s * 0.8, b.ph);
      }
      l.pool.end();
    }
    // clouds: slow breathing; full update only while some are rolling away
    if (this.leaving) { for (const c of this.clouds) if (c.leave >= 0) c.leave += dt; this.writeClouds(T, false); }
    else this.cloudMesh.position.y = Math.sin(T * 0.45) * 0.04;
    this.frameNo = (this.frameNo || 0) + 1;

    // water
    const pa = this.waterMesh.geometry.attributes.position;
    const arr = pa.array;
    for (let i = 0, v = 0; i < arr.length; i += 3, v++) {
      if (!this.waterBase[v]) continue;
      arr[i + 1] = WATER_Y + Math.sin(T * 1.3 + arr[i] * 1.9 + arr[i + 2] * 1.3) * 0.028;
    }
    pa.needsUpdate = true;

    // grass and flowers
    const tn = Math.floor(this.tufts.length * this.decorScale);
    this.tuftPool.begin();
    for (let i = 0; i < tn; i++) {
      const t = this.tufts[i];
      if (occ && occ[t.cell]) continue;
      const sway = Math.sin(T * 1.7 + t.x * 0.8 + t.z * 0.6 + t.ph) * 0.2;
      this.tuftPool.push(t.x, t.y, t.z, t.s, t.s, t.s, t.ry, sway * 0.6, sway, t.c);
    }
    this.tuftPool.end();
    const fn = Math.floor(this.flowers.length * this.decorScale);
    this.flowerPool.begin();
    for (let i = 0; i < fn; i++) {
      const f = this.flowers[i];
      if (occ && occ[f.cell]) continue;
      const sway = Math.sin(T * 1.4 + f.x * 0.8 + f.z * 0.6 + f.ph) * 0.14;
      this.flowerPool.push(f.x, f.y, f.z, f.s, f.s, f.s, f.ry, sway, sway * 0.5, f.c);
    }
    this.flowerPool.end();

    // blinking beacon lamp, pulsing crystals
    const on = Math.sin(T * 4.2) > 0.1;
    this.beaconLamp.mesh.material.color.setHex(on ? 0xFF5A45 : 0x6A2A22);
    this.beaconHalo.mesh.visible = on;
    const p = 0.85 + 0.25 * Math.sin(T * 2.1);
    this.matCrystal.color.setRGB(p, p, p);
    if (this.holeGlow && this.holeGlow.visible) this.holeGlow.material.opacity = 0.45 + 0.25 * Math.sin(T * 1.7);
  }
}
