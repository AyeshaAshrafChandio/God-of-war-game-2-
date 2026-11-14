import * as THREE from 'three';

interface ParticleItem {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  scale: number;
  color: THREE.Color;
  gravity: number;
}

interface SlashArc {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
}

interface ShockwaveRing {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  maxRadius: number;
}

export interface Projectile {
  active: boolean;
  mesh: THREE.Mesh;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  damage: number;
  fromPlayer: boolean;
}

export class GameVFXManager {
  private scene: THREE.Scene;
  private particles: ParticleItem[] = [];
  private instancedParticles: THREE.InstancedMesh;
  private dummy = new THREE.Object3D();
  private slashArcs: SlashArc[] = [];
  private shockwaves: ShockwaveRing[] = [];
  public projectiles: Projectile[] = [];
  private lightningBoltMesh: THREE.Mesh;
  private lightningTimer = 0;

  private readonly maxParticles = 240;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Pooled InstancedMesh for sparks, fire, blood orbs, dust
    const pGeo = new THREE.OctahedronGeometry(0.14, 0);
    const pMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
    });
    this.instancedParticles = new THREE.InstancedMesh(pGeo, pMat, this.maxParticles);
    this.instancedParticles.frustumCulled = false;
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        active: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 1,
        scale: 1,
        color: new THREE.Color(0xffaa33),
        gravity: 9.8,
      });
      this.dummy.scale.setScalar(0);
      this.dummy.updateMatrix();
      this.instancedParticles.setMatrixAt(i, this.dummy.matrix);
      this.instancedParticles.setColorAt(i, this.particles[i].color);
    }
    scene.add(this.instancedParticles);

    // Pooled Slash Arcs (6)
    for (let i = 0; i < 6; i++) {
      const geo = new THREE.RingGeometry(1.1, 2.35, 16, 1, -Math.PI * 0.45, Math.PI * 0.9);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xff5a1f,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      scene.add(mesh);
      this.slashArcs.push({ mesh, life: 0, maxLife: 0.2 });
    }

    // Pooled Shockwave Rings (5)
    for (let i = 0; i < 5; i++) {
      const geo = new THREE.RingGeometry(0.6, 1.0, 28);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffaa22,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      scene.add(mesh);
      this.shockwaves.push({ mesh, life: 0, maxLife: 0.5, maxRadius: 6 });
    }

    // Pooled Projectiles (12)
    const projGeo = new THREE.SphereGeometry(0.32, 8, 8);
    for (let i = 0; i < 12; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const mesh = new THREE.Mesh(projGeo, mat);
      mesh.visible = false;
      scene.add(mesh);
      this.projectiles.push({
        active: false,
        mesh,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        life: 0,
        damage: 25,
        fromPlayer: true,
      });
    }

    // Lightning Pillar Mesh
    const boltGeo = new THREE.CylinderGeometry(0.35, 0.55, 16, 8);
    const boltMat = new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.85,
    });
    this.lightningBoltMesh = new THREE.Mesh(boltGeo, boltMat);
    this.lightningBoltMesh.visible = false;
    scene.add(this.lightningBoltMesh);
  }

  public spawnBurst(
    x: number,
    y: number,
    z: number,
    colorHex: number,
    count = 14,
    speed = 6,
    scale = 1,
    gravity = 12
  ) {
    let spawned = 0;
    for (let i = 0; i < this.maxParticles && spawned < count; i++) {
      const p = this.particles[i];
      if (!p.active) {
        p.active = true;
        p.pos.set(x, y, z);
        const theta = Math.random() * Math.PI * 2;
        const up = 0.2 + Math.random() * 0.9;
        const spd = speed * (0.4 + Math.random() * 0.8);
        p.vel.set(Math.cos(theta) * spd, up * spd, Math.sin(theta) * spd);
        p.maxLife = 0.28 + Math.random() * 0.36;
        p.life = p.maxLife;
        p.scale = scale * (0.65 + Math.random() * 0.7);
        p.color.setHex(colorHex);
        p.gravity = gravity;
        spawned++;
      }
    }
  }

  public spawnSlashArc(pos: THREE.Vector3, yaw: number, tilt: number, colorHex: number, scale = 1.0) {
    const slot = this.slashArcs.find((s) => s.life <= 0) || this.slashArcs[0];
    slot.life = 0.18;
    slot.maxLife = 0.18;
    slot.mesh.visible = true;
    slot.mesh.position.set(pos.x, pos.y + 1.15, pos.z);
    slot.mesh.rotation.set(Math.PI / 2 + tilt, 0, -yaw - Math.PI / 2);
    slot.mesh.scale.setScalar(scale);
    const mat = slot.mesh.material as THREE.MeshBasicMaterial;
    mat.color.setHex(colorHex);
    mat.opacity = 0.92;
  }

  public spawnShockwave(x: number, y: number, z: number, colorHex: number, maxRadius = 6, duration = 0.45) {
    const slot = this.shockwaves.find((s) => s.life <= 0) || this.shockwaves[0];
    slot.life = duration;
    slot.maxLife = duration;
    slot.maxRadius = maxRadius;
    slot.mesh.visible = true;
    slot.mesh.position.set(x, y + 0.12, z);
    slot.mesh.scale.setScalar(0.5);
    const mat = slot.mesh.material as THREE.MeshBasicMaterial;
    mat.color.setHex(colorHex);
    mat.opacity = 0.95;
  }

  public spawnLightningStrike(x: number, y: number, z: number) {
    this.lightningBoltMesh.position.set(x, y + 8, z);
    this.lightningBoltMesh.visible = true;
    this.lightningTimer = 0.28;
    this.spawnShockwave(x, y, z, 0x38bdf8, 5.5, 0.4);
    this.spawnBurst(x, y + 0.8, z, 0x7dd3fc, 22, 9, 1.3, 6);
  }

  public spawnProjectile(
    origin: THREE.Vector3,
    dir: THREE.Vector3,
    speed: number,
    damage: number,
    colorHex: number,
    fromPlayer: boolean
  ) {
    const slot = this.projectiles.find((p) => !p.active);
    if (!slot) return;
    slot.active = true;
    slot.pos.copy(origin);
    slot.vel.copy(dir).normalize().multiplyScalar(speed);
    slot.life = 2.6;
    slot.damage = damage;
    slot.fromPlayer = fromPlayer;
    slot.mesh.visible = true;
    slot.mesh.position.copy(origin);
    (slot.mesh.material as THREE.MeshBasicMaterial).color.setHex(colorHex);
  }

  public update(dt: number) {
    let anyChanged = false;
    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      anyChanged = true;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        this.dummy.scale.setScalar(0);
        this.dummy.updateMatrix();
        this.instancedParticles.setMatrixAt(i, this.dummy.matrix);
        continue;
      }
      p.vel.y -= p.gravity * dt;
      p.pos.addScaledVector(p.vel, dt);
      const t = p.life / p.maxLife;
      this.dummy.position.copy(p.pos);
      this.dummy.rotation.set(p.life * 6, p.life * 4, 0);
      this.dummy.scale.setScalar(p.scale * t);
      this.dummy.updateMatrix();
      this.instancedParticles.setMatrixAt(i, this.dummy.matrix);
      this.instancedParticles.setColorAt(i, p.color);
    }
    if (anyChanged) {
      this.instancedParticles.instanceMatrix.needsUpdate = true;
      if (this.instancedParticles.instanceColor) {
        this.instancedParticles.instanceColor.needsUpdate = true;
      }
    }

    for (const s of this.slashArcs) {
      if (s.life <= 0) continue;
      s.life -= dt;
      if (s.life <= 0) {
        s.mesh.visible = false;
      } else {
        const t = s.life / s.maxLife;
        (s.mesh.material as THREE.MeshBasicMaterial).opacity = t * 0.9;
        s.mesh.rotateZ(dt * 9);
      }
    }

    for (const r of this.shockwaves) {
      if (r.life <= 0) continue;
      r.life -= dt;
      if (r.life <= 0) {
        r.mesh.visible = false;
      } else {
        const prog = 1 - r.life / r.maxLife;
        const rad = THREE.MathUtils.lerp(0.6, r.maxRadius, prog);
        r.mesh.scale.setScalar(rad);
        (r.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - prog) * 0.9;
      }
    }

    if (this.lightningTimer > 0) {
      this.lightningTimer -= dt;
      this.lightningBoltMesh.rotation.y += dt * 22;
      if (this.lightningTimer <= 0) {
        this.lightningBoltMesh.visible = false;
      }
    }

    for (const pr of this.projectiles) {
      if (!pr.active) continue;
      pr.life -= dt;
      pr.pos.addScaledVector(pr.vel, dt);
      pr.mesh.position.copy(pr.pos);
      if (pr.life <= 0) {
        pr.active = false;
        pr.mesh.visible = false;
      }
    }
  }

  public dispose() {
    this.scene.remove(this.instancedParticles);
    this.instancedParticles.geometry.dispose();
    (this.instancedParticles.material as THREE.Material).dispose();
  }
}
