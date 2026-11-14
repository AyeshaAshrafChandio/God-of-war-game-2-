import * as THREE from 'three';
import { GameMaterialLibrary } from './materials';
import { BossId, EnemyType, LEVEL_METADATA, LevelId } from './types';

export interface BoxCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  topY: number;
  isGate?: boolean;
  gateMesh?: THREE.Object3D;
  open?: boolean;
}

export interface EnemySpawnDef {
  type: EnemyType;
  x: number;
  y: number;
  z: number;
  zone: 'courtyard' | 'bridge' | 'sanctum';
}

export interface InteractiveProp {
  id: string;
  kind: 'push_block' | 'switch' | 'rotate_mech' | 'symbol_statue' | 'chest' | 'relic' | 'checkpoint' | 'ladder';
  mesh: THREE.Group;
  x: number;
  y: number;
  z: number;
  radius: number;
  activated: boolean;
  label: string;
  symbolIndex?: number;
  targetPlate?: { x: number; z: number; radius: number; indicator: THREE.Mesh };
  rotationAngle?: number;
  ladderTopY?: number;
}

export interface HazardTrap {
  kind: 'spikes' | 'lava_jet';
  x: number;
  y: number;
  z: number;
  radius: number;
  mesh: THREE.Group;
  phaseOffset: number;
  active: boolean;
}

export interface TimedPlatform {
  mesh: THREE.Mesh;
  x: number;
  z: number;
  width: number;
  depth: number;
  baseY: number;
  ampY: number;
  speed: number;
  phase: number;
  currentY: number;
}

export interface TorchLight {
  light?: THREE.PointLight;
  flame: THREE.Mesh;
  baseIntensity: number;
  phase: number;
}

export interface LevelData {
  id: LevelId;
  group: THREE.Group;
  skyColor: number;
  fogDensity: number;
  spawnPoint: THREE.Vector3;
  checkpoints: THREE.Vector3[];
  bossSpawn: { id: BossId; x: number; y: number; z: number; triggerZ: number };
  colliders: BoxCollider[];
  walkableFloors: BoxCollider[];
  enemies: EnemySpawnDef[];
  interactives: InteractiveProp[];
  traps: HazardTrap[];
  timedPlatforms: TimedPlatform[];
  torches: TorchLight[];
  destructibles: { mesh: THREE.Mesh; x: number; y: number; z: number; broken: boolean }[];
  gate: BoxCollider | null;
  puzzleSolved: boolean;
  puzzleDescription: string;
  waterOrLavaPlane?: THREE.Mesh;
}

function makePillar(mats: GameMaterialLibrary, height: number, broken = false): THREE.Group {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.45, 1.5), mats.marble);
  base.position.y = 0.225;
  base.castShadow = true;
  base.receiveShadow = true;
  g.add(base);

  const shaftH = broken ? height * 0.52 : height;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.58, shaftH, 14), mats.marble);
  shaft.position.y = 0.45 + shaftH / 2;
  shaft.castShadow = true;
  shaft.receiveShadow = true;
  g.add(shaft);

  if (!broken) {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.4, 1.45), mats.marble);
    cap.position.y = 0.45 + shaftH + 0.2;
    cap.castShadow = true;
    g.add(cap);
  }
  return g;
}

function makeBrazier(
  mats: GameMaterialLibrary,
  addPointLight: boolean,
  flameColor = 0xff6a1a
): { group: THREE.Group; torch: TorchLight } {
  const g = new THREE.Group();
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 1.1, 8), mats.bronze);
  stand.position.y = 0.55;
  stand.castShadow = true;
  g.add(stand);

  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.25, 0.35, 10), mats.obsidian);
  bowl.position.y = 1.22;
  g.add(bowl);

  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.32, 0.72, 7),
    new THREE.MeshBasicMaterial({ color: flameColor })
  );
  flame.position.y = 1.68;
  g.add(flame);

  let light: THREE.PointLight | undefined;
  if (addPointLight) {
    light = new THREE.PointLight(flameColor, 5.5, 18, 1.6);
    light.position.set(0, 2.0, 0);
    g.add(light);
  }
  return {
    group: g,
    torch: { light, flame, baseIntensity: 5.5, phase: Math.random() * Math.PI * 2 },
  };
}

function makeGreekStatue(mats: GameMaterialLibrary, scale = 1): THREE.Group {
  const g = new THREE.Group();
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.8 * scale, 1.1 * scale, 1.8 * scale), mats.marble);
  plinth.position.y = 0.55 * scale;
  plinth.castShadow = true;
  g.add(plinth);

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.48 * scale, 0.6 * scale, 2.2 * scale, 10), mats.marble);
  body.position.y = 2.2 * scale;
  body.castShadow = true;
  g.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34 * scale, 10, 8), mats.marble);
  head.position.y = 3.55 * scale;
  g.add(head);

  const spear = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * scale, 0.05 * scale, 3.6 * scale, 6), mats.bronze);
  spear.position.set(0.62 * scale, 2.5 * scale, 0.1 * scale);
  g.add(spear);

  return g;
}

export function buildLevel(levelId: LevelId, mats: GameMaterialLibrary, highQuality: boolean): LevelData {
  const group = new THREE.Group();
  const colliders: BoxCollider[] = [];
  const walkableFloors: BoxCollider[] = [];
  const interactives: InteractiveProp[] = [];
  const traps: HazardTrap[] = [];
  const timedPlatforms: TimedPlatform[] = [];
  const torches: TorchLight[] = [];
  const destructibles: { mesh: THREE.Mesh; x: number; y: number; z: number; broken: boolean }[] = [];

  const theme = {
    1: { sky: 0x261d1c, fog: 0.011, floorMat: mats.stoneFloor, accentMat: mats.marble, liquid: null, flame: 0xff6b1a, boss: 'stone_guardian' as BossId },
    2: { sky: 0x2b1512, fog: 0.012, floorMat: mats.stoneFloor, accentMat: mats.bronze, liquid: mats.lava, flame: 0xff4512, boss: 'fire_minotaur' as BossId },
    3: { sky: 0x0b1a24, fog: 0.014, floorMat: mats.obsidian, accentMat: mats.marble, liquid: mats.water, flame: 0x22d3ee, boss: 'sea_monster' as BossId },
    4: { sky: 0x161926, fog: 0.01, floorMat: mats.obsidian, accentMat: mats.bronze, liquid: null, flame: 0xf59e0b, boss: 'titan_warrior' as BossId },
    5: { sky: 0x240a07, fog: 0.013, floorMat: mats.obsidian, accentMat: mats.gold, liquid: mats.lava, flame: 0xff3300, boss: 'pyre_lord' as BossId },
  }[levelId];

  // Outer Horizon Ground / Abyssal Sea or Lava expanse (no floating box void!)
  const horizonMat = theme.liquid || mats.obsidian;
  const expanse = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), horizonMat);
  expanse.rotation.x = -Math.PI / 2;
  expanse.position.set(0, -4.5, -60);
  expanse.receiveShadow = true;
  group.add(expanse);

  // Distant Mountain / Cliff Ring framing the horizon naturally
  for (let i = 0; i < 24; i++) {
    const ang = (i / 24) * Math.PI * 2;
    const dist = 105 + (i % 3) * 18;
    const h = 24 + (i % 5) * 9;
    const cliff = new THREE.Mesh(
      new THREE.ConeGeometry(16 + (i % 4) * 5, h, 6),
      levelId === 1 ? mats.marble : mats.obsidian
    );
    cliff.position.set(Math.cos(ang) * dist, h * 0.32 - 5, -55 + Math.sin(ang) * dist);
    group.add(cliff);
  }

  const addWalkable = (x: number, y: number, z: number, w: number, h: number, d: number, mat: THREE.Material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y - h / 2, z);
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    group.add(mesh);
    walkableFloors.push({
      minX: x - w / 2,
      maxX: x + w / 2,
      minZ: z - d / 2,
      maxZ: z + d / 2,
      topY: y,
    });
    return mesh;
  };

  const addSolidObstacle = (x: number, y: number, z: number, w: number, h: number, d: number) => {
    colliders.push({
      minX: x - w / 2,
      maxX: x + w / 2,
      minZ: z - d / 2,
      maxZ: z + d / 2,
      topY: y + h,
    });
  };

  // 1. COURTYARD (z: +16 to -18)
  addWalkable(0, 0, -1, 28, 3, 34, theme.floorMat);

  // Fluted Doric Colonnade along Courtyard
  for (let i = 0; i < 4; i++) {
    const pz = 10 - i * 8;
    [-11.5, 11.5].forEach((px, side) => {
      const broken = (i + side + levelId) % 3 === 0;
      const p = makePillar(mats, 7.2, broken);
      p.position.set(px, 0, pz);
      group.add(p);
      addSolidObstacle(px, 0, pz, 1.4, 7, 1.4);
    });
  }

  // Grand Statues at Courtyard Entrance
  [-8.5, 8.5].forEach((sx) => {
    const st = makeGreekStatue(mats, 1.25);
    st.position.set(sx, 0, 12.5);
    st.rotation.y = sx < 0 ? Math.PI * 0.25 : -Math.PI * 0.25;
    group.add(st);
    addSolidObstacle(sx, 0, 12.5, 1.9, 4, 1.9);
  });

  // Braziers
  const brazierCoords = [
    [-5.5, 0, 11],
    [5.5, 0, 11],
    [-5.5, 0, -13],
    [5.5, 0, -13],
    [-12, 0, -82],
    [12, 0, -82],
    [-12, 0, -112],
    [12, 0, -112],
  ];
  brazierCoords.forEach(([bx, by, bz], idx) => {
    const { group: bg, torch } = makeBrazier(mats, highQuality || idx % 2 === 0, theme.flame);
    bg.position.set(bx, by, bz);
    group.add(bg);
    torches.push(torch);
  });

  // 2. BRIDGE & PUZZLE CHAMBER (z: -18 to -68)
  // Timed platform bridge segment for Level 2/4/5 or solid bridge with puzzle chamber
  addWalkable(0, 0, -30, 10, 3, 24, theme.floorMat); // Bridge 1
  // Secret side alcove (right) with hidden chest
  addWalkable(15, 0, -30, 10, 3, 12, mats.marble);
  addWalkable(7.5, 0, -30, 5, 3, 4, mats.bronze); // Connecting walkway

  // Timed moving platforms across a chasm between z=-42 and z=-54
  addWalkable(0, 0, -61, 22, 3, 14, theme.floorMat); // Puzzle Forecourt

  const p1Mesh = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.2, 5.2), mats.marble);
  p1Mesh.position.set(-2.6, -0.6, -45.5);
  p1Mesh.receiveShadow = true;
  group.add(p1Mesh);
  timedPlatforms.push({
    mesh: p1Mesh,
    x: -2.6,
    z: -45.5,
    width: 5.2,
    depth: 5.2,
    baseY: 0,
    ampY: 1.4,
    speed: 1.5,
    phase: 0,
    currentY: 0,
  });

  const p2Mesh = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.2, 5.2), mats.marble);
  p2Mesh.position.set(2.6, -0.6, -50.8);
  p2Mesh.receiveShadow = true;
  group.add(p2Mesh);
  timedPlatforms.push({
    mesh: p2Mesh,
    x: 2.6,
    z: -50.8,
    width: 5.2,
    depth: 5.2,
    baseY: 0,
    ampY: 1.4,
    speed: 1.5,
    phase: Math.PI,
    currentY: 0,
  });

  // Elevated Balcony + Climbable Ladder in Courtyard for Relic Collectible!
  addWalkable(-13, 4.2, -5, 6, 1.2, 8, mats.marble);
  const ladderGroup = new THREE.Group();
  ladderGroup.position.set(-10.1, 0, -5);
  for (const side of [-0.4, 0.4]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4.4, 6), mats.bronze);
    rail.position.set(0, 2.2, side);
    ladderGroup.add(rail);
  }
  for (let r = 0; r < 7; r++) {
    const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.8, 6), mats.gold);
    rung.rotation.x = Math.PI / 2;
    rung.position.set(0, 0.5 + r * 0.58, 0);
    ladderGroup.add(rung);
  }
  group.add(ladderGroup);
  interactives.push({
    id: 'ladder_balcony',
    kind: 'ladder',
    mesh: ladderGroup,
    x: -10.1,
    y: 0,
    z: -5,
    radius: 2.0,
    activated: false,
    label: 'Climb Ladder',
    ladderTopY: 4.3,
  });

  // Relic Collectible atop Balcony
  const relicGroup = new THREE.Group();
  const relicOrb = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), mats.gold);
  relicOrb.position.y = 0.85;
  relicGroup.add(relicOrb);
  relicGroup.position.set(-13, 4.2, -5);
  group.add(relicGroup);
  interactives.push({
    id: `relic_${levelId}`,
    kind: 'relic',
    mesh: relicGroup,
    x: -13,
    y: 4.2,
    z: -5,
    radius: 1.9,
    activated: false,
    label: 'Claim Olympian Relic (+200 XP)',
  });

  // Hidden Treasure Chest in Right Alcove
  const chestGroup = new THREE.Group();
  const cBase = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.75, 0.95), mats.bronze);
  cBase.position.y = 0.375;
  chestGroup.add(cBase);
  const cLid = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 1.4, 8, 1, false, 0, Math.PI), mats.gold);
  cLid.rotation.z = Math.PI / 2;
  cLid.position.y = 0.75;
  chestGroup.add(cLid);
  chestGroup.position.set(17, 0, -30);
  group.add(chestGroup);
  interactives.push({
    id: `chest_${levelId}`,
    kind: 'chest',
    mesh: chestGroup,
    x: 17,
    y: 0,
    z: -30,
    radius: 2.2,
    activated: false,
    label: 'Open Hidden Chest (Health + Magic + XP)',
  });

  // 3. PUZZLES IN FORECOURT (z: -55 to -68)
  let puzzleDescription = '';
  if (levelId === 1 || levelId === 3) {
    // Push Giant Stone Block onto Glowing Pressure Plate + Activate Switch
    puzzleDescription = 'Push the Titan Stone onto the Seal and pull the Bronze Lever';
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.14, 16), mats.crimsonRune);
    plate.position.set(5.5, 0.07, -61);
    group.add(plate);

    const blockGroup = new THREE.Group();
    const blockMesh = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.9, 1.9), mats.marble);
    blockMesh.position.y = 0.95;
    blockMesh.castShadow = true;
    blockGroup.add(blockMesh);
    const runeBand = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.3, 1.96), mats.gold);
    runeBand.position.y = 0.95;
    blockGroup.add(runeBand);
    blockGroup.position.set(-4.5, 0, -61);
    group.add(blockGroup);

    interactives.push({
      id: 'push_stone',
      kind: 'push_block',
      mesh: blockGroup,
      x: -4.5,
      y: 0,
      z: -61,
      radius: 2.4,
      activated: false,
      label: 'Push Stone Block toward Seal',
      targetPlate: { x: 5.5, z: -61, radius: 1.8, indicator: plate },
    });

    const swGroup = new THREE.Group();
    const ped = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.0, 0.9), mats.obsidian);
    ped.position.y = 0.5;
    swGroup.add(ped);
    const lever = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.1, 8), mats.gold);
    lever.position.y = 1.15;
    lever.rotation.z = 0.45;
    swGroup.add(lever);
    swGroup.position.set(-6.5, 0, -64.5);
    group.add(swGroup);
    interactives.push({
      id: 'gate_lever',
      kind: 'switch',
      mesh: swGroup,
      x: -6.5,
      y: 0,
      z: -64.5,
      radius: 2.1,
      activated: false,
      label: 'Pull Ancient Gate Lever',
    });
  } else if (levelId === 2 || levelId === 5) {
    // Activate 3 Symbol Statues to unseal the Gate
    puzzleDescription = 'Ignite all 3 Mythic Symbol Statues to unseal the Gate';
    [-6.5, 0, 6.5].forEach((sx, i) => {
      const stGroup = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.85, 1.8, 8), mats.marble);
      base.position.y = 0.9;
      stGroup.add(base);
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), mats.crimsonRune);
      crystal.position.y = 2.35;
      stGroup.add(crystal);
      stGroup.position.set(sx, 0, -61.5);
      group.add(stGroup);
      interactives.push({
        id: `statue_${i}`,
        kind: 'symbol_statue',
        mesh: stGroup,
        x: sx,
        y: 0,
        z: -61.5,
        radius: 2.2,
        activated: false,
        symbolIndex: i,
        label: `Activate Symbol Statue ${i + 1}`,
      });
    });
  } else {
    // Level 4: Rotate Titan Wheel Mechanism twice to align Gears
    puzzleDescription = 'Rotate the Titan Gear Mechanism until the Rune Locks (3 turns)';
    const gearGroup = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 1.1, 10), mats.obsidian);
    base.position.y = 0.55;
    gearGroup.add(base);
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.14, 8, 12), mats.gold);
    wheel.position.y = 1.4;
    gearGroup.add(wheel);
    gearGroup.position.set(0, 0, -61);
    group.add(gearGroup);
    interactives.push({
      id: 'rotate_wheel',
      kind: 'rotate_mech',
      mesh: gearGroup,
      x: 0,
      y: 0,
      z: -61,
      radius: 2.4,
      activated: false,
      rotationAngle: 0,
      label: 'Turn Titan Gear Mechanism',
    });
  }

  // Checkpoint Shrine right before Gate
  const cpGroup = new THREE.Group();
  const cpBase = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.0, 0.6, 12), mats.bronze);
  cpBase.position.y = 0.3;
  cpGroup.add(cpBase);
  const cpFlame = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), mats.emeraldRune);
  cpFlame.position.y = 1.3;
  cpGroup.add(cpFlame);
  cpGroup.position.set(7.5, 0, -65.5);
  group.add(cpGroup);
  interactives.push({
    id: 'checkpoint_sanctum',
    kind: 'checkpoint',
    mesh: cpGroup,
    x: 7.5,
    y: 0,
    z: -65.5,
    radius: 2.2,
    activated: false,
    label: 'Save Checkpoint & Restore Health',
  });

  // Sealed Temple Gate (z = -68)
  const gateGroup = new THREE.Group();
  const archL = new THREE.Mesh(new THREE.BoxGeometry(2.2, 8.5, 2.2), mats.marble);
  archL.position.set(-5.2, 4.25, -68);
  gateGroup.add(archL);
  const archR = new THREE.Mesh(new THREE.BoxGeometry(2.2, 8.5, 2.2), mats.marble);
  archR.position.set(5.2, 4.25, -68);
  gateGroup.add(archR);
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(13.5, 1.8, 2.6), mats.marble);
  lintel.position.set(0, 8.5, -68);
  gateGroup.add(lintel);

  const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(8.2, 7.6, 1.0), mats.bronze);
  doorMesh.position.set(0, 3.8, -68);
  doorMesh.castShadow = true;
  gateGroup.add(doorMesh);
  group.add(gateGroup);

  const gateCollider: BoxCollider = {
    minX: -4.4,
    maxX: 4.4,
    minZ: -69.2,
    maxZ: -66.8,
    topY: 8.0,
    isGate: true,
    gateMesh: doorMesh,
    open: false,
  };
  colliders.push(gateCollider);
  addSolidObstacle(-5.2, 0, -68, 2.4, 8.5, 2.4);
  addSolidObstacle(5.2, 0, -68, 2.4, 8.5, 2.4);

  // 4. BOSS ARENA (z: -68 to -126)
  addWalkable(0, 0, -98, 38, 3, 58, theme.floorMat);

  // Arena Perimeter Pillars
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const rx = Math.cos(angle) * 16.5;
    const rz = -98 + Math.sin(angle) * 21;
    if (Math.abs(rx) < 4.5 && rz > -79) continue; // Keep entrance clear
    const p = makePillar(mats, 8.5, i % 4 === 1);
    p.position.set(rx, 0, rz);
    group.add(p);
    addSolidObstacle(rx, 0, rz, 1.4, 8, 1.4);
  }

  // Hazard Spike Traps along bridge & arena flanks
  const trapCoords = [
    [-2.5, 0, -24],
    [2.5, 0, -35],
    [-8, 0, -90],
    [8, 0, -104],
  ];
  trapCoords.forEach(([tx, ty, tz], idx) => {
    const tGroup = new THREE.Group();
    const plate = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 2.6), mats.obsidian);
    plate.position.y = 0.06;
    tGroup.add(plate);
    for (let sx = -0.8; sx <= 0.8; sx += 0.8) {
      for (let sz = -0.8; sz <= 0.8; sz += 0.8) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.15, 5), mats.steel);
        spike.position.set(sx, 0.55, sz);
        tGroup.add(spike);
      }
    }
    tGroup.position.set(tx, ty, tz);
    group.add(tGroup);
    traps.push({
      kind: levelId === 5 ? 'lava_jet' : 'spikes',
      x: tx,
      y: ty,
      z: tz,
      radius: 1.5,
      mesh: tGroup,
      phaseOffset: idx * 1.4,
      active: false,
    });
  });

  // Destructible Greek Urns (drop Health / Magic / XP orbs)
  const urnCoords = [
    [-9, 0, 6],
    [9, 0, 6],
    [-8, 0, -14],
    [8, 0, -14],
    [-14, 0, -85],
    [14, 0, -85],
    [-14, 0, -110],
    [14, 0, -110],
  ];
  urnCoords.forEach(([ux, uy, uz]) => {
    const urn = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.32, 1.05, 10), mats.bronze);
    urn.position.set(ux, uy + 0.525, uz);
    urn.castShadow = true;
    group.add(urn);
    destructibles.push({ mesh: urn, x: ux, y: uy, z: uz, broken: false });
  });

  // Enemy Waves per Level (Escalating variety across all 8 types)
  const enemies: EnemySpawnDef[] = [];
  if (levelId === 1) {
    enemies.push(
      { type: 'skeleton', x: -4, y: 0, z: -2, zone: 'courtyard' },
      { type: 'skeleton', x: 4, y: 0, z: -4, zone: 'courtyard' },
      { type: 'soldier', x: 0, y: 0, z: -10, zone: 'courtyard' },
      { type: 'harpy', x: 0, y: 0, z: -28, zone: 'bridge' },
      { type: 'guard', x: 0, y: 0, z: -59, zone: 'sanctum' }
    );
  } else if (levelId === 2) {
    enemies.push(
      { type: 'soldier', x: -5, y: 0, z: -2, zone: 'courtyard' },
      { type: 'soldier', x: 5, y: 0, z: -4, zone: 'courtyard' },
      { type: 'harpy', x: 0, y: 0, z: -10, zone: 'courtyard' },
      { type: 'minotaur', x: 0, y: 0, z: -31, zone: 'bridge' },
      { type: 'fire_demon', x: -4, y: 0, z: -59, zone: 'sanctum' },
      { type: 'guard', x: 4, y: 0, z: -59, zone: 'sanctum' }
    );
  } else if (levelId === 3) {
    enemies.push(
      { type: 'undead', x: -4, y: 0, z: -3, zone: 'courtyard' },
      { type: 'undead', x: 4, y: 0, z: -3, zone: 'courtyard' },
      { type: 'skeleton', x: 0, y: 0, z: -10, zone: 'courtyard' },
      { type: 'cyclops', x: 0, y: 0, z: -32, zone: 'bridge' },
      { type: 'harpy', x: -4, y: 0, z: -59, zone: 'sanctum' },
      { type: 'guard', x: 4, y: 0, z: -59, zone: 'sanctum' }
    );
  } else if (levelId === 4) {
    enemies.push(
      { type: 'guard', x: -4, y: 0, z: -3, zone: 'courtyard' },
      { type: 'minotaur', x: 4, y: 0, z: -6, zone: 'courtyard' },
      { type: 'harpy', x: 0, y: 0, z: -28, zone: 'bridge' },
      { type: 'cyclops', x: 0, y: 0, z: -59, zone: 'sanctum' },
      { type: 'undead', x: -5, y: 0, z: -61, zone: 'sanctum' }
    );
  } else {
    enemies.push(
      { type: 'fire_demon', x: -4, y: 0, z: -3, zone: 'courtyard' },
      { type: 'fire_demon', x: 4, y: 0, z: -3, zone: 'courtyard' },
      { type: 'minotaur', x: 0, y: 0, z: -11, zone: 'courtyard' },
      { type: 'cyclops', x: 0, y: 0, z: -32, zone: 'bridge' },
      { type: 'guard', x: -5, y: 0, z: -59, zone: 'sanctum' },
      { type: 'undead', x: 5, y: 0, z: -59, zone: 'sanctum' }
    );
  }

  return {
    id: levelId,
    group,
    skyColor: theme.sky,
    fogDensity: theme.fog,
    spawnPoint: new THREE.Vector3(0, 0, 11),
    checkpoints: [new THREE.Vector3(0, 0, 11), new THREE.Vector3(0, 0, -64.5)],
    bossSpawn: {
      id: theme.boss,
      x: 0,
      y: 0,
      z: -108,
      triggerZ: -74,
    },
    colliders,
    walkableFloors,
    enemies,
    interactives,
    traps,
    timedPlatforms,
    torches,
    destructibles,
    gate: gateCollider,
    puzzleSolved: false,
    puzzleDescription: `${LEVEL_METADATA[levelId].name}: ${puzzleDescription}`,
    waterOrLavaPlane: expanse,
  };
}
