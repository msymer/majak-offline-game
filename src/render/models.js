// Shapes of everything that is not terrain: lighthouse, buildings, enemies, Knot.
// All built from basic shapes with colours in vertices. Silhouette first, no thin details.
import * as THREE from '../../vendor/three.module.min.js';
import { C } from './palette.js';
import { Builder, lit, unlit, additive } from './geo.js';

// ---------- buildings ----------
// body  = fixed base, bodyH = its height
// floor = extra storey added for every level above 1, floorH = its height
// the rest are moving parts placed on top

export function buildingModels() {
  const M = {};

  // Wall
  {
    const b = new Builder();
    b.bevel(0.9, 0.46, 0.9, 0.04, C.wallStone, { shade: 0.78 });
    b.box(0.92, 0.07, 0.92, 0xD9C7A6, { y: 0.19, shade: 0.9 });
    b.box(0.58, 0.02, 0.58, 0xCDBB9C, { y: 0.46, shade: 1 });
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) b.bevel(0.27, 0.19, 0.27, 0.03, C.cream, { x: sx * 0.3, y: 0.46, z: sz * 0.3, shade: 0.88 });
    const l = new Builder();
    l.box(0.2, 0.4, 0.56, C.wallStone, { shade: 0.78 });
    l.box(0.2, 0.07, 0.58, 0xD9C7A6, { y: 0.19, shade: 0.9 });
    l.box(0.2, 0.03, 0.4, 0xCDBB9C, { y: 0.4, shade: 1 });
    M.wall = { body: b.build(), bodyH: 0.65, link: l.build(), r: 0.5 };
  }

  // Archer tower: slim six-sided tower of wood and cream boards, crossbow on a turning platform.
  {
    const b = new Builder();
    b.cyl(0.36, 0.42, 0.12, 6, C.wood, { shade: 0.8 });
    b.cyl(0.27, 0.33, 0.44, 6, C.cream, { y: 0.12, shade: 0.8 });
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + Math.PI / 6; b.box(0.055, 0.46, 0.055, C.woodLight, { x: Math.cos(a) * 0.3, y: 0.11, z: Math.sin(a) * 0.3, ry: -a, rz: 0.11, shade: 0.8 }); }
    b.cyl(0.31, 0.29, 0.06, 6, C.wood, { y: 0.56, shade: 0.9 });
    b.box(0.09, 0.15, 0.03, 0x3B2F2F, { y: 0.26, z: 0.285, shade: 1 });
    const f = new Builder();
    f.cyl(0.27, 0.27, 0.24, 6, C.cream, { shade: 0.86 });
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + Math.PI / 6; f.box(0.05, 0.24, 0.05, C.woodLight, { x: Math.cos(a) * 0.265, z: Math.sin(a) * 0.265, ry: -a, shade: 0.9 }); }
    f.cyl(0.32, 0.32, 0.06, 6, C.brass, { y: 0.24, shade: 0.9 });
    const t = new Builder();
    t.cyl(0.4, 0.31, 0.09, 6, C.woodLight, { shade: 0.8 });
    t.cyl(0.07, 0.08, 0.13, 6, C.wood, { y: 0.09 });
    t.box(0.72, 0.085, 0.12, C.wood, { x: 0.06, y: 0.21, shade: 0.9 });
    t.box(0.09, 0.08, 0.44, C.brass, { x: 0.34, y: 0.215, shade: 0.9 });
    t.box(0.09, 0.08, 0.27, C.brass, { x: 0.26, y: 0.215, z: 0.31, ry: -0.7, shade: 0.9 });
    t.box(0.09, 0.08, 0.27, C.brass, { x: 0.26, y: 0.215, z: -0.31, ry: 0.7, shade: 0.9 });
    t.box(0.46, 0.045, 0.045, C.cream, { x: 0.17, y: 0.295, shade: 1 });
    t.cyl(0.02, 0.02, 0.4, 4, C.wood, { x: -0.3, y: 0.09 });
    t.box(0.2, 0.13, 0.03, C.orange, { x: -0.41, y: 0.36, shade: 0.95 });
    M.archer = { body: b.build(), bodyH: 0.62, floor: f.build(), floorH: 0.3, top: t.build(), topH: 0.5, r: 0.36, gem: C.amber };
  }

  // Cannon: low wide keg with hoops, a thick short barrel of dark metal.
  {
    const b = new Builder();
    b.cyl(0.45, 0.39, 0.21, 10, C.oak, { shade: 0.74 });
    b.cyl(0.39, 0.45, 0.21, 10, C.oak, { y: 0.21, shade: 0.9 });
    b.cyl(0.435, 0.425, 0.05, 10, C.brass, { y: 0.06, shade: 0.9 });
    b.cyl(0.425, 0.435, 0.05, 10, C.brass, { y: 0.31, shade: 0.95 });
    b.cyl(0.35, 0.39, 0.03, 10, C.wood, { y: 0.42, shade: 1 });
    const f = new Builder();
    f.cyl(0.4, 0.42, 0.15, 10, C.wallStone, { shade: 0.84 });
    f.cyl(0.44, 0.44, 0.05, 10, C.brass, { y: 0.15, shade: 0.92 });
    const t = new Builder();
    t.box(0.22, 0.16, 0.36, C.wood, { shade: 0.85 });
    t.cyl(0.12, 0.12, 0.4, 6, C.brass, { y: 0.09, z: -0.2, rx: Math.PI / 2, shade: 1 });
    const br = new Builder();
    br.add(new THREE.CylinderGeometry(0.135, 0.175, 0.56, 9).rotateZ(-Math.PI / 2), C.iron, { x: 0.16, shade: 0.8 });
    br.add(new THREE.CylinderGeometry(0.16, 0.16, 0.07, 9).rotateZ(-Math.PI / 2), C.brass, { x: 0.43, shade: 0.85 });
    br.sphere(0.175, C.iron, { x: -0.12, shade: 0.8 }, 9, 7);
    M.cannon = { body: b.build(), bodyH: 0.45, floor: f.build(), floorH: 0.2, top: t.build(), barrel: br.build(), topH: 0.4, r: 0.44, gem: C.orange };
  }

  // Frost tower: warm stone pedestal, a floating light-blue crystal with three shards.
  {
    const b = new Builder();
    b.cyl(0.3, 0.4, 0.14, 6, C.wallStone, { shade: 0.78 });
    b.cyl(0.22, 0.3, 0.3, 6, C.cream, { y: 0.14, shade: 0.8 });
    b.cyl(0.255, 0.255, 0.05, 6, C.brass, { y: 0.42, shade: 0.9 });
    b.cyl(0.32, 0.23, 0.09, 6, C.wallStone, { y: 0.46, shade: 0.85 });
    const f = new Builder();
    f.cyl(0.24, 0.24, 0.15, 6, C.cream, { shade: 0.86 });
    f.cyl(0.29, 0.29, 0.05, 6, C.brass, { y: 0.15, shade: 0.92 });
    const cr = new Builder();
    cr.octa(0.2, C.crystal, { sy: 1.5, shade: 0.7 });
    const sh = new Builder();
    sh.octa(0.07, C.crystal, { sy: 1.5, shade: 0.75 });
    M.frost = { body: b.build(), bodyH: 0.55, floor: f.build(), floorH: 0.2, crystal: cr.build(), shard: sh.build(), topH: 0.7, r: 0.36, gem: 0x5FD6FF };
  }

  // Mine: wooden hut with a slanted roof, a crane with a pulley, a cart on a short rail.
  {
    const hx = -0.13, hz = -0.1;
    const b = new Builder();
    b.bevel(0.54, 0.36, 0.46, 0.02, C.woodLight, { x: hx, z: hz, shade: 0.76 });
    b.box(0.57, 0.05, 0.49, C.wood, { x: hx, y: 0.15, z: hz, shade: 0.95 });
    b.box(0.17, 0.23, 0.03, 0x3B2F2F, { x: hx, z: hz + 0.23, shade: 1 });
    b.box(0.88, 0.035, 0.04, C.iron, { y: 0.0, z: 0.3, shade: 1 });
    b.box(0.88, 0.035, 0.04, C.iron, { y: 0.0, z: 0.43, shade: 1 });
    for (const sx of [-0.3, 0, 0.3]) b.box(0.06, 0.02, 0.2, C.wood, { x: sx, y: 0, z: 0.365, shade: 1 });
    b.box(0.07, 0.74, 0.07, C.wood, { x: 0.33, z: -0.18, shade: 0.8 });
    b.box(0.07, 0.06, 0.5, C.wood, { x: 0.33, y: 0.7, z: 0.02, shade: 0.95 });
    b.box(0.03, 0.3, 0.03, C.cream, { x: 0.33, y: 0.42, z: 0.24, shade: 1 });
    b.cyl(0.075, 0.075, 0.06, 8, C.brass, { x: 0.33, y: 0.66, z: 0.24, rz: Math.PI / 2, shade: 1 });
    const f = new Builder();
    f.box(0.54, 0.18, 0.46, C.cream, { x: hx, z: hz, shade: 0.86 });
    f.box(0.58, 0.045, 0.5, C.brass, { x: hx, y: 0.175, z: hz, shade: 0.95 });
    const t = new Builder();
    t.box(0.54, 0.14, 0.07, C.woodLight, { x: hx, y: 0, z: hz - 0.195, shade: 0.9 });
    t.box(0.68, 0.06, 0.62, C.orange, { x: hx, y: 0.1, z: hz, rx: 0.3, shade: 0.9 });
    t.box(0.11, 0.26, 0.11, C.stoneL, { x: hx - 0.14, y: 0.1, z: hz - 0.12, shade: 0.8 });
    const c = new Builder();
    c.box(0.22, 0.12, 0.15, C.wood, { y: 0.06, shade: 0.8 });
    c.box(0.16, 0.06, 0.1, C.gold, { y: 0.18, shade: 0.9 });
    c.cyl(0.045, 0.045, 0.17, 6, C.iron, { x: -0.06, y: 0.045, z: -0.085, rx: Math.PI / 2, shade: 1 });
    c.cyl(0.045, 0.045, 0.17, 6, C.iron, { x: 0.06, y: 0.045, z: -0.085, rx: Math.PI / 2, shade: 1 });
    M.mine = { body: b.build(), bodyH: 0.36, floor: f.build(), floorH: 0.22, top: t.build(), cart: c.build(), topH: 0.4, r: 0.44, gem: C.amber, chimney: [hx - 0.14, 0.38, hz - 0.12] };
  }

  // Lightning tower: copper coil (rings on a post) with a ball on top.
  {
    const b = new Builder();
    b.cyl(0.34, 0.4, 0.12, 8, C.wallStone, { shade: 0.78 });
    b.cyl(0.09, 0.11, 0.5, 8, C.copper, { y: 0.12, shade: 0.8 });
    for (let i = 0; i < 3; i++) b.torus(0.2 - i * 0.03, 0.035, C.copper, { y: 0.2 + i * 0.13, shade: 0.9 }, 5, 12);
    const f = new Builder();
    f.cyl(0.2, 0.22, 0.16, 8, C.cream, { shade: 0.86 });
    f.torus(0.22, 0.03, C.brass, { y: 0.16, shade: 1 }, 4, 12);
    const ball = new Builder();
    ball.sphere(0.15, 0xFFFFFF, { shade: 1 }, 10, 8);
    const small = new Builder();
    small.sphere(0.07, 0xFFFFFF, { shade: 1 }, 8, 6);
    M.lightning = { body: b.build(), bodyH: 0.62, floor: f.build(), floorH: 0.2, ball: ball.build(), small: small.build(), topH: 0.4, r: 0.3, gem: 0xFFD86B };
  }

  // Amplifier: brass dish on a tripod with a glowing core.
  {
    const b = new Builder();
    for (let i = 0; i < 3; i++) { const a = i * 2.094; b.box(0.05, 0.5, 0.05, C.wood, { x: Math.cos(a) * 0.2, y: 0, z: Math.sin(a) * 0.2, rx: Math.sin(a) * 0.35, rz: -Math.cos(a) * 0.35, shade: 0.8 }); }
    b.cyl(0.38, 0.12, 0.16, 12, C.brass, { y: 0.46, shade: 0.75 });
    b.cyl(0.1, 0.1, 0.04, 8, C.wood, { y: 0.44 });
    const core = new Builder();
    core.ico(0.1, 1, 0xFFFFFF, { shade: 1 });
    M.amplifier = { body: b.build(), bodyH: 0.62, core: core.build(), topH: 0.15, r: 0.38 };
  }

  // Trap: flat plate with spikes, nearly level with the ground.
  {
    const b = new Builder();
    b.cyl(0.4, 0.42, 0.05, 8, C.stoneD, { shade: 0.85 });
    b.cyl(0.33, 0.33, 0.02, 8, 0x4B4652, { y: 0.05 });
    const sp = new Builder();
    for (let i = 0; i < 7; i++) { const a = i * 0.9, r = i === 0 ? 0 : 0.2; sp.cone(0.05, 0.22, 4, C.cream, { x: Math.cos(a) * r, z: Math.sin(a) * r, shade: 0.7 }); }
    M.trap = { body: b.build(), bodyH: 0.05, spikes: sp.build(), topH: 0.1, r: 0.42, flat: true };
  }

  // Teleport: a ring of stones on the ground with a turning spiral of light.
  {
    const b = new Builder();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; b.bevel(0.15, 0.12, 0.12, 0.02, 0xA9ABB3, { x: Math.cos(a) * 0.36, z: Math.sin(a) * 0.36, ry: -a, shade: 0.75 }); }
    b.cyl(0.32, 0.34, 0.02, 16, 0x2B3A5A, {});
    const sp = new Builder();
    for (let i = 0; i < 14; i++) { const a = i * 0.55, r = 0.04 + i * 0.019; sp.box(0.06, 0.015, 0.03, 0xFFFFFF, { x: Math.cos(a) * r, z: Math.sin(a) * r, ry: -a, shade: 1 }); }
    M.teleport = { body: b.build(), bodyH: 0.02, spiral: sp.build(), topH: 0.1, r: 0.42, flat: true };
  }

  // Wreck: a heap of rubble and a few boards.
  {
    const b = new Builder();
    b.dodeca(0.2, 0xB9AC96, { x: -0.12, y: 0.06, z: 0.05, sy: 0.6, shade: 0.75 });
    b.dodeca(0.16, 0xCDBB9C, { x: 0.15, y: 0.05, z: -0.1, sy: 0.6, ry: 1, shade: 0.75 });
    b.dodeca(0.12, 0x9A9CA5, { x: 0.05, y: 0.13, z: 0.17, sy: 0.7, shade: 0.75 });
    b.box(0.4, 0.04, 0.08, C.woodLight, { x: 0.02, y: 0.16, z: 0, ry: 0.7, rz: 0.25, shade: 0.9 });
    b.box(0.3, 0.04, 0.07, C.wood, { x: -0.05, y: 0.12, z: -0.18, ry: -0.4, rz: -0.2, shade: 0.9 });
    M.wreck = { body: b.build(), bodyH: 0.2, r: 0.4 };
  }

  // Specialisation tops.
  {
    const sn = new Builder(); // sniper: long barrel with a scope
    sn.cyl(0.36, 0.3, 0.09, 6, C.woodLight, { shade: 0.8 });
    sn.box(0.95, 0.07, 0.07, C.iron, { x: 0.25, y: 0.2, shade: 0.85 });
    sn.box(0.3, 0.09, 0.12, C.wood, { x: -0.08, y: 0.17, shade: 0.9 });
    sn.cyl(0.04, 0.04, 0.26, 6, C.brass, { x: 0.1, y: 0.3, rz: Math.PI / 2, shade: 1 });
    sn.box(0.06, 0.06, 0.06, C.coral, { x: 0.72, y: 0.2, shade: 1 });
    const ga = new Builder(); // gatling: three barrels
    ga.cyl(0.36, 0.3, 0.09, 6, C.woodLight, { shade: 0.8 });
    ga.box(0.26, 0.2, 0.26, C.brass, { y: 0.09, shade: 0.85 });
    for (const [dy, dz] of [[0.25, 0], [0.16, 0.08], [0.16, -0.08]]) ga.cyl(0.035, 0.035, 0.5, 6, C.iron, { x: 0.32, y: dy, z: dz, rz: Math.PI / 2, shade: 0.9 });
    const wide = new Builder(); // shrapnel: flared muzzle
    wide.add(new THREE.CylinderGeometry(0.135, 0.175, 0.5, 9).rotateZ(-Math.PI / 2), C.iron, { x: 0.14, shade: 0.8 });
    wide.add(new THREE.CylinderGeometry(0.26, 0.14, 0.14, 9).rotateZ(-Math.PI / 2), C.brass, { x: 0.44, shade: 0.85 });
    wide.sphere(0.175, C.iron, { x: -0.12, shade: 0.8 }, 9, 7);
    const hot = new Builder(); // incendiary: barrel with red hot bands
    hot.add(new THREE.CylinderGeometry(0.135, 0.175, 0.56, 9).rotateZ(-Math.PI / 2), C.iron, { x: 0.16, shade: 0.8 });
    hot.add(new THREE.CylinderGeometry(0.17, 0.17, 0.06, 9).rotateZ(-Math.PI / 2), C.coral, { x: 0.3, shade: 1 });
    hot.add(new THREE.CylinderGeometry(0.15, 0.15, 0.08, 9).rotateZ(-Math.PI / 2), 0xFF7A2A, { x: 0.45, shade: 1 });
    hot.sphere(0.175, C.iron, { x: -0.12, shade: 0.8 }, 9, 7);
    M.spec = { sniper: sn.build(), gatling: ga.build(), shrapnel: wide.build(), incendiary: hot.build() };
  }

  // Level 3: glowing band in the tower's colour. Level 4: a small golden crown.
  {
    const g = new Builder();
    g.torus(1, 0.09, 0xffffff, { shade: 1 }, 5, 12);
    M.gem = g.build();
    const c = new Builder();
    c.cyl(0.2, 0.22, 0.07, 8, C.gold, { shade: 0.85 });
    for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; c.cone(0.045, 0.13, 4, C.gold, { x: Math.cos(a) * 0.18, y: 0.06, z: Math.sin(a) * 0.18, shade: 0.9 }); }
    M.crown = c.build();
  }
  return M;
}

// ---------- enemies ----------

export function enemyModels() {
  const M = {};
  // Slime: a flattened ball with a flat bottom.
  {
    const g = new THREE.SphereGeometry(0.5, 12, 8);
    g.scale(1, 0.84, 1).translate(0, 0.33, 0);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getY(i) < 0) { p.setY(i, 0); p.setX(i, p.getX(i) * 1.06); p.setZ(i, p.getZ(i) * 1.06); }
    g.computeVertexNormals();
    M.blob = new Builder().add(g, 0xffffff, { shade: 0.68 }).build();
  }
  // Šmejdil: a small drop with a tip that leans back.
  {
    const g = new THREE.SphereGeometry(0.5, 10, 7);
    g.scale(1.05, 0.8, 0.9).translate(0, 0.3, 0);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getY(i) < 0) p.setY(i, 0);
    g.computeVertexNormals();
    const b = new Builder().add(g, 0xffffff, { shade: 0.7 });
    b.cone(0.2, 0.5, 7, 0xffffff, { x: -0.1, y: 0.56, rz: 0.55, shade: 0.9 });
    M.runner = b.build();
  }
  // Boss crown, pale like the mist.
  {
    const b = new Builder();
    b.cyl(0.27, 0.3, 0.12, 10, 0xF2F6FB, { shade: 0.85 });
    for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; b.cone(0.085, 0.28, 4, 0xF2F6FB, { x: Math.cos(a) * 0.24, y: 0.1, z: Math.sin(a) * 0.24, shade: 0.9 }); b.octa(0.05, C.crystal, { x: Math.cos(a) * 0.24, y: 0.4, z: Math.sin(a) * 0.24 }); }
    M.crown = b.build();
  }
  M.ball = new THREE.SphereGeometry(0.5, 7, 5);
  M.dot = new THREE.SphereGeometry(0.5, 5, 3);

  // All of these face +x, stand on y = 0 and are about 1 unit across (scaled by the enemy size).
  // Robot: two boxes screwed together a bit crooked, wheels, rust spots.
  {
    const b = new Builder();
    b.bevel(0.7, 0.42, 0.6, 0.05, C.plech, { y: 0.12, shade: 0.7 });
    b.bevel(0.56, 0.36, 0.5, 0.05, 0x7E9BB6, { y: 0.52, rz: 0.08, ry: 0.06, shade: 0.75 });
    b.box(0.1, 0.1, 0.03, C.rust, { x: 0.12, y: 0.3, z: 0.3, shade: 1 });
    b.box(0.08, 0.06, 0.03, C.rust, { x: -0.2, y: 0.2, z: -0.3, shade: 1 });
    for (const [x, z] of [[0.22, 0.32], [-0.22, 0.32], [0.22, -0.32], [-0.22, -0.32]]) b.cyl(0.11, 0.11, 0.07, 8, C.iron, { x, y: 0.11, z, rx: Math.PI / 2, shade: 0.9 });
    M.robot = b.build();
  }
  // Collector: robot with a sack on the back and a magnet arm.
  {
    const b = new Builder();
    b.bevel(0.6, 0.5, 0.52, 0.05, C.plech, { y: 0.1, shade: 0.7 });
    b.sphere(0.32, 0xA0805A, { x: -0.36, y: 0.52, sy: 1.1, shade: 0.75 }, 9, 7);
    b.box(0.1, 0.06, 0.4, 0x6B4A3A, { x: -0.36, y: 0.82, shade: 1 });
    b.box(0.4, 0.07, 0.07, C.plech, { x: 0.38, y: 0.38, z: 0.2, shade: 0.9 });
    b.torus(0.09, 0.035, C.coral, { x: 0.6, y: 0.38, z: 0.2, rz: Math.PI / 2, shade: 1 }, 4, 8);
    for (const z of [0.27, -0.27]) b.cyl(0.1, 0.1, 0.07, 8, C.iron, { y: 0.1, z, rx: Math.PI / 2, shade: 0.9 });
    M.collector = b.build();
  }
  // Demolisher: wide robot with a hammer instead of one arm (ball variant: a heavy ball on a chain).
  for (const ball of [false, true]) {
    const b = new Builder();
    b.bevel(0.7, 0.6, 0.78, 0.06, 0x7D8FA3, { y: 0.1, shade: 0.7 });
    b.box(0.1, 0.1, 0.03, C.rust, { x: -0.1, y: 0.3, z: 0.39, shade: 1 });
    for (const [x, z] of [[0.24, 0.36], [-0.24, 0.36], [0.24, -0.36], [-0.24, -0.36]]) b.cyl(0.12, 0.12, 0.08, 8, C.iron, { x, y: 0.12, z, rx: Math.PI / 2, shade: 0.9 });
    b.box(0.08, 0.5, 0.08, C.wood, { x: 0.18, y: 0.55, z: -0.42, rz: -0.5, shade: 0.9 });
    if (ball) b.sphere(0.22, 0x3B3843, { x: 0.45, y: 0.95, z: -0.42, shade: 0.75 }, 10, 8);
    else b.box(0.26, 0.2, 0.2, C.iron, { x: 0.42, y: 0.92, z: -0.42, rz: -0.5, shade: 0.8 });
    M[ball ? 'ballbot' : 'demolisher'] = b.build();
  }
  // Drone: a can with a propeller (the propeller spins as a separate part).
  {
    const b = new Builder();
    b.cyl(0.24, 0.24, 0.46, 10, 0x8BA3BA, { shade: 0.7 });
    b.cyl(0.25, 0.25, 0.08, 10, C.plech, { y: 0.0, shade: 0.9 });
    b.cyl(0.05, 0.05, 0.16, 6, C.iron, { y: 0.46 });
    M.drone = b.build();
    const r = new Builder();
    r.box(0.9, 0.025, 0.08, C.iron, { shade: 1 });
    r.box(0.08, 0.025, 0.9, C.iron, { shade: 1 });
    M.rotor = r.build();
  }
  // Healer's lantern on a pole (drawn next to a purple slime).
  {
    const b = new Builder();
    b.box(0.04, 0.7, 0.04, C.wood, { shade: 0.9 });
    b.box(0.12, 0.14, 0.12, 0xFFFFFF, { y: 0.66, shade: 1 });
    M.lantern = b.build();
  }
  // Roller: a drum lying on its side with golden ends.
  {
    const b = new Builder();
    b.add(new THREE.CylinderGeometry(0.42, 0.42, 0.9, 14).rotateX(Math.PI / 2), 0x8D8F98, { y: 0.42, shade: 0.65 });
    for (const z of [0.47, -0.47]) b.add(new THREE.CylinderGeometry(0.44, 0.44, 0.06, 14).rotateX(Math.PI / 2), C.brass, { y: 0.42, z, shade: 0.85 });
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; b.box(0.05, 0.05, 0.9, 0x6C6E78, { x: Math.cos(a) * 0.42, y: 0.42 + Math.sin(a) * 0.42, shade: 0.9 }); }
    b.box(0.3, 0.26, 0.6, 0x7C7E88, { x: -0.3, y: 0.55, shade: 0.8 });
    M.roller = b.build();
  }
  // Ram: a wooden carriage with an iron head and curly horns.
  {
    const b = new Builder();
    b.bevel(0.9, 0.36, 0.56, 0.05, C.woodLight, { y: 0.16, shade: 0.72 });
    b.box(0.95, 0.06, 0.06, C.wood, { y: 0.56, z: 0.22, shade: 0.9 });
    b.box(0.95, 0.06, 0.06, C.wood, { y: 0.56, z: -0.22, shade: 0.9 });
    b.box(0.32, 0.34, 0.4, C.iron, { x: 0.56, y: 0.2, shade: 0.75 });
    for (const z of [0.18, -0.18]) b.torus(0.1, 0.04, 0xD9C7A6, { x: 0.6, y: 0.5, z, rx: Math.PI / 2, shade: 0.9 }, 4, 10);
    for (const [x, z] of [[0.3, 0.3], [-0.3, 0.3], [0.3, -0.3], [-0.3, -0.3]]) b.cyl(0.14, 0.14, 0.07, 8, C.iron, { x, y: 0.14, z, rx: Math.PI / 2, shade: 0.9 });
    M.ram = b.build();
  }
  // Mist creature: a small cloud (drawn with a see-through material).
  {
    const b = new Builder();
    b.sphere(0.32, 0xFFFFFF, { y: 0.42, shade: 0.8 }, 9, 7);
    b.sphere(0.24, 0xFFFFFF, { x: -0.22, y: 0.32, z: 0.12, shade: 0.8 }, 8, 6);
    b.sphere(0.22, 0xFFFFFF, { x: -0.12, y: 0.3, z: -0.2, shade: 0.8 }, 8, 6);
    b.sphere(0.2, 0xFFFFFF, { x: 0.18, y: 0.28, z: 0.16, shade: 0.8 }, 8, 6);
    M.cloud = b.build();
  }
  // Guard: a stone pillar with a rounded top.
  {
    const b = new Builder();
    b.cyl(0.32, 0.38, 0.8, 10, 0x93A4C2, { shade: 0.65 });
    b.sphere(0.32, 0xA9B8D2, { y: 0.8, sy: 0.8, shade: 0.8 }, 10, 6);
    b.cyl(0.4, 0.42, 0.1, 10, 0x7C8CAB, { shade: 0.8 });
    b.box(0.08, 0.5, 0.5, 0x2B3A5A, { x: 0.34, y: 0.1, shade: 1 });
    M.guard = b.build();
  }
  return M;
}

// ---------- lighthouse ----------

export const LH = { lamp: 3.42, top: 4.3, reach: 6.2 };

export function makeLighthouse() {
  const g = new THREE.Group();
  const b = new Builder();
  // stone base
  b.cyl(0.66, 0.76, 0.42, 10, C.stoneL, { shade: 0.7 });
  b.cyl(0.6, 0.64, 0.1, 10, 0xA9ABB3, { y: 0.42, shade: 0.9 });
  // striped tower
  const bands = 6, y0 = 0.52, bh = 0.42, rA = 0.55, rB = 0.39;
  for (let i = 0; i < bands; i++) {
    const r0 = rA + (rB - rA) * (i / bands), r1 = rA + (rB - rA) * ((i + 1) / bands);
    b.cyl(r1, r0, bh, 12, i % 2 === 0 ? C.red : C.cream, { y: y0 + bh * i, shade: 0.9 });
  }
  const top = y0 + bands * bh; // 3.04
  // gallery with a railing
  b.cyl(0.6, 0.5, 0.1, 12, C.wood, { y: top, shade: 0.85 });
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; b.box(0.05, 0.2, 0.05, C.brass, { x: Math.cos(a) * 0.55, y: top + 0.1, z: Math.sin(a) * 0.55, shade: 0.9 }); }
  b.torus(0.55, 0.035, C.brass, { y: top + 0.31, shade: 1 }, 4, 16);
  // lantern frame and roof
  b.cyl(0.36, 0.36, 0.07, 8, C.wood, { y: top + 0.1, shade: 1 });
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; b.box(0.05, 0.5, 0.05, C.wood, { x: Math.cos(a) * 0.31, y: top + 0.15, z: Math.sin(a) * 0.31, shade: 0.9 }); }
  b.cone(0.48, 0.5, 10, C.red, { y: top + 0.65, shade: 0.8 });
  b.cyl(0.42, 0.44, 0.05, 10, C.wood, { y: top + 0.62, shade: 1 });
  b.sphere(0.07, C.brass, { y: top + 1.17 }, 8, 6);
  // door (toward the camera), dark doorway toward the threshold, bench
  b.box(1.24, 0.05, 0.4, C.woodLight, { y: 0, z: 0.8, shade: 0.9 });
  b.box(0.3, 0.44, 0.08, C.wood, { y: 0.03, z: 0.7, shade: 0.85 });
  b.box(0.38, 0.05, 0.1, C.woodLight, { y: 0.47, z: 0.7, shade: 1 });
  b.box(0.3, 0.4, 0.07, 0x3B2F2F, { y: 0.02, z: -0.7, shade: 1 });
  b.box(0.4, 0.05, 0.15, C.wood, { x: -0.42, y: 0.18, z: 0.86, shade: 0.9 });
  b.box(0.05, 0.13, 0.13, C.wood, { x: -0.57, y: 0.05, z: 0.86 });
  b.box(0.05, 0.13, 0.13, C.wood, { x: -0.27, y: 0.05, z: 0.86 });
  const body = new THREE.Mesh(b.build(), lit());
  body.castShadow = true; body.receiveShadow = true;
  g.add(body);

  // glowing parts: windows, doorknob
  const gl = new Builder();
  gl.box(0.15, 0.2, 0.05, C.amber, { y: 1.75, z: 0.455, shade: 1 });
  gl.box(0.13, 0.17, 0.05, C.amber, { x: 0.3, y: 2.5, z: 0.3, ry: 0.78, shade: 1 });
  gl.box(0.05, 0.05, 0.03, C.gold, { x: 0.09, y: 0.22, z: 0.745, shade: 1 });
  const glowMat = unlit();
  g.add(new THREE.Mesh(gl.build(), glowMat));

  const vane = new THREE.Mesh(new Builder().box(0.3, 0.1, 0.025, C.brass, { x: 0.1, shade: 0.9 }).box(0.03, 0.2, 0.03, C.brass, { y: -0.1 }).build(), lit());
  vane.position.y = top + 1.33;
  g.add(vane);

  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.46, 8), new THREE.MeshLambertMaterial({ color: 0xFFF3D6, transparent: true, opacity: 0.32, emissive: 0x6A4A12, depthWrite: false }));
  glass.position.y = top + 0.4;
  glass.renderOrder = 7;
  g.add(glass);
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.17, 0), new THREE.MeshBasicMaterial({ color: C.amber }));
  crystal.position.y = LH.lamp;
  crystal.scale.y = 1.3;
  g.add(crystal);
  const glow = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 2), additive(C.amber, 0.4));
  glow.position.y = LH.lamp;
  glow.renderOrder = 8;
  g.add(glow);

  // Beam: an open cone from the lamp down to the ground, brightest at the lamp.
  const drop = LH.lamp - 0.05;
  const len = Math.hypot(LH.reach, drop);
  const cone = new THREE.ConeGeometry(1.35, len, 24, 1, true).translate(0, -len / 2, 0).rotateZ(Math.PI / 2);
  const cp = cone.attributes.position, cc = new Float32Array(cp.count * 3);
  for (let i = 0; i < cp.count; i++) { const f = 1 - 0.75 * Math.min(1, cp.getX(i) / len); cc[i * 3] = f; cc[i * 3 + 1] = f; cc[i * 3 + 2] = f; }
  cone.setAttribute('color', new THREE.BufferAttribute(cc, 3));
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xFFF0C0, vertexColors: true, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const beam = new THREE.Mesh(cone, beamMat);
  beam.rotation.z = -Math.atan2(drop, LH.reach);
  beam.renderOrder = 9;
  const pivot = new THREE.Group();
  pivot.position.y = LH.lamp;
  pivot.add(beam);
  g.add(pivot);

  return { group: g, body, vane, glass, crystal, glow, pivot, beamMat, glowMat };
}

// ---------- Knot ----------

export function makeKnot() {
  const root = new THREE.Group();
  const mat = lit();
  const glowMat = new THREE.MeshBasicMaterial({ color: C.amber });
  const part = (builder, parent, x = 0, y = 0, z = 0, m = mat) => {
    const o = new THREE.Mesh(builder.build(), m);
    o.position.set(x, y, z);
    o.castShadow = m === mat;
    parent.add(o);
    return o;
  };
  const rig = new THREE.Group(); // everything that waddles
  root.add(rig);

  const legL = part(new Builder().box(0.1, 0.17, 0.13, C.wood, { shade: 0.8 }).box(0.12, 0.05, 0.17, C.brass, { z: 0.02, shade: 1 }), rig, -0.085, 0, 0);
  const legR = part(new Builder().box(0.1, 0.17, 0.13, C.wood, { shade: 0.8 }).box(0.12, 0.05, 0.17, C.brass, { z: 0.02, shade: 1 }), rig, 0.085, 0, 0);

  const torso = new THREE.Group();
  torso.position.y = 0.16;
  rig.add(torso);
  const tb = new Builder();
  tb.bevel(0.32, 0.3, 0.25, 0.04, C.cream, { shade: 0.8 });
  tb.box(0.34, 0.055, 0.27, C.brass, { y: 0.05, shade: 1 });
  for (const sx of [-0.1, 0.1]) for (const sy of [0.15, 0.24]) tb.box(0.045, 0.045, 0.03, C.brass, { x: sx, y: sy, z: 0.125, shade: 1 });
  part(tb, torso);

  const head = new THREE.Group();
  head.position.y = 0.43;
  torso.add(head);
  const hb = new Builder();
  hb.sphere(0.175, C.cream, { shade: 0.78 }, 10, 8);
  hb.cyl(0.05, 0.05, 0.38, 6, C.brass, { x: 0.19, y: 0, rz: Math.PI / 2, shade: 1 });
  hb.cyl(0.075, 0.095, 0.05, 6, C.brass, { y: 0.15, shade: 0.9 });
  hb.cone(0.085, 0.08, 6, C.red, { y: 0.27, shade: 0.9 });
  part(hb, head);
  const eb = new Builder();
  eb.sphere(0.058, 0xffffff, { x: -0.075, y: 0.02, z: 0.145, shade: 1 }, 8, 6);
  eb.sphere(0.058, 0xffffff, { x: 0.075, y: 0.02, z: 0.145, shade: 1 }, 8, 6);
  eb.cyl(0.05, 0.05, 0.075, 6, 0xffffff, { y: 0.2, shade: 1 });
  const eyes = part(eb, head, 0, 0, 0, glowMat);

  const armL = new THREE.Group();
  armL.position.set(-0.2, 0.26, 0);
  torso.add(armL);
  part(new Builder().box(0.075, 0.2, 0.075, C.cream, { y: -0.2, shade: 0.85 }).box(0.085, 0.06, 0.085, C.brass, { y: -0.22 }), armL);

  const armR = new THREE.Group();
  armR.position.set(0.2, 0.26, 0);
  torso.add(armR);
  part(new Builder().box(0.075, 0.2, 0.075, C.cream, { y: -0.2, shade: 0.85 }).box(0.085, 0.06, 0.085, C.brass, { y: -0.22 }), armR);
  // The wrench is bigger than Knot. It is held in the right hand.
  const wrench = new THREE.Group();
  wrench.position.set(0, -0.19, 0.02);
  armR.add(wrench);
  const wb = new Builder();
  wb.box(0.065, 0.62, 0.065, C.brass, { y: -0.12, shade: 0.85 });
  wb.box(0.22, 0.09, 0.07, C.brass, { y: 0.5, shade: 1 });
  wb.box(0.07, 0.13, 0.07, C.brass, { x: -0.075, y: 0.58, shade: 1 });
  wb.box(0.07, 0.13, 0.07, C.brass, { x: 0.075, y: 0.58, shade: 1 });
  wb.cyl(0.05, 0.05, 0.07, 6, C.wood, { y: -0.16, shade: 1 });
  part(wb, wrench);

  const aura = new THREE.Mesh(new THREE.RingGeometry(1.93, 2, 64).rotateX(-Math.PI / 2), additive(C.amber, 0.22));
  aura.position.y = 0.035;
  aura.renderOrder = 3;
  root.add(aura);
  const auraFill = new THREE.Mesh(new THREE.CircleGeometry(1.93, 48).rotateX(-Math.PI / 2), additive(C.amber, 0.035));
  auraFill.position.y = 0.03;
  auraFill.renderOrder = 3;
  root.add(auraFill);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.26, 16).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.25, depthWrite: false }));
  shadow.position.y = 0.025;
  shadow.renderOrder = 1;
  root.add(shadow);

  rig.scale.setScalar(0.92);
  return { root, rig, torso, head, legL, legR, armL, armR, wrench, eyes, glowMat, aura, auraFill };
}
