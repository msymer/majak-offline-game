// Geometry helpers: models are merged from basic shapes with colours in vertices (no textures),
// and drawn in bulk through instanced meshes.
import * as THREE from '../../vendor/three.module.min.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _v = new THREE.Vector3();
const _c = new THREE.Color();
const _c2 = new THREE.Color();

// Box whose top edge is chamfered: bottom at y = 0.
export function bevelBoxGeometry(w, h, d, b) {
  const x = w / 2, z = d / 2, y1 = Math.max(0, h - b), xi = x - b, zi = z - b;
  const P = [
    [-x, 0, -z], [x, 0, -z], [x, 0, z], [-x, 0, z],       // 0-3 bottom ring
    [-x, y1, -z], [x, y1, -z], [x, y1, z], [-x, y1, z],   // 4-7 shoulder ring
    [-xi, h, -zi], [xi, h, -zi], [xi, h, zi], [-xi, h, zi], // 8-11 top ring
  ];
  const quads = [
    [3, 2, 6, 7], [2, 1, 5, 6], [1, 0, 4, 5], [0, 3, 7, 4],     // sides
    [7, 6, 10, 11], [6, 5, 9, 10], [5, 4, 8, 9], [4, 7, 11, 8], // chamfers
    [11, 10, 9, 8],                                             // top
    [0, 1, 2, 3],                                               // bottom
  ];
  const pos = [];
  for (const [a, b2, c, d2] of quads) for (const i of [a, b2, c, a, c, d2]) pos.push(...P[i]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

export class Builder {
  constructor() { this.pos = []; this.nor = []; this.col = []; }

  // Adds a geometry. opts: x,y,z, rx,ry,rz, s | sx,sy,sz, shade (brightness of the lowest vertices),
  // top (colour blended in toward the highest vertices), topFrom (0..1 where the blend starts), glow (multiplier).
  add(geo, color, o = {}) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (!g.attributes.normal) g.computeVertexNormals();
    const s = o.s ?? 1;
    _e.set(o.rx || 0, o.ry || 0, o.rz || 0, 'YXZ');
    _q.setFromEuler(_e);
    _p.set(o.x || 0, o.y || 0, o.z || 0);
    _s.set((o.sx ?? 1) * s, (o.sy ?? 1) * s, (o.sz ?? 1) * s);
    _m.compose(_p, _q, _s);
    const pa = g.attributes.position, na = g.attributes.normal;
    const start = this.pos.length / 3;
    let y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < pa.count; i++) {
      _v.fromBufferAttribute(pa, i).applyMatrix4(_m);
      this.pos.push(_v.x, _v.y, _v.z);
      if (_v.y < y0) y0 = _v.y;
      if (_v.y > y1) y1 = _v.y;
      _v.fromBufferAttribute(na, i).applyQuaternion(_q);
      this.nor.push(_v.x, _v.y, _v.z);
    }
    const shade = o.shade ?? 0.85, glow = o.glow ?? 1, h = Math.max(1e-6, y1 - y0);
    _c.setHex(color);
    const hasTop = o.top !== undefined;
    if (hasTop) _c2.setHex(o.top);
    const from = o.topFrom ?? 0.5;
    for (let i = 0; i < pa.count; i++) {
      const t = (this.pos[(start + i) * 3 + 1] - y0) / h;
      const f = (shade + (1 - shade) * t) * glow;
      let r = _c.r, gg = _c.g, b = _c.b;
      if (hasTop && t > from) { const k = Math.min(1, (t - from) / Math.max(1e-6, 1 - from)); r += (_c2.r - r) * k; gg += (_c2.g - gg) * k; b += (_c2.b - b) * k; }
      this.col.push(r * f, gg * f, b * f);
    }
    return this;
  }

  box(w, h, d, color, o) { return this.add(new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0), color, o); }
  bevel(w, h, d, b, color, o) { return this.add(bevelBoxGeometry(w, h, d, b), color, o); }
  cyl(rTop, rBot, h, seg, color, o) { return this.add(new THREE.CylinderGeometry(rTop, rBot, h, seg).translate(0, h / 2, 0), color, o); }
  cone(r, h, seg, color, o) { return this.add(new THREE.ConeGeometry(r, h, seg).translate(0, h / 2, 0), color, o); }
  sphere(r, color, o, ws = 10, hs = 8) { return this.add(new THREE.SphereGeometry(r, ws, hs), color, o); }
  ico(r, detail, color, o) { return this.add(new THREE.IcosahedronGeometry(r, detail), color, o); }
  octa(r, color, o) { return this.add(new THREE.OctahedronGeometry(r, 0), color, o); }
  dodeca(r, color, o) { return this.add(new THREE.DodecahedronGeometry(r, 0), color, o); }
  torus(r, tube, color, o, rs = 5, ts = 14) { return this.add(new THREE.TorusGeometry(r, tube, rs, ts).rotateX(Math.PI / 2), color, o); }

  get empty() { return this.pos.length === 0; }

  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.computeBoundingSphere();
    return g;
  }
}

export function lit(opts = {}) {
  return new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, ...opts });
}
export function unlit(opts = {}) {
  return new THREE.MeshBasicMaterial({ vertexColors: true, ...opts });
}
export function additive(color = 0xffffff, opacity = 1, opts = {}) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, ...opts });
}

const _o = new THREE.Object3D();
_o.rotation.order = 'YXZ';
const _pc = new THREE.Color();

// Instanced mesh with a simple per-frame fill API.
export class Pool {
  constructor(parent, geo, mat, cap, { shadow = false, receive = false, color = false, order = 0 } = {}) {
    this.mesh = new THREE.InstancedMesh(geo, mat, cap);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.castShadow = shadow;
    this.mesh.receiveShadow = receive;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = order;
    if (color) {
      this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3).fill(1), 3);
      this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    }
    this.cap = cap;
    this.n = 0;
    this.mesh.count = 0;
    parent.add(this.mesh);
  }
  begin() { this.n = 0; }
  // Position, scale, then rotation: ry (yaw) first, then rx, rz. color: hex number, THREE.Color or null.
  push(x, y, z, sx = 1, sy = 1, sz = 1, ry = 0, rx = 0, rz = 0, color = null) {
    if (this.n >= this.cap) return;
    _o.position.set(x, y, z);
    _o.rotation.set(rx, ry, rz);
    _o.scale.set(sx, sy, sz);
    _o.updateMatrix();
    this.mesh.setMatrixAt(this.n, _o.matrix);
    if (this.mesh.instanceColor) {
      if (color === null) _pc.setRGB(1, 1, 1);
      else if (typeof color === 'number') _pc.setHex(color);
      else _pc.copy(color);
      this.mesh.setColorAt(this.n, _pc);
    }
    this.n++;
  }
  pushMatrix(m, color = null) {
    if (this.n >= this.cap) return;
    this.mesh.setMatrixAt(this.n, m);
    if (this.mesh.instanceColor) {
      if (color === null) _pc.setRGB(1, 1, 1);
      else if (typeof color === 'number') _pc.setHex(color);
      else _pc.copy(color);
      this.mesh.setColorAt(this.n, _pc);
    }
    this.n++;
  }
  // Uploads only the part of the buffers that is really used; an empty pool uploads nothing.
  end() {
    const m = this.mesh;
    if (this.n === 0 && m.count === 0) return;
    m.count = this.n;
    if (this.n === 0) return;
    const im = m.instanceMatrix;
    im.clearUpdateRanges(); im.addUpdateRange(0, this.n * 16); im.needsUpdate = true;
    const ic = m.instanceColor;
    if (ic) { ic.clearUpdateRanges(); ic.addUpdateRange(0, this.n * 3); ic.needsUpdate = true; }
  }
}

// Small deterministic random generator for decoration placement.
export function seeded(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
