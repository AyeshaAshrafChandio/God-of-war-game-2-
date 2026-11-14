import * as THREE from 'three';
import { GameMaterialLibrary } from './materials';
import { BossId, EnemyType, FacialExpression, WeaponId } from './types';

export interface FaceRig {
  leftBrow: THREE.Mesh;
  rightBrow: THREE.Mesh;
  leftEye: THREE.Mesh;
  rightEye: THREE.Mesh;
  jaw: THREE.Group;
  eyeMaterial: THREE.MeshStandardMaterial;
}

export interface CharacterRig {
  root: THREE.Group;
  hips: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  face: FaceRig;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftHandSocket: THREE.Group;
  rightHandSocket: THREE.Group;
  weapons: {
    bladesL: THREE.Group;
    bladesR: THREE.Group;
    hammer: THREE.Group;
    spear: THREE.Group;
  };
  rageAura: THREE.Mesh;
  shieldGuardMesh: THREE.Mesh;
  contactShadow: THREE.Mesh;
}

export interface OracleRig {
  root: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  face: FaceRig;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  auraRing: THREE.Mesh;
}

export interface EnemyRig {
  root: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  face: FaceRig;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  weakSpot?: THREE.Mesh;
  contactShadow: THREE.Mesh;
  hitFlashMaterials: THREE.MeshStandardMaterial[];
}

function addContactShadow(parent: THREE.Group, mat: THREE.Material, radius: number): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(radius * 2.2, radius * 2.2);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.03;
  parent.add(mesh);
  return mesh;
}

function attachFaceFeatures(
  head: THREE.Group,
  scale: number,
  faceZ: number,
  eyeColor: number,
  jawMat: THREE.Material,
  browMat: THREE.Material
): FaceRig {
  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: eyeColor,
    emissive: eyeColor,
    emissiveIntensity: 0.75,
    roughness: 0.2,
    metalness: 0.1,
  });

  const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.055 * scale, 0.03 * scale, 0.03 * scale), eyeMaterial);
  leftEye.position.set(-0.065 * scale, 0.19 * scale, faceZ);
  head.add(leftEye);

  const rightEye = new THREE.Mesh(new THREE.BoxGeometry(0.055 * scale, 0.03 * scale, 0.03 * scale), eyeMaterial);
  rightEye.position.set(0.065 * scale, 0.19 * scale, faceZ);
  head.add(rightEye);

  const leftBrow = new THREE.Mesh(new THREE.BoxGeometry(0.075 * scale, 0.022 * scale, 0.035 * scale), browMat);
  leftBrow.position.set(-0.065 * scale, 0.228 * scale, faceZ + 0.006 * scale);
  head.add(leftBrow);

  const rightBrow = new THREE.Mesh(new THREE.BoxGeometry(0.075 * scale, 0.022 * scale, 0.035 * scale), browMat);
  rightBrow.position.set(0.065 * scale, 0.228 * scale, faceZ + 0.006 * scale);
  head.add(rightBrow);

  const jaw = new THREE.Group();
  jaw.position.set(0, 0.07 * scale, faceZ - 0.02 * scale);
  const jawMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18 * scale, 0.08 * scale, 0.1 * scale), jawMat);
  jawMesh.position.y = -0.02 * scale;
  jaw.add(jawMesh);
  head.add(jaw);

  return { leftBrow, rightBrow, leftEye, rightEye, jaw, eyeMaterial };
}

export function setCharacterExpression(
  face: FaceRig,
  expression: FacialExpression,
  talkAmount = 0
) {
  const jawOpen = Math.max(0, Math.min(1, talkAmount));
  if (expression === 'angry') {
    face.leftBrow.rotation.z = -0.32;
    face.rightBrow.rotation.z = 0.32;
    face.leftEye.scale.y = 0.72;
    face.rightEye.scale.y = 0.72;
    face.jaw.rotation.x = jawOpen * 0.28;
    face.eyeMaterial.emissiveIntensity = 1.1;
  } else if (expression === 'roar') {
    face.leftBrow.rotation.z = -0.45;
    face.rightBrow.rotation.z = 0.45;
    face.leftEye.scale.y = 1.2;
    face.rightEye.scale.y = 1.2;
    face.jaw.rotation.x = 0.48 + jawOpen * 0.15;
    face.eyeMaterial.emissiveIntensity = 2.0;
  } else if (expression === 'determined') {
    face.leftBrow.rotation.z = -0.18;
    face.rightBrow.rotation.z = 0.18;
    face.leftEye.scale.y = 0.88;
    face.rightEye.scale.y = 0.88;
    face.jaw.rotation.x = jawOpen * 0.24;
    face.eyeMaterial.emissiveIntensity = 0.9;
  } else if (expression === 'pain') {
    face.leftBrow.rotation.z = 0.28;
    face.rightBrow.rotation.z = -0.28;
    face.leftEye.scale.y = 0.45;
    face.rightEye.scale.y = 0.45;
    face.jaw.rotation.x = 0.3;
    face.eyeMaterial.emissiveIntensity = 0.5;
  } else {
    face.leftBrow.rotation.z = 0;
    face.rightBrow.rotation.z = 0;
    face.leftEye.scale.y = 1.0;
    face.rightEye.scale.y = 1.0;
    face.jaw.rotation.x = jawOpen * 0.22;
    face.eyeMaterial.emissiveIntensity = 0.75;
  }
}

function buildCurvedFireBlade(mats: GameMaterialLibrary): THREE.Group {
  const g = new THREE.Group();

  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.24, 8), mats.bronze);
  grip.position.y = 0.1;
  g.add(grip);

  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.08), mats.gold);
  guard.position.y = 0.22;
  g.add(guard);

  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0.11, 0.22);
  shape.lineTo(0.16, 0.48);
  shape.lineTo(0.08, 0.78);
  shape.lineTo(0.22, 0.96);
  shape.lineTo(-0.02, 0.72);
  shape.lineTo(-0.05, 0.34);
  shape.closePath();

  const bladeGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.025,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 2,
  });
  bladeGeo.center();

  const steelCore = new THREE.Mesh(bladeGeo, mats.steel);
  steelCore.position.set(0.02, 0.68, 0);
  steelCore.castShadow = true;
  g.add(steelCore);

  const runeEdge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.62, 0.038), mats.fireBladeEdge);
  runeEdge.position.set(0.08, 0.62, 0);
  runeEdge.rotation.z = -0.08;
  g.add(runeEdge);

  for (let i = 0; i < 5; i++) {
    const link = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 6, 10), mats.bronze);
    link.position.set(0, -0.05 - i * 0.07, 0);
    link.rotation.y = i % 2 === 0 ? 0 : Math.PI / 2;
    g.add(link);
  }

  return g;
}

function buildTitanHammer(mats: GameMaterialLibrary): THREE.Group {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 1.35, 10), mats.obsidian);
  shaft.position.y = 0.65;
  shaft.castShadow = true;
  g.add(shaft);

  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.14, 8), mats.bronze);
  collar.position.y = 1.24;
  g.add(collar);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.34, 0.62), mats.obsidian);
  head.position.y = 1.38;
  head.castShadow = true;
  g.add(head);

  const bronzePlateL = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.28, 0.08), mats.bronze);
  bronzePlateL.position.set(0, 1.38, 0.3);
  g.add(bronzePlateL);

  const bronzePlateR = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.28, 0.08), mats.bronze);
  bronzePlateR.position.set(0, 1.38, -0.3);
  g.add(bronzePlateR);

  const magmaCore = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.24), mats.fireBladeEdge);
  magmaCore.position.y = 1.38;
  g.add(magmaCore);

  return g;
}

function buildLightningSpear(mats: GameMaterialLibrary): THREE.Group {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.038, 1.8, 10), mats.bronze);
  shaft.position.y = 0.85;
  shaft.castShadow = true;
  g.add(shaft);

  const cross = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.08), mats.gold);
  cross.position.y = 1.72;
  g.add(cross);

  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.45, 6), mats.lightningTip);
  tip.position.y = 1.98;
  tip.castShadow = true;
  g.add(tip);

  const prongL = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.24, 5), mats.gold);
  prongL.position.set(0.11, 1.84, 0);
  prongL.rotation.z = -0.25;
  g.add(prongL);

  const prongR = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.24, 5), mats.gold);
  prongR.position.set(-0.11, 1.84, 0);
  prongR.rotation.z = 0.25;
  g.add(prongR);

  return g;
}

export function buildPlayerRig(mats: GameMaterialLibrary): CharacterRig {
  const root = new THREE.Group();
  const contactShadow = addContactShadow(root, mats.contactShadow, 0.85);

  const hips = new THREE.Group();
  hips.position.y = 0.96;
  root.add(hips);

  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.16, 12), mats.bronze);
  belt.castShadow = true;
  hips.add(belt);

  const kilt = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.36, 0.34, 10), mats.crimsonCloth);
  kilt.position.y = -0.2;
  kilt.castShadow = true;
  hips.add(kilt);

  const torso = new THREE.Group();
  torso.position.y = 0.08;
  hips.add(torso);

  const abs = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.28, 12), mats.spartanSkin);
  abs.position.y = 0.14;
  abs.castShadow = true;
  torso.add(abs);

  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.44, 0.36), mats.spartanSkin);
  chest.position.y = 0.44;
  chest.castShadow = true;
  torso.add(chest);

  const sash = new THREE.Mesh(new THREE.BoxGeometry(0.67, 0.11, 0.39), mats.crimsonCloth);
  sash.position.set(0, 0.46, 0);
  sash.rotation.z = 0.48;
  torso.add(sash);

  const pauldron = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6),
    mats.bronze
  );
  pauldron.position.set(-0.36, 0.62, 0);
  pauldron.rotation.z = 0.35;
  pauldron.castShadow = true;
  torso.add(pauldron);

  const head = new THREE.Group();
  head.position.y = 0.72;
  torso.add(head);

  const skull = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.3, 0.26), mats.spartanSkin);
  skull.position.y = 0.14;
  skull.castShadow = true;
  head.add(skull);

  const crest = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.28), mats.crimsonCloth);
  crest.position.set(-0.06, 0.28, 0);
  head.add(crest);

  const face = attachFaceFeatures(head, 1.0, 0.135, 0xffaa33, mats.obsidian, mats.obsidian);

  const buildArm = (side: -1 | 1) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.42, 0.56, 0);
    torso.add(arm);

    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.095, 0.36, 10), mats.spartanSkin);
    upper.position.y = -0.16;
    upper.castShadow = true;
    arm.add(upper);

    const bracer = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.085, 0.3, 10), mats.bronze);
    bracer.position.y = -0.44;
    bracer.castShadow = true;
    arm.add(bracer);

    const handSocket = new THREE.Group();
    handSocket.position.set(0, -0.62, 0.06);
    handSocket.rotation.x = Math.PI / 2;
    arm.add(handSocket);

    return { arm, handSocket };
  };

  const left = buildArm(-1);
  const right = buildArm(1);

  const buildLeg = (side: -1 | 1) => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.16, -0.05, 0);
    hips.add(leg);

    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.44, 10), mats.spartanSkin);
    thigh.position.y = -0.22;
    thigh.castShadow = true;
    leg.add(thigh);

    const greave = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.44, 10), mats.bronze);
    greave.position.y = -0.62;
    greave.castShadow = true;
    leg.add(greave);

    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.26), mats.obsidian);
    boot.position.set(0, -0.86, 0.04);
    boot.castShadow = true;
    leg.add(boot);

    return leg;
  };

  const leftLeg = buildLeg(-1);
  const rightLeg = buildLeg(1);

  const bladesL = buildCurvedFireBlade(mats);
  const bladesR = buildCurvedFireBlade(mats);
  const hammer = buildTitanHammer(mats);
  const spear = buildLightningSpear(mats);

  left.handSocket.add(bladesL);
  right.handSocket.add(bladesR);
  right.handSocket.add(hammer);
  right.handSocket.add(spear);

  hammer.visible = false;
  spear.visible = false;

  const rageAura = new THREE.Mesh(
    new THREE.SphereGeometry(1.15, 16, 12),
    new THREE.MeshBasicMaterial({
      color: 0xff3c00,
      transparent: true,
      opacity: 0.24,
      wireframe: true,
    })
  );
  rageAura.position.y = 1.05;
  rageAura.visible = false;
  root.add(rageAura);

  const shieldGuardMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.68, 0.68, 0.06, 18),
    new THREE.MeshStandardMaterial({
      color: 0xf0be4b,
      emissive: 0xc98a1e,
      emissiveIntensity: 0.9,
      transparent: true,
      opacity: 0.72,
      metalness: 0.85,
      roughness: 0.2,
    })
  );
  shieldGuardMesh.rotation.x = Math.PI / 2;
  shieldGuardMesh.position.set(0, 1.15, 0.65);
  shieldGuardMesh.visible = false;
  root.add(shieldGuardMesh);

  return {
    root,
    hips,
    torso,
    head,
    face,
    leftArm: left.arm,
    rightArm: right.arm,
    leftLeg,
    rightLeg,
    leftHandSocket: left.handSocket,
    rightHandSocket: right.handSocket,
    weapons: { bladesL, bladesR, hammer, spear },
    rageAura,
    shieldGuardMesh,
    contactShadow,
  };
}

export function buildOracleRig(mats: GameMaterialLibrary): OracleRig {
  const root = new THREE.Group();
  addContactShadow(root, mats.contactShadow, 0.85);

  const robeMat = new THREE.MeshStandardMaterial({
    color: 0x1e3a5f,
    emissive: 0x0c243b,
    emissiveIntensity: 0.45,
    roughness: 0.78,
    metalness: 0.12,
  });

  const lowerRobe = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.48, 1.0, 12), robeMat);
  lowerRobe.position.y = 0.52;
  lowerRobe.castShadow = true;
  root.add(lowerRobe);

  const torso = new THREE.Group();
  torso.position.y = 1.02;
  root.add(torso);

  const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.62, 12), robeMat);
  chest.position.y = 0.31;
  torso.add(chest);

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.045, 8, 14), mats.gold);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.58;
  torso.add(collar);

  const head = new THREE.Group();
  head.position.y = 0.65;
  torso.add(head);

  const hood = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.42, 8), robeMat);
  hood.position.set(0, 0.24, -0.02);
  head.add(hood);

  const skull = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.26, 0.22), mats.marble);
  skull.position.y = 0.14;
  head.add(skull);

  const face = attachFaceFeatures(head, 0.88, 0.115, 0x38bdf8, mats.marble, mats.gold);

  const leftArm = new THREE.Group();
  leftArm.position.set(-0.34, 0.52, 0);
  torso.add(leftArm);
  const laMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.55, 8), robeMat);
  laMesh.position.y = -0.25;
  leftArm.add(laMesh);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.34, 0.52, 0);
  torso.add(rightArm);
  const raMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.55, 8), robeMat);
  raMesh.position.y = -0.25;
  rightArm.add(raMesh);

  const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.9, 8), mats.gold);
  staff.position.set(0, -0.1, 0.18);
  rightArm.add(staff);
  const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), mats.lightningTip);
  orb.position.set(0, 0.88, 0.18);
  rightArm.add(orb);

  const auraRing = new THREE.Mesh(
    new THREE.RingGeometry(0.65, 0.82, 24),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.65 })
  );
  auraRing.rotation.x = -Math.PI / 2;
  auraRing.position.y = 0.05;
  root.add(auraRing);

  return { root, torso, head, face, leftArm, rightArm, auraRing };
}

export function setRigWeapon(rig: CharacterRig, weapon: WeaponId) {
  rig.weapons.bladesL.visible = weapon === 'blades';
  rig.weapons.bladesR.visible = weapon === 'blades';
  rig.weapons.hammer.visible = weapon === 'hammer';
  rig.weapons.spear.visible = weapon === 'spear';
}

export function buildEnemyRig(type: EnemyType, mats: GameMaterialLibrary): EnemyRig {
  const root = new THREE.Group();
  const flashMats: THREE.MeshStandardMaterial[] = [];

  const scaleMap: Record<EnemyType, number> = {
    soldier: 1.0,
    skeleton: 0.96,
    guard: 1.25,
    fire_demon: 1.15,
    harpy: 0.95,
    cyclops: 1.85,
    minotaur: 1.55,
    undead: 1.1,
  };
  const s = scaleMap[type];

  const primaryColorMap: Record<EnemyType, number> = {
    soldier: 0x7d6538,
    skeleton: 0xd4cbb8,
    guard: 0x4b535e,
    fire_demon: 0x2b110d,
    harpy: 0x5c2f4a,
    cyclops: 0x6f5a47,
    minotaur: 0x4d2318,
    undead: 0x243b4a,
  };

  const bodyMat = new THREE.MeshStandardMaterial({
    color: primaryColorMap[type],
    roughness: type === 'guard' ? 0.3 : 0.72,
    metalness: type === 'guard' || type === 'soldier' ? 0.68 : 0.12,
    emissive: type === 'fire_demon' ? 0x611200 : type === 'undead' ? 0x0b3a4a : 0x000000,
    emissiveIntensity: type === 'fire_demon' || type === 'undead' ? 0.9 : 0,
  });
  flashMats.push(bodyMat);

  const accentMat =
    type === 'fire_demon'
      ? mats.fireBladeEdge
      : type === 'undead'
        ? mats.lightningTip
        : mats.bronze;

  const contactShadow = addContactShadow(root, mats.contactShadow, 0.75 * s);

  const body = new THREE.Group();
  body.position.y = type === 'harpy' ? 2.1 : 0.92 * s;
  root.add(body);

  const torsoMesh = new THREE.Mesh(
    type === 'cyclops' || type === 'minotaur'
      ? new THREE.BoxGeometry(0.85 * s, 0.75 * s, 0.55 * s)
      : new THREE.BoxGeometry(0.55 * s, 0.62 * s, 0.34 * s),
    bodyMat
  );
  torsoMesh.position.y = 0.34 * s;
  torsoMesh.castShadow = true;
  body.add(torsoMesh);

  const chestAccent = new THREE.Mesh(
    new THREE.BoxGeometry(0.58 * s, 0.24 * s, 0.38 * s),
    accentMat
  );
  chestAccent.position.y = 0.42 * s;
  body.add(chestAccent);

  const head = new THREE.Group();
  head.position.y = 0.72 * s;
  body.add(head);

  const skull = new THREE.Mesh(new THREE.BoxGeometry(0.28 * s, 0.3 * s, 0.28 * s), bodyMat);
  skull.position.y = 0.14 * s;
  skull.castShadow = true;
  head.add(skull);

  const face = attachFaceFeatures(
    head,
    s,
    0.145 * s,
    type === 'undead' ? 0x38bdf8 : 0xff3b1f,
    bodyMat,
    mats.obsidian
  );

  if (type === 'soldier' || type === 'guard') {
    const helm = new THREE.Mesh(new THREE.ConeGeometry(0.2 * s, 0.28 * s, 6), mats.crimsonCloth);
    helm.position.y = 0.36 * s;
    head.add(helm);
  }
  if (type === 'minotaur' || type === 'fire_demon') {
    [-1, 1].forEach((side) => {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.06 * s, 0.34 * s, 6), mats.bone);
      horn.position.set(side * 0.2 * s, 0.28 * s, 0.04 * s);
      horn.rotation.z = -side * 0.65;
      head.add(horn);
    });
  }

  const leftArm = new THREE.Group();
  leftArm.position.set(-0.42 * s, 0.56 * s, 0);
  body.add(leftArm);
  const lMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * s, 0.08 * s, 0.62 * s, 8), bodyMat);
  lMesh.position.y = -0.28 * s;
  lMesh.castShadow = true;
  leftArm.add(lMesh);

  if (type === 'soldier' || type === 'guard') {
    const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.38 * s, 0.38 * s, 0.06 * s, 12), mats.bronze);
    shield.rotation.z = Math.PI / 2;
    shield.position.set(-0.12 * s, -0.42 * s, 0.14 * s);
    leftArm.add(shield);
  }

  if (type === 'harpy') {
    [-1, 1].forEach((side) => {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.52), bodyMat);
      wing.position.set(side * 0.7, 0.45, -0.15);
      wing.rotation.z = side * 0.22;
      body.add(wing);
    });
  }

  const rightArm = new THREE.Group();
  rightArm.position.set(0.42 * s, 0.56 * s, 0);
  body.add(rightArm);
  const rMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * s, 0.08 * s, 0.62 * s, 8), bodyMat);
  rMesh.position.y = -0.28 * s;
  rMesh.castShadow = true;
  rightArm.add(rMesh);

  const wep = new THREE.Mesh(
    type === 'cyclops'
      ? new THREE.CylinderGeometry(0.14 * s, 0.07 * s, 1.3 * s, 7)
      : new THREE.BoxGeometry(0.08 * s, 0.9 * s, 0.14 * s),
    type === 'fire_demon' ? mats.fireBladeEdge : type === 'undead' ? mats.lightningTip : mats.steel
  );
  wep.position.set(0, -0.58 * s, 0.38 * s);
  wep.rotation.x = Math.PI / 2;
  wep.castShadow = true;
  rightArm.add(wep);

  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.17 * s, 0, 0);
  body.add(leftLeg);
  const llMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * s, 0.08 * s, 0.85 * s, 8), bodyMat);
  llMesh.position.y = -0.44 * s;
  llMesh.castShadow = true;
  leftLeg.add(llMesh);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.17 * s, 0, 0);
  body.add(rightLeg);
  const rlMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * s, 0.08 * s, 0.85 * s, 8), bodyMat);
  rlMesh.position.y = -0.44 * s;
  rlMesh.castShadow = true;
  rightLeg.add(rlMesh);

  return {
    root,
    body,
    head,
    face,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    contactShadow,
    hitFlashMaterials: flashMats,
  };
}

export function buildBossRig(bossId: BossId, mats: GameMaterialLibrary): EnemyRig {
  const root = new THREE.Group();
  const flashMats: THREE.MeshStandardMaterial[] = [];

  const scale = bossId === 'titan_warrior' || bossId === 'pyre_lord' ? 3.2 : 2.75;
  const contactShadow = addContactShadow(root, mats.contactShadow, 1.35 * scale);

  const mainColor =
    bossId === 'stone_guardian'
      ? 0x8f887d
      : bossId === 'fire_minotaur'
        ? 0x38120c
        : bossId === 'sea_monster'
          ? 0x164a59
          : bossId === 'titan_warrior'
            ? 0x26252c
            : 0x3b0e08;

  const bossMat = new THREE.MeshStandardMaterial({
    color: mainColor,
    roughness: bossId === 'titan_warrior' ? 0.38 : 0.72,
    metalness: bossId === 'titan_warrior' ? 0.72 : 0.18,
    emissive: bossId === 'pyre_lord' || bossId === 'fire_minotaur' ? 0x521200 : 0x000000,
    emissiveIntensity: 0.7,
  });
  flashMats.push(bossMat);

  const body = new THREE.Group();
  body.position.y = 1.05 * scale;
  root.add(body);

  const chest = new THREE.Mesh(
    bossId === 'sea_monster'
      ? new THREE.CylinderGeometry(0.65 * scale, 0.9 * scale, 1.35 * scale, 12)
      : new THREE.BoxGeometry(1.15 * scale, 1.05 * scale, 0.75 * scale),
    bossMat
  );
  chest.position.y = 0.55 * scale;
  chest.castShadow = true;
  body.add(chest);

  [-1, 1].forEach((side) => {
    const p = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42 * scale, 0), mats.bronze);
    p.position.set(side * 0.72 * scale, 0.95 * scale, 0);
    p.castShadow = true;
    body.add(p);
  });

  const weakSpot = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.28 * scale, 1),
    bossId === 'sea_monster' ? mats.lightningTip : mats.fireBladeEdge
  );
  weakSpot.position.set(0, 0.55 * scale, 0.42 * scale);
  body.add(weakSpot);

  const head = new THREE.Group();
  head.position.y = 1.15 * scale;
  body.add(head);

  const skull = new THREE.Mesh(new THREE.BoxGeometry(0.48 * scale, 0.52 * scale, 0.48 * scale), bossMat);
  skull.position.y = 0.25 * scale;
  skull.castShadow = true;
  head.add(skull);

  const bossEyeColor = bossId === 'sea_monster' ? 0x38bdf8 : 0xff4500;
  const face = attachFaceFeatures(head, 1.75 * scale, 0.25 * scale, bossEyeColor, bossMat, mats.gold);

  if (bossId === 'fire_minotaur' || bossId === 'pyre_lord') {
    [-1, 1].forEach((side) => {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.11 * scale, 0.68 * scale, 7), mats.gold);
      horn.position.set(side * 0.34 * scale, 0.48 * scale, 0.05 * scale);
      horn.rotation.z = -side * 0.7;
      head.add(horn);
    });
  } else if (bossId === 'stone_guardian' || bossId === 'titan_warrior') {
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.34 * scale, 0.26 * scale, 0.26 * scale, 6), mats.gold);
    crown.position.y = 0.55 * scale;
    head.add(crown);
  }

  const leftArm = new THREE.Group();
  leftArm.position.set(-0.78 * scale, 0.85 * scale, 0);
  body.add(leftArm);
  const lArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.34 * scale, 1.05 * scale, 0.34 * scale), bossMat);
  lArmMesh.position.y = -0.45 * scale;
  lArmMesh.castShadow = true;
  leftArm.add(lArmMesh);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.78 * scale, 0.85 * scale, 0);
  body.add(rightArm);
  const rArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.34 * scale, 1.05 * scale, 0.34 * scale), bossMat);
  rArmMesh.position.y = -0.45 * scale;
  rArmMesh.castShadow = true;
  rightArm.add(rArmMesh);

  const bossWeapon = new THREE.Mesh(
    bossId === 'stone_guardian'
      ? new THREE.BoxGeometry(0.45 * scale, 0.55 * scale, 0.45 * scale)
      : new THREE.BoxGeometry(0.18 * scale, 1.8 * scale, 0.36 * scale),
    bossId === 'fire_minotaur' || bossId === 'pyre_lord'
      ? mats.fireBladeEdge
      : bossId === 'sea_monster'
        ? mats.lightningTip
        : mats.bronze
  );
  bossWeapon.position.set(0, -0.95 * scale, 0.55 * scale);
  bossWeapon.rotation.x = Math.PI / 2;
  bossWeapon.castShadow = true;
  rightArm.add(bossWeapon);

  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.32 * scale, 0, 0);
  body.add(leftLeg);
  const llMesh = new THREE.Mesh(
    bossId === 'sea_monster'
      ? new THREE.CylinderGeometry(0.38 * scale, 0.65 * scale, 1.1 * scale, 10)
      : new THREE.BoxGeometry(0.36 * scale, 1.05 * scale, 0.38 * scale),
    bossMat
  );
  llMesh.position.y = -0.52 * scale;
  llMesh.castShadow = true;
  leftLeg.add(llMesh);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.32 * scale, 0, 0);
  body.add(rightLeg);
  const rlMesh = new THREE.Mesh(
    bossId === 'sea_monster'
      ? new THREE.CylinderGeometry(0.38 * scale, 0.65 * scale, 1.1 * scale, 10)
      : new THREE.BoxGeometry(0.36 * scale, 1.05 * scale, 0.38 * scale),
    bossMat
  );
  rlMesh.position.y = -0.52 * scale;
  rlMesh.castShadow = true;
  rightLeg.add(rlMesh);

  return {
    root,
    body,
    head,
    face,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    weakSpot,
    contactShadow,
    hitFlashMaterials: flashMats,
  };
}
