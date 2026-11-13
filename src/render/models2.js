// Shapes added for chapters 6–10: the bank, hybrid towers, the new enemies, Hugo, the bench and the cat.
// Same rules as models.js: basic shapes, colours in vertices, silhouette first.
import * as THREE from '../../vendor/three.module.min.js';
import { C } from './palette.js';
import { Builder, lit, unlit, additive } from './geo.js';

const ICEB = 0x9FE8FF, COPPER = C.copper;

// Adds the bank and the hybrids to the building models (M from buildingModels()).
export function lateBuildingModels(M) {
  // Bank: a chubby little house with columns, a round vault door and a golden coin on the gable.
  {
    const b = new Builder();
    b.bevel(0.8, 0.08, 0.72, 0.02, C.wallStone, { shade: 0.8 });
    b.bevel(0.62, 0.38, 0.46, 0.03, C.cream, { y: 0.08, z: -0.04, shade: 0.78 });
    for (const sx of [-0.25, -0.09, 0.09, 0.25]) b.cyl(0.04, 0.046, 0.36, 8, 0xF2E6CF, { x: sx, y: 0.08, z: 0.27, shade: 0.85 });
    b.box(0.7, 0.06, 0.66, C.wallStone, { y: 0.44, shade: 0.9 });
    b.box(0.74, 0.05, 0.4, C.red, { y: 0.52, z: 0.17, rx: 0.5, shade: 0.85 });
    b.box(0.74, 0.05, 0.4, C.red, { y: 0.52, z: -0.17, rx: -0.5, shade: 0.85 });
    b.cyl(0.12, 0.12, 0.05, 14, C.brass, { y: 0.21, z: 0.2, rx: Math.PI / 2, shade: 0.95 });
    b.cyl(0.07, 0.07, 0.06, 10, C.iron, { y: 0.21, z: 0.22, rx: Math.PI / 2, shade: 1 });
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; b.box(0.13, 0.02, 0.02, C.brass, { x: Math.cos(a) * 0.04, y: 0.21 + Math.sin(a) * 0.04, z: 0.25, rz: a, shade: 1 }); }
    const coin = new Builder();
    coin.cyl(0.13, 0.13, 0.035, 16, C.gold, { rx: Math.PI / 2, shade: 0.9 });
    coin.cyl(0.09, 0.09, 0.04, 16, C.brass, { rx: Math.PI / 2, shade: 1 });
    M.bank = { body: b.build(), bodyH: 0.66, coin: coin.build(), topH: 0.3, r: 0.4 };
  }

  // Shared pieces of the hybrids.
  const kegBody = (wood, hoop) => {
    const b = new Builder();
    b.cyl(0.45, 0.39, 0.21, 10, wood, { shade: 0.74 });
    b.cyl(0.39, 0.45, 0.21, 10, wood, { y: 0.21, shade: 0.9 });
    b.cyl(0.435, 0.425, 0.05, 10, hoop, { y: 0.06, shade: 0.9 });
    b.cyl(0.425, 0.435, 0.05, 10, hoop, { y: 0.31, shade: 0.95 });
    b.cyl(0.35, 0.39, 0.03, 10, C.wood, { y: 0.42, shade: 1 });
    return b;
  };
  const kegFloor = (c1, c2) => new Builder().cyl(0.4, 0.42, 0.15, 10, c1, { shade: 0.84 }).cyl(0.44, 0.44, 0.05, 10, c2, { y: 0.15, shade: 0.92 });
  const stoneBody = (c) => {
    const b = new Builder();
    b.cyl(0.3, 0.4, 0.14, 6, C.wallStone, { shade: 0.78 });
    b.cyl(0.22, 0.3, 0.3, 6, c, { y: 0.14, shade: 0.8 });
    b.cyl(0.255, 0.255, 0.05, 6, C.brass, { y: 0.42, shade: 0.9 });
    b.cyl(0.32, 0.23, 0.09, 6, C.wallStone, { y: 0.46, shade: 0.85 });
    return b;
  };
  const stoneFloor = (c) => new Builder().cyl(0.24, 0.24, 0.15, 6, c, { shade: 0.86 }).cyl(0.29, 0.29, 0.05, 6, C.brass, { y: 0.15, shade: 0.92 });

  // Mortar (archer + cannon): a wide hexagonal base and a fat tube pointing up at the sky.
  {
    const b = new Builder();
    b.cyl(0.42, 0.46, 0.16, 6, C.oak, { shade: 0.74 });
    b.cyl(0.33, 0.38, 0.26, 6, C.cream, { y: 0.16, shade: 0.8 });
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + Math.PI / 6; b.box(0.055, 0.28, 0.055, C.woodLight, { x: Math.cos(a) * 0.35, y: 0.15, z: Math.sin(a) * 0.35, ry: -a, shade: 0.8 }); }
    b.cyl(0.4, 0.4, 0.05, 6, C.brass, { y: 0.42, shade: 0.9 });
    const f = new Builder().cyl(0.34, 0.36, 0.2, 6, C.cream, { shade: 0.86 }).cyl(0.39, 0.39, 0.05, 6, C.brass, { y: 0.2, shade: 0.92 });
    const t = new Builder();
    t.cyl(0.3, 0.32, 0.08, 8, C.wood, { shade: 0.85 });
    t.box(0.08, 0.26, 0.34, C.woodLight, { x: -0.05, y: 0.08, shade: 0.9 });
    t.add(new THREE.CylinderGeometry(0.17, 0.2, 0.5, 10).translate(0, 0.25, 0).rotateZ(-0.75), C.iron, { x: -0.08, y: 0.14, shade: 0.75 });
    t.add(new THREE.CylinderGeometry(0.2, 0.2, 0.07, 10).translate(0, 0.5, 0).rotateZ(-0.75), C.brass, { x: -0.08, y: 0.14, shade: 0.95 });
    t.box(0.12, 0.08, 0.03, C.orange, { x: -0.2, y: 0.3, z: 0.18, shade: 1 });
    M.mortar = { body: b.build(), bodyH: 0.47, floor: f.build(), floorH: 0.25, top: t.build(), topH: 0.55, r: 0.44, gem: C.orange };
  }
  // Ice crossbow (archer + frost): stone pedestal, a crossbow with an icy bow and a crystal bolt.
  {
    const t = new Builder();
    t.cyl(0.38, 0.3, 0.09, 6, 0xBFD6E8, { shade: 0.8 });
    t.cyl(0.07, 0.08, 0.13, 6, C.wood, { y: 0.09 });
    t.box(0.7, 0.085, 0.12, C.wood, { x: 0.06, y: 0.21, shade: 0.9 });
    t.box(0.09, 0.08, 0.46, ICEB, { x: 0.34, y: 0.215, shade: 0.8 });
    t.box(0.09, 0.08, 0.28, ICEB, { x: 0.26, y: 0.215, z: 0.32, ry: -0.7, shade: 0.8 });
    t.box(0.09, 0.08, 0.28, ICEB, { x: 0.26, y: 0.215, z: -0.32, ry: 0.7, shade: 0.8 });
    t.octa(0.08, ICEB, { x: 0.46, y: 0.3, sx: 1.8, rz: Math.PI / 2, shade: 0.75 });
    t.box(0.44, 0.045, 0.045, C.cream, { x: 0.17, y: 0.295, shade: 1 });
    M.icebow = { body: stoneBody(0xDCEAF5).build(), bodyH: 0.55, floor: stoneFloor(0xDCEAF5).build(), floorH: 0.2, top: t.build(), topH: 0.45, r: 0.36, gem: 0x5FD6FF };
  }
  // Gauss gun (archer + lightning): a copper post and two long rails with coils.
  {
    const b = new Builder();
    b.cyl(0.34, 0.4, 0.12, 8, C.wallStone, { shade: 0.78 });
    b.cyl(0.1, 0.12, 0.42, 8, COPPER, { y: 0.12, shade: 0.8 });
    for (let i = 0; i < 2; i++) b.torus(0.19 - i * 0.03, 0.035, COPPER, { y: 0.22 + i * 0.13, shade: 0.9 }, 5, 12);
    const f = new Builder().cyl(0.2, 0.22, 0.16, 8, C.cream, { shade: 0.86 }).add(new THREE.TorusGeometry(0.22, 0.03, 4, 12).rotateX(Math.PI / 2), C.brass, { y: 0.16, shade: 1 });
    const t = new Builder();
    t.cyl(0.3, 0.26, 0.08, 8, C.woodLight, { shade: 0.8 });
    t.box(0.3, 0.16, 0.22, C.brass, { y: 0.08, shade: 0.85 });
    for (const z of [0.07, -0.07]) t.box(0.95, 0.05, 0.045, COPPER, { x: 0.3, y: 0.2, z, shade: 0.85 });
    for (let i = 0; i < 3; i++) t.add(new THREE.TorusGeometry(0.11, 0.025, 4, 10).rotateY(Math.PI / 2), C.brass, { x: 0.18 + i * 0.22, y: 0.2, shade: 1 });
    t.sphere(0.06, 0xFFF2A8, { x: 0.78, y: 0.2, shade: 1 }, 8, 6);
    M.gauss = { body: b.build(), bodyH: 0.56, floor: f.build(), floorH: 0.2, top: t.build(), topH: 0.4, r: 0.34, gem: 0xFFD86B };
  }
  // Snow cannon (cannon + frost): an icy keg and a barrel with a crystal muzzle.
  {
    const t = new Builder();
    t.box(0.22, 0.16, 0.36, 0xBFD6E8, { shade: 0.85 });
    t.cyl(0.12, 0.12, 0.4, 6, C.brass, { y: 0.09, z: -0.2, rx: Math.PI / 2, shade: 1 });
    t.add(new THREE.CylinderGeometry(0.13, 0.17, 0.5, 9).rotateZ(-Math.PI / 2), 0x5C6F86, { x: 0.15, y: 0.2, shade: 0.8 });
    t.octa(0.13, ICEB, { x: 0.43, y: 0.2, sx: 0.7, shade: 0.75 });
    t.sphere(0.17, 0x5C6F86, { x: -0.12, y: 0.2, shade: 0.8 }, 9, 7);
    M.snowcannon = { body: kegBody(0xE4EEF5, 0x8FC7E0).build(), bodyH: 0.45, floor: kegFloor(0xEAF2F8, 0x8FC7E0).build(), floorH: 0.2, top: t.build(), topH: 0.42, r: 0.44, gem: 0x5FD6FF };
  }
  // Storm cannon (cannon + lightning): a keg with copper hoops and a barrel wound with a coil.
  {
    const t = new Builder();
    t.box(0.22, 0.16, 0.36, C.wood, { shade: 0.85 });
    t.add(new THREE.CylinderGeometry(0.135, 0.175, 0.56, 9).rotateZ(-Math.PI / 2), C.iron, { x: 0.16, y: 0.2, shade: 0.8 });
    for (let i = 0; i < 3; i++) t.add(new THREE.TorusGeometry(0.165, 0.025, 4, 10).rotateY(Math.PI / 2), COPPER, { x: 0.02 + i * 0.13, y: 0.2, shade: 1 });
    t.cyl(0.02, 0.02, 0.25, 4, COPPER, { x: -0.12, y: 0.3 });
    t.sphere(0.07, 0xFFF2A8, { x: -0.12, y: 0.58, shade: 1 }, 8, 6);
    M.stormcannon = { body: kegBody(C.oak, COPPER).build(), bodyH: 0.45, floor: kegFloor(C.wallStone, COPPER).build(), floorH: 0.2, top: t.build(), topH: 0.5, r: 0.44, gem: 0xFFD86B };
  }
  // Aurora (frost + lightning): a stone pedestal wound with copper, a floating crystal and little lights around it.
  {
    const b = stoneBody(0xDCE6F5);
    b.torus(0.3, 0.03, COPPER, { y: 0.25, shade: 1 }, 4, 12);
    b.torus(0.27, 0.03, COPPER, { y: 0.36, shade: 1 }, 4, 12);
    M.aurora = { body: b.build(), bodyH: 0.55, floor: stoneFloor(0xDCE6F5).build(), floorH: 0.2, topH: 0.7, r: 0.36, gem: 0x9DFFCF, crystalTop: true };
  }
  return M;
}

// ---------- enemies ----------
// All of these face +x, stand on y = 0 and are about 1 unit across (scaled by the enemy size).
export function lateEnemyModels(M) {
  // Mite (rojík): a small dark ball on little legs.
  {
    const b = new Builder();
    b.sphere(0.4, 0x2A2338, { y: 0.48, sy: 0.9, shade: 0.75 }, 10, 7);
    for (let i = 0; i < 6; i++) { const a = (i < 3 ? 0.6 + i * 0.9 : -0.6 - (i - 3) * 0.9) + Math.PI / 2; b.box(0.06, 0.32, 0.06, 0x1D1826, { x: Math.cos(a) * 0.28, y: 0.0, z: Math.sin(a) * 0.32, rx: Math.sin(a) * 0.5, shade: 0.9 }); }
    b.sphere(0.12, 0x4A3F5C, { x: -0.1, y: 0.78, z: 0.1, shade: 1 }, 6, 4);
    M.mite = b.build();
  }
  // Carrier (nosič): a big sack on little legs, tied with a rope.
  {
    const b = new Builder();
    b.sphere(0.44, 0x9C7A55, { y: 0.55, sy: 1.08, shade: 0.72 }, 12, 9);
    b.torus(0.38, 0.05, 0x6B4A3A, { y: 0.7, shade: 0.9 }, 4, 14);
    b.cone(0.16, 0.24, 6, 0x9C7A55, { y: 1.0, shade: 0.85 });
    b.box(0.2, 0.18, 0.04, 0xB8956A, { x: -0.1, y: 0.42, z: 0.42, rz: 0.3, shade: 1 });
    for (const [x, z] of [[0.2, 0.22], [-0.2, 0.22], [0.2, -0.22], [-0.2, -0.22]]) b.box(0.09, 0.2, 0.09, 0x3B2F2F, { x, y: 0, z, shade: 0.9 });
    M.sack = b.build();
  }
  // Egg: cream with brown spots.
  {
    const b = new Builder();
    b.sphere(0.36, 0xF0E2B6, { y: 0.46, sy: 1.3, shade: 0.75 }, 12, 9);
    for (let i = 0; i < 6; i++) { const a = i * 1.1, y = 0.3 + (i % 3) * 0.2; b.sphere(0.07, 0x8E7462, { x: Math.cos(a) * 0.33, y, z: Math.sin(a) * 0.33, sx: 0.4, shade: 1 }, 6, 4); }
    M.egg = b.build();
  }
  // Queen / princess: a plump dark body with amber stripes and see-through wings.
  {
    const b = new Builder();
    b.sphere(0.32, 0x3A2C4A, { x: -0.18, y: 0.38, sx: 1.25, shade: 0.72 }, 12, 8);
    for (const x of [-0.08, -0.25, -0.42]) b.add(new THREE.TorusGeometry(0.28 - Math.abs(x + 0.2) * 0.4, 0.04, 4, 12).rotateY(Math.PI / 2), C.amber, { x, y: 0.38, shade: 1 });
    b.sphere(0.22, 0x4A3A5C, { x: 0.2, y: 0.45, shade: 0.8 }, 10, 7);
    for (const z of [0.12, -0.12]) b.box(0.03, 0.22, 0.03, 0x2A2338, { x: 0.32, y: 0.6, z, rz: -0.4, shade: 1 });
    for (const z of [0.3, -0.3]) b.box(0.5, 0.02, 0.24, 0xCFE3F5, { x: -0.05, y: 0.72, z, ry: z > 0 ? 0.3 : -0.3, rx: z > 0 ? -0.35 : 0.35, shade: 1 });
    for (let i = 0; i < 6; i++) b.box(0.04, 0.2, 0.04, 0x2A2338, { x: -0.1 + (i % 3) * 0.15, y: 0, z: i < 3 ? 0.2 : -0.2, shade: 1 });
    M.queen = b.build();
  }
  // Jammer (rušička): a robot with an antenna and a dish.
  {
    const b = new Builder();
    b.bevel(0.56, 0.5, 0.5, 0.05, 0x5E7FA8, { y: 0.1, shade: 0.72 });
    b.box(0.3, 0.12, 0.04, 0x2B3A5A, { x: 0.1, y: 0.42, z: 0.26, shade: 1 });
    b.cyl(0.025, 0.025, 0.4, 5, C.iron, { x: -0.12, y: 0.6 });
    b.sphere(0.06, 0x8FD0FF, { x: -0.12, y: 1.02, shade: 1 }, 6, 4);
    b.cyl(0.18, 0.04, 0.08, 10, C.stoneL, { x: 0.12, y: 0.66, rz: -0.6, shade: 0.85 });
    for (const z of [0.25, -0.25]) b.cyl(0.11, 0.11, 0.07, 8, C.iron, { y: 0.11, z, rx: Math.PI / 2, shade: 0.9 });
    M.jammer = b.build();
  }
  // Ballista: a wooden cart with a crossbow and one big eye.
  {
    const b = new Builder();
    b.bevel(0.8, 0.24, 0.56, 0.04, C.woodLight, { y: 0.14, shade: 0.75 });
    b.box(0.5, 0.36, 0.38, C.wood, { x: -0.05, y: 0.36, shade: 0.8 });
    b.box(0.86, 0.07, 0.1, C.wood, { x: 0.12, y: 0.74, shade: 0.9 });
    b.box(0.08, 0.07, 0.8, C.cream, { x: 0.45, y: 0.74, shade: 0.9 });
    b.sphere(0.07, 0xFFE9A0, { x: 0.58, y: 0.74, shade: 1 }, 6, 4);
    for (const [x, z] of [[0.25, 0.3], [-0.25, 0.3], [0.25, -0.3], [-0.25, -0.3]]) b.cyl(0.13, 0.13, 0.06, 9, C.iron, { x, y: 0.13, z, rx: Math.PI / 2, shade: 0.9 });
    M.ballista = b.build();
  }
  // Wagon: a cart with a chest.
  {
    const b = new Builder();
    b.bevel(0.84, 0.22, 0.6, 0.03, C.woodLight, { y: 0.16, shade: 0.75 });
    b.bevel(0.5, 0.3, 0.42, 0.04, C.wood, { y: 0.38, shade: 0.8 });
    b.box(0.52, 0.05, 0.44, C.brass, { y: 0.55, shade: 1 });
    b.box(0.08, 0.1, 0.03, C.brass, { x: 0.18, y: 0.48, z: 0.22, shade: 1 });
    b.box(0.3, 0.05, 0.05, C.wood, { x: 0.55, y: 0.25, shade: 1 });
    for (const [x, z] of [[0.28, 0.32], [-0.28, 0.32], [0.28, -0.32], [-0.28, -0.32]]) b.cyl(0.15, 0.15, 0.06, 10, C.iron, { x, y: 0.15, z, rx: Math.PI / 2, shade: 0.9 });
    M.wagon = b.build();
  }
  // Siege tower: a tall wooden tower on wheels with battlements and a ramp.
  {
    const b = new Builder();
    b.bevel(0.9, 0.18, 0.8, 0.03, C.wood, { y: 0.14, shade: 0.75 });
    b.bevel(0.68, 1.1, 0.62, 0.04, C.woodLight, { y: 0.3, shade: 0.7 });
    for (let i = 0; i < 4; i++) b.box(0.7, 0.04, 0.64, C.wood, { y: 0.45 + i * 0.25, shade: 0.9 });
    for (const [x, z] of [[0.3, 0.27], [-0.3, 0.27], [0.3, -0.27], [-0.3, -0.27]]) b.box(0.15, 0.16, 0.15, C.woodLight, { x, y: 1.4, z, shade: 0.85 });
    b.box(0.08, 0.7, 0.52, C.wood, { x: 0.42, y: 0.55, rz: 0.25, shade: 0.85 });
    b.box(0.2, 0.2, 0.03, C.rust, { x: 0.1, y: 0.8, z: 0.32, shade: 1 });
    for (const [x, z] of [[0.3, 0.42], [-0.3, 0.42], [0.3, -0.42], [-0.3, -0.42]]) b.cyl(0.16, 0.16, 0.08, 10, C.iron, { x, y: 0.16, z, rx: Math.PI / 2, shade: 0.9 });
    M.siege = b.build();
  }
  // Mole (tunelář, krtek): a metal mole with a drill for a nose.
  {
    const b = new Builder();
    b.sphere(0.36, C.plech, { y: 0.34, sx: 1.25, sy: 0.85, shade: 0.72 }, 12, 8);
    b.add(new THREE.ConeGeometry(0.16, 0.36, 8).rotateZ(-Math.PI / 2), C.brass, { x: 0.58, y: 0.32, shade: 0.8 });
    for (let i = 0; i < 3; i++) b.add(new THREE.TorusGeometry(0.12 - i * 0.03, 0.02, 3, 8).rotateY(Math.PI / 2), 0x8F6A20, { x: 0.46 + i * 0.09, y: 0.32, shade: 1 });
    for (const [x, z] of [[0.18, 0.24], [-0.2, 0.24], [0.18, -0.24], [-0.2, -0.24]]) b.box(0.14, 0.08, 0.1, C.iron, { x, y: 0, z, shade: 0.9 });
    b.box(0.08, 0.05, 0.05, C.rust, { x: -0.3, y: 0.45, z: 0.2, shade: 1 });
    M.mole = b.build();
  }
  // Worm: a head and segments behind it, pinkish with darker rings.
  {
    const b = new Builder();
    const segs = [[0.32, 0.5, 0.36], [0.02, 0.4, 0.32], [-0.26, 0.3, 0.27], [-0.5, 0.2, 0.21]];
    segs.forEach(([x, y, r], i) => {
      b.sphere(r, i ? 0xC79A94 : 0xD4A8A0, { x, y, shade: 0.7 }, 12, 8);
      b.add(new THREE.TorusGeometry(r * 0.92, 0.035, 4, 12).rotateY(Math.PI / 2), 0x9C6E6A, { x: x - r * 0.45, y, shade: 1 });
    });
    b.add(new THREE.TorusGeometry(0.16, 0.04, 4, 12).rotateY(Math.PI / 2), 0x5A3A3A, { x: 0.66, y: 0.46, shade: 1 });
    b.sphere(0.13, 0x2A1A1A, { x: 0.63, y: 0.46, sx: 0.4, shade: 1 }, 8, 6);
    M.worm = b.build();
    // a mound of earth over a worm that is under the ground
    const m = new Builder();
    m.sphere(0.5, C.soil, { y: 0, sy: 0.4, shade: 0.7 }, 10, 6);
    for (let i = 0; i < 5; i++) { const a = i * 1.3; m.dodeca(0.1, C.soilD, { x: Math.cos(a) * 0.4, y: 0.04, z: Math.sin(a) * 0.4, shade: 0.8 }); }
    M.mound = m.build();
  }
  // Apprentice (učeň): a little figure in a cloak with a hood; the cloak takes the colour of what it resists.
  {
    const b = new Builder();
    b.cone(0.36, 0.78, 10, 0xFFFFFF, { y: 0, shade: 0.7 });
    b.sphere(0.21, 0xFFFFFF, { y: 0.72, shade: 0.8 }, 10, 8);
    b.sphere(0.15, 0x2A2030, { x: 0.09, y: 0.7, sx: 0.7, shade: 1 }, 8, 6);
    b.cone(0.1, 0.22, 6, 0xFFFFFF, { x: -0.14, y: 0.82, rz: 0.9, shade: 0.85 });
    b.box(0.06, 0.24, 0.16, 0xF4E9D8, { x: 0.2, y: 0.3, rz: 0.3, shade: 1 });
    M.apprentice = b.build();
    // Master and journeyman: taller, with a pointed hat and a staff.
    const m = new Builder();
    m.cone(0.38, 0.9, 12, 0xFFFFFF, { y: 0, shade: 0.7 });
    m.sphere(0.2, 0xFFFFFF, { y: 0.84, shade: 0.8 }, 10, 8);
    m.sphere(0.145, 0x2A2030, { x: 0.09, y: 0.82, sx: 0.7, shade: 1 }, 8, 6);
    m.cyl(0.3, 0.3, 0.03, 12, 0xFFFFFF, { y: 0.96, shade: 0.9 });
    m.cone(0.2, 0.5, 10, 0xFFFFFF, { y: 0.98, rz: -0.15, shade: 0.85 });
    m.cyl(0.025, 0.025, 1.2, 5, C.wood, { x: 0.32, y: 0, z: 0.18, shade: 1 });
    m.ico(0.08, 0, 0xFFFFFF, { x: 0.32, y: 1.22, z: 0.18, shade: 1 });
    M.master = m.build();
  }
  // Captain's cap (the messenger and Hugo) and a letter.
  {
    const c = new Builder();
    c.cyl(0.36, 0.33, 0.16, 12, 0x24304A, { shade: 0.8 });
    c.cyl(0.39, 0.38, 0.07, 12, 0xF4F1EA, { y: 0.14, shade: 0.95 });
    c.box(0.3, 0.025, 0.2, 0x111111, { x: 0.3, y: 0.02, shade: 1 });
    c.sphere(0.05, C.gold, { x: 0.34, y: 0.1, shade: 1 }, 6, 4);
    M.cap = c.build();
    const l = new Builder();
    l.box(0.5, 0.04, 0.34, 0xFFFDF2, { shade: 1 });
    l.box(0.1, 0.05, 0.1, C.red, { y: 0.01, shade: 1 });
    M.letter = l.build();
  }
  return M;
}

// ---------- Hugo, the bench and the cat ----------
export function makeHugo() {
  const root = new THREE.Group();
  const mat = lit();
  const part = (builder, parent, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(builder.build(), mat); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o; };
  const rig = new THREE.Group();
  root.add(rig);
  const legs = new Builder();
  legs.box(0.1, 0.28, 0.1, 0x3B2F2F, { x: -0.07, shade: 0.8 });
  legs.box(0.1, 0.28, 0.1, 0x3B2F2F, { x: 0.07, shade: 0.8 });
  legs.box(0.12, 0.06, 0.16, 0x1D1826, { x: -0.07, z: 0.03 });
  legs.box(0.12, 0.06, 0.16, 0x1D1826, { x: 0.07, z: 0.03 });
  const legM = part(legs, rig);
  const coat = new Builder();
  coat.cyl(0.17, 0.22, 0.42, 10, 0x2B3A5A, { y: 0.26, shade: 0.75 });
  for (const y of [0.36, 0.48, 0.6]) coat.sphere(0.022, C.gold, { y, z: 0.19, shade: 1 }, 5, 4);
  coat.box(0.07, 0.36, 0.07, 0x2B3A5A, { x: -0.2, y: 0.32, rz: 0.15, shade: 0.8 });
  coat.box(0.07, 0.36, 0.07, 0x2B3A5A, { x: 0.2, y: 0.32, rz: -0.15, shade: 0.8 });
  coat.sphere(0.13, 0xF2D2B8, { y: 0.8, shade: 0.85 }, 10, 8);
  coat.cone(0.11, 0.24, 8, 0xF7F4EE, { y: 0.84, z: 0.06, rx: Math.PI, shade: 0.95 });
  coat.box(0.18, 0.04, 0.05, 0xF7F4EE, { y: 0.83, z: 0.11, shade: 1 });
  coat.box(0.07, 0.02, 0.02, 0xF7F4EE, { x: -0.05, y: 0.86, z: 0.12, shade: 1 });
  coat.box(0.07, 0.02, 0.02, 0xF7F4EE, { x: 0.05, y: 0.86, z: 0.12, shade: 1 });
  coat.sphere(0.025, 0x3B2F2F, { x: -0.045, y: 0.83, z: 0.12, shade: 1 }, 5, 4);
  coat.sphere(0.025, 0x3B2F2F, { x: 0.045, y: 0.83, z: 0.12, shade: 1 }, 5, 4);
  coat.cyl(0.13, 0.14, 0.08, 12, 0x24304A, { y: 0.9, shade: 0.8 });
  coat.cyl(0.15, 0.14, 0.04, 12, 0xF4F1EA, { y: 0.97, shade: 0.95 });
  coat.box(0.12, 0.02, 0.09, 0x111111, { y: 0.9, z: 0.14, shade: 1 });
  const body = part(coat, rig);
  // lantern in the right hand
  const lanternG = new THREE.Group();
  lanternG.position.set(0.24, 0.16, 0.06);
  rig.add(lanternG);
  part(new Builder().box(0.12, 0.16, 0.12, 0x3B2F2F, { shade: 0.9 }).box(0.02, 0.1, 0.02, 0x3B2F2F, { y: 0.16 }), lanternG);
  const lampMat = new THREE.MeshBasicMaterial({ color: 0x4A3320 });
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.1, 0.09), lampMat);
  lamp.position.y = 0.08;
  lanternG.add(lamp);
  const halo = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 1), additive(C.amber, 0));
  halo.position.y = 0.08;
  halo.renderOrder = 8;
  lanternG.add(halo);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.26, 16).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.25, depthWrite: false }));
  shadow.position.y = 0.025;
  root.add(shadow);
  rig.scale.setScalar(1.05);
  return { root, rig, body, legs: legM, lantern: lanternG, lampMat, halo, mat };
}

// The bench next to the lighthouse with the cat (epilogue, title screen after the end).
export function makeBench() {
  const g = new THREE.Group();
  const b = new Builder();
  b.box(0.9, 0.05, 0.28, C.woodLight, { y: 0.24, shade: 0.9 });
  b.box(0.9, 0.18, 0.04, C.woodLight, { y: 0.3, z: -0.13, shade: 0.9 });
  for (const x of [-0.38, 0.38]) { b.box(0.05, 0.24, 0.24, C.wood, { x, shade: 0.85 }); }
  b.dodeca(0.32, 0x9A9CA5, { y: -0.18, sy: 0.6, sx: 1.8, shade: 0.7, top: C.moss, topFrom: 0.7 });
  const bench = new THREE.Mesh(b.build(), lit());
  bench.castShadow = true;
  g.add(bench);
  const c = new Builder();
  c.sphere(0.09, 0x8D8F98, { y: 0.09, sz: 1.3, shade: 0.8 }, 8, 6);
  c.sphere(0.065, 0x8D8F98, { y: 0.2, z: 0.07, shade: 0.85 }, 8, 6);
  c.cone(0.025, 0.06, 4, 0x8D8F98, { x: -0.035, y: 0.25, z: 0.07 });
  c.cone(0.025, 0.06, 4, 0x8D8F98, { x: 0.035, y: 0.25, z: 0.07 });
  c.box(0.02, 0.02, 0.18, 0x6C6E78, { x: 0.06, y: 0.04, z: -0.12, ry: 0.5 });
  c.sphere(0.012, 0x9DFF7A, { x: -0.02, y: 0.21, z: 0.13, shade: 1 }, 4, 3);
  c.sphere(0.012, 0x9DFF7A, { x: 0.02, y: 0.21, z: 0.13, shade: 1 }, 4, 3);
  const cat = new THREE.Mesh(c.build(), lit());
  cat.position.set(0.37, 0.26, 0.02);
  cat.castShadow = true;
  g.add(cat);
  return { group: g, cat };
}

export { unlit };
