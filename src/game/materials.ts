import * as THREE from 'three';
import { ProceduralTextures } from './textures';

export interface GameMaterialLibrary {
  marble: THREE.MeshStandardMaterial;
  stoneFloor: THREE.MeshStandardMaterial;
  obsidian: THREE.MeshStandardMaterial;
  bronze: THREE.MeshStandardMaterial;
  steel: THREE.MeshStandardMaterial;
  crimsonCloth: THREE.MeshStandardMaterial;
  spartanSkin: THREE.MeshStandardMaterial;
  fireBladeEdge: THREE.MeshStandardMaterial;
  lightningTip: THREE.MeshStandardMaterial;
  lava: THREE.MeshStandardMaterial;
  water: THREE.MeshStandardMaterial;
  bone: THREE.MeshStandardMaterial;
  gold: THREE.MeshStandardMaterial;
  emeraldRune: THREE.MeshStandardMaterial;
  crimsonRune: THREE.MeshStandardMaterial;
  contactShadow: THREE.MeshBasicMaterial;
}

export function createGameMaterials(tex: ProceduralTextures): GameMaterialLibrary {
  return {
    marble: new THREE.MeshStandardMaterial({
      map: tex.marble,
      color: 0xe6dfd3,
      roughness: 0.62,
      metalness: 0.05,
    }),
    stoneFloor: new THREE.MeshStandardMaterial({
      map: tex.stoneFloor,
      color: 0x8f887d,
      roughness: 0.85,
      metalness: 0.05,
    }),
    obsidian: new THREE.MeshStandardMaterial({
      map: tex.obsidian,
      color: 0x38343f,
      roughness: 0.72,
      metalness: 0.18,
    }),
    bronze: new THREE.MeshStandardMaterial({
      map: tex.bronze,
      color: 0xd9a857,
      roughness: 0.28,
      metalness: 0.86,
    }),
    steel: new THREE.MeshStandardMaterial({
      color: 0xa4adb8,
      roughness: 0.24,
      metalness: 0.92,
    }),
    crimsonCloth: new THREE.MeshStandardMaterial({
      color: 0x7d1414,
      roughness: 0.88,
      metalness: 0.02,
    }),
    spartanSkin: new THREE.MeshStandardMaterial({
      map: tex.spartanSkin,
      color: 0xebe2d5,
      roughness: 0.68,
      metalness: 0.04,
    }),
    fireBladeEdge: new THREE.MeshStandardMaterial({
      color: 0xff5a1f,
      emissive: 0xff4500,
      emissiveIntensity: 1.5,
      roughness: 0.2,
      metalness: 0.8,
    }),
    lightningTip: new THREE.MeshStandardMaterial({
      color: 0x6ce5ff,
      emissive: 0x22c8ff,
      emissiveIntensity: 1.8,
      roughness: 0.18,
      metalness: 0.85,
    }),
    lava: new THREE.MeshStandardMaterial({
      map: tex.lava,
      color: 0xff5100,
      emissive: 0xff3b00,
      emissiveIntensity: 1.4,
      roughness: 0.35,
      metalness: 0.1,
    }),
    water: new THREE.MeshStandardMaterial({
      map: tex.water,
      color: 0x165b73,
      roughness: 0.12,
      metalness: 0.35,
      transparent: true,
      opacity: 0.86,
    }),
    bone: new THREE.MeshStandardMaterial({
      color: 0xd9d2c3,
      roughness: 0.78,
      metalness: 0.04,
    }),
    gold: new THREE.MeshStandardMaterial({
      color: 0xf0be4b,
      roughness: 0.2,
      metalness: 0.94,
    }),
    emeraldRune: new THREE.MeshStandardMaterial({
      color: 0x45f29c,
      emissive: 0x1ad97b,
      emissiveIntensity: 1.6,
      roughness: 0.3,
      metalness: 0.2,
    }),
    crimsonRune: new THREE.MeshStandardMaterial({
      color: 0xff3030,
      emissive: 0xe61c1c,
      emissiveIntensity: 1.5,
      roughness: 0.3,
      metalness: 0.2,
    }),
    contactShadow: new THREE.MeshBasicMaterial({
      map: tex.contactShadow,
      transparent: true,
      depthWrite: false,
      opacity: 0.6,
    }),
  };
}
