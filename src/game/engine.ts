import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { gameAudio } from './audio';
import {
  buildBossIntroCutscene,
  buildBossVictoryCutscene,
  buildIntroCutscene,
  CutsceneSequence,
} from './cutscenes';
import { buildLevel, LevelData } from './levels';
import { createGameMaterials, GameMaterialLibrary } from './materials';
import {
  buildBossRig,
  buildEnemyRig,
  buildOracleRig,
  buildPlayerRig,
  CharacterRig,
  EnemyRig,
  OracleRig,
  setCharacterExpression,
  setRigWeapon,
} from './models';
import { createProceduralTextures, ProceduralTextures } from './textures';
import {
  BossId,
  EnemyType,
  FacialExpression,
  FloatingDamage,
  GameSettings,
  HUDState,
  LEVEL_METADATA,
  LevelId,
  MagicId,
  SaveData,
  WeaponId,
} from './types';
import { GameVFXManager } from './vfx';
import { voiceActing } from './voice';

// Pre-allocated scratch math helpers (Zero GC in loop)
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _camGoal = new THREE.Vector3();
const _lookGoal = new THREE.Vector3();
const _proj = new THREE.Vector3();

interface EnemyEntity {
  id: number;
  type: EnemyType;
  name: string;
  isBoss: boolean;
  bossId?: BossId;
  rig: EnemyRig;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  yaw: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  attackRange: number;
  aggroRange: number;
  state: 'idle' | 'chase' | 'windup' | 'attack' | 'recover' | 'stagger' | 'dead';
  stateTimer: number;
  attackCooldown: number;
  hitFlashTimer: number;
  didHitThisSwing: boolean;
  phase: number;
  xpReward: number;
  hitRadius: number;
}

export class GameEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;
  private isMobileDevice: boolean;
  private textures: ProceduralTextures;
  private mats: GameMaterialLibrary;
  private vfx: GameVFXManager;

  private dirLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;

  private playerRig: CharacterRig;
  private oracleRig: OracleRig;
  private level: LevelData | null = null;
  private enemies: EnemyEntity[] = [];
  private nextEnemyId = 1;

  // Player Physics & Combat State
  private playerPos = new THREE.Vector3(0, 0, 11);
  private playerVel = new THREE.Vector3();
  private playerYaw = Math.PI;
  private grounded = true;
  private jumpsUsed = 0;
  private lastSafePos = new THREE.Vector3(0, 0, 11);
  private heroExpression: FacialExpression = 'determined';

  private hp = 150;
  private maxHp = 150;
  private magic = 100;
  private maxMagic = 100;
  private rage = 40;
  private maxRage = 100;
  private rageActive = false;

  private weapon: WeaponId = 'blades';
  private magicSkill: MagicId = 'fire';
  private comboCount = 0;
  private comboTimer = 0;
  private attackStep = 0;
  private attackState: 'none' | 'light' | 'heavy' | 'dodge' | 'grab' = 'none';
  private attackTimer = 0;
  private attackDuration = 0;
  private attackHitChecked = false;
  private blocking = false;
  private blockStartTime = 0;
  private invulnTimer = 0;
  private footstepTimer = 0;
  private hitStopTimer = 0;

  // Cinematic Slow-Motion Time Dilation
  private timeScale = 1.0;
  private slowMoTimer = 0;
  private slowMoTarget = 1.0;

  // Cutscene Director State
  private activeCutscene: CutsceneSequence | null = null;
  private cutsceneShotIdx = 0;
  private cutsceneShotElapsed = 0;
  private cutsceneOnComplete: (() => void) | null = null;

  // Camera
  private camYaw = Math.PI;
  private camPitch = 0.38;
  private camShake = 0;
  private camPosCurrent = new THREE.Vector3(0, 4, 18);
  private camLookCurrent = new THREE.Vector3(0, 1.5, 11);
  private camFovCurrent = 58;
  private bossTriggered = false;
  private bossDefeated = false;

  // Progression & Save State
  private saveState: SaveData;
  private settings: GameSettings;
  private paused = true;
  private isDead = false;
  private levelComplete = false;
  private gameComplete = false;
  private bannerMessage: string | null = null;
  private bannerTimer = 0;
  private floatingDamages: FloatingDamage[] = [];
  private nextDmgId = 1;

  // Input State (Keyboard, Mouse, & Virtual Touch Joystick)
  private keys = new Set<string>();
  private virtualMoveX = 0;
  private virtualMoveY = 0;
  private pointerLocked = false;
  private isDraggingCamera = false;
  private lastMouseX = 0;
  private lastMouseY = 0;

  // Loop
  private clock = new THREE.Clock();
  private frameId = 0;
  private disposed = false;
  private hudThrottle = 0;
  private onHUDUpdate: (hud: HUDState) => void;
  private onPauseToggle: () => void;
  private onSaveNotify: (save: SaveData) => void;

  constructor(
    container: HTMLElement,
    initialSave: SaveData,
    callbacks: {
      onHUDUpdate: (hud: HUDState) => void;
      onPauseToggle: () => void;
      onSaveNotify: (save: SaveData) => void;
    }
  ) {
    this.container = container;
    this.saveState = structuredClone(initialSave);
    this.settings = structuredClone(initialSave.settings);
    this.onHUDUpdate = callbacks.onHUDUpdate;
    this.onPauseToggle = callbacks.onPauseToggle;
    this.onSaveNotify = callbacks.onSaveNotify;

    this.isMobileDevice = window.innerWidth <= 900 || navigator.maxTouchPoints > 0;

    // 1. Software WebGL Guard
    this.isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl && this.settings.graphicsQuality !== 'low',
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    const maxDpr = this.isMobileDevice ? 1.5 : 2;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, maxDpr));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && this.settings.graphicsQuality !== 'low';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);

    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    // 2. Scene & RoomEnvironment
    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(
      58,
      (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight),
      0.15,
      360
    );

    // 3. 3-Point Warm/Cool Lighting Rig
    this.hemiLight = new THREE.HemisphereLight(0x8aa8d6, 0x3b2618, 0.72);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xffdcb0, 1.9);
    this.dirLight.position.set(18, 32, 16);
    this.dirLight.castShadow = true;
    const sSize = this.settings.graphicsQuality === 'high' && !this.isMobileDevice ? 2048 : 1024;
    this.dirLight.shadow.mapSize.set(sSize, sSize);
    this.dirLight.shadow.camera.near = 1;
    this.dirLight.shadow.camera.far = 95;
    const d = 28;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0005;
    this.dirLight.shadow.normalBias = 0.02;
    this.scene.add(this.dirLight);
    this.scene.add(this.dirLight.target);

    const rimLight = new THREE.DirectionalLight(0x6fa8dc, 0.65);
    rimLight.position.set(-16, 14, -22);
    this.scene.add(rimLight);

    // 4. Textures, Materials, VFX, Player & Oracle Rigs
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createProceduralTextures(maxAniso);
    this.mats = createGameMaterials(this.textures);
    this.vfx = new GameVFXManager(this.scene);

    this.playerRig = buildPlayerRig(this.mats);
    this.scene.add(this.playerRig.root);
    setRigWeapon(this.playerRig, this.weapon);

    this.oracleRig = buildOracleRig(this.mats);
    this.oracleRig.root.visible = false;
    this.scene.add(this.oracleRig.root);

    this.loadLevel(this.saveState.currentLevel, this.saveState.checkpointIndex, false);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    gameAudio.setVolumes(this.settings.soundVolume, this.settings.musicVolume);
    voiceActing.setVolume(this.settings.voiceVolume);
    this.clock.start();
    this.tick();
  }

  public loadLevel(levelId: LevelId, checkpointIdx = 0, playIntro = true) {
    voiceActing.stop();
    this.activeCutscene = null;
    this.oracleRig.root.visible = false;

    if (this.level) {
      this.scene.remove(this.level.group);
    }
    for (const e of this.enemies) {
      this.scene.remove(e.rig.root);
    }
    this.enemies = [];

    this.saveState.currentLevel = levelId;
    this.saveState.checkpointIndex = checkpointIdx;

    const highQuality = this.settings.graphicsQuality === 'high' && !this.isMobileDevice;
    this.level = buildLevel(levelId, this.mats, highQuality);
    this.scene.add(this.level.group);

    this.scene.background = new THREE.Color(this.level.skyColor);
    this.scene.fog = new THREE.FogExp2(this.level.skyColor, this.level.fogDensity);

    const spawn = this.level.checkpoints[checkpointIdx] || this.level.spawnPoint;
    this.playerPos.copy(spawn);
    this.lastSafePos.copy(spawn);
    this.playerVel.set(0, 0, 0);
    this.playerYaw = Math.PI;
    this.camYaw = Math.PI;
    this.camPitch = 0.36;
    this.camPosCurrent.set(spawn.x, spawn.y + 4.2, spawn.z + 7.5);
    this.camLookCurrent.set(spawn.x, spawn.y + 1.4, spawn.z);

    this.recalcPlayerStats(true);
    this.isDead = false;
    this.levelComplete = false;
    this.gameComplete = false;
    this.bossTriggered = false;
    this.bossDefeated = false;
    this.timeScale = 1.0;
    this.slowMoTimer = 0;

    const diffMult = LEVEL_METADATA[levelId].difficulty;
    for (const def of this.level.enemies) {
      this.spawnEnemy(def.type, def.x, def.y, def.z, diffMult);
    }

    if (playIntro && checkpointIdx === 0) {
      this.startCutscene(buildIntroCutscene(levelId), () => {
        this.showBanner(`${LEVEL_METADATA[levelId].name} — ${LEVEL_METADATA[levelId].subtitle}`, 3.4);
      });
    } else {
      this.showBanner(`${LEVEL_METADATA[levelId].name} — ${LEVEL_METADATA[levelId].subtitle}`, 3.4);
    }
    this.emitHUD();
  }

  private startCutscene(seq: CutsceneSequence, onComplete?: () => void) {
    this.activeCutscene = seq;
    this.cutsceneShotIdx = 0;
    this.cutsceneShotElapsed = 0;
    this.cutsceneOnComplete = onComplete || null;
    this.blocking = false;
    this.attackState = 'none';
    this.playerVel.set(0, 0, 0);

    if (seq.kind === 'intro') {
      // Position Oracle NPC facing Tharos in the 3D scene
      this.oracleRig.root.position.set(this.playerPos.x + 1.9, this.playerPos.y, this.playerPos.z - 3.6);
      this.oracleRig.root.rotation.y = Math.atan2(
        this.playerPos.x - this.oracleRig.root.position.x,
        this.playerPos.z - this.oracleRig.root.position.z
      );
      this.oracleRig.root.visible = true;
      this.playerYaw = Math.atan2(
        this.oracleRig.root.position.x - this.playerPos.x,
        this.oracleRig.root.position.z - this.playerPos.z
      );
    } else {
      this.oracleRig.root.visible = false;
    }

    this.triggerCutsceneShot(0);
    this.emitHUD();
  }

  private triggerCutsceneShot(idx: number) {
    if (!this.activeCutscene) return;
    const shot = this.activeCutscene.shots[idx];
    if (!shot) return;

    voiceActing.speakLine(shot.subtitle.text, shot.subtitle.role);
    if (shot.triggerSting) gameAudio.playCinematicSting(this.activeCutscene.kind !== 'intro');
    if (shot.triggerRoar) gameAudio.playBossRoar();
    if (shot.triggerShake) this.camShake = Math.max(this.camShake, shot.triggerShake);

    if (shot.triggerExplosion) {
      const target =
        shot.anchor === 'boss'
          ? this.enemies.find((e) => e.isBoss)?.pos || this.playerPos
          : this.playerPos;
      this.vfx.spawnBurst(target.x, target.y + 1.4, target.z, 0xff5a1f, 30, 9, 1.4, 8);
      this.vfx.spawnShockwave(target.x, target.y, target.z, 0xff4500, 7.5, 0.5);
    }
  }

  public skipCutscene() {
    if (!this.activeCutscene) return;
    voiceActing.stop();
    this.oracleRig.root.visible = false;
    const cb = this.cutsceneOnComplete;
    this.activeCutscene = null;
    this.cutsceneOnComplete = null;
    this.playerYaw = Math.PI;
    if (cb) cb();
    this.emitHUD();
  }

  private triggerSlowMo(scale: number, duration: number) {
    this.slowMoTarget = scale;
    this.timeScale = scale;
    this.slowMoTimer = duration;
  }

  private recalcPlayerStats(fullHeal = false) {
    this.maxHp = 130 + (this.saveState.upgrades.health - 1) * 35;
    this.maxMagic = 90 + (this.saveState.upgrades.magic - 1) * 25;
    this.maxRage = 100 + (this.saveState.upgrades.rage - 1) * 20;
    if (fullHeal) {
      this.hp = this.maxHp;
      this.magic = this.maxMagic;
    } else {
      this.hp = Math.min(this.hp, this.maxHp);
      this.magic = Math.min(this.magic, this.maxMagic);
    }
  }

  private spawnEnemy(type: EnemyType, x: number, y: number, z: number, diffMult: number) {
    const stats: Record<
      EnemyType,
      { name: string; hp: number; dmg: number; spd: number; rng: number; xp: number; rad: number }
    > = {
      soldier: { name: 'Spartan Hoplite', hp: 75, dmg: 14, spd: 4.3, rng: 2.3, xp: 35, rad: 0.7 },
      skeleton: { name: 'Risen Skeleton', hp: 55, dmg: 11, spd: 4.8, rng: 2.1, xp: 25, rad: 0.65 },
      guard: { name: 'Armored Guard', hp: 135, dmg: 20, spd: 3.3, rng: 2.6, xp: 60, rad: 0.9 },
      fire_demon: { name: 'Tartarus Fiend', hp: 115, dmg: 22, spd: 4.6, rng: 2.5, xp: 65, rad: 0.85 },
      harpy: { name: 'Storm Harpy', hp: 65, dmg: 15, spd: 5.8, rng: 2.4, xp: 45, rad: 0.75 },
      cyclops: { name: 'Brute Cyclops', hp: 230, dmg: 30, spd: 3.0, rng: 3.4, xp: 110, rad: 1.3 },
      minotaur: { name: 'Blood Minotaur', hp: 195, dmg: 26, spd: 4.4, rng: 3.0, xp: 95, rad: 1.1 },
      undead: { name: 'Cursed Champion', hp: 110, dmg: 19, spd: 4.7, rng: 2.4, xp: 55, rad: 0.75 },
    };
    const st = stats[type];
    const rig = buildEnemyRig(type, this.mats);
    rig.root.position.set(x, y, z);
    this.scene.add(rig.root);

    this.enemies.push({
      id: this.nextEnemyId++,
      type,
      name: st.name,
      isBoss: false,
      rig,
      pos: new THREE.Vector3(x, y, z),
      vel: new THREE.Vector3(),
      yaw: 0,
      hp: Math.round(st.hp * diffMult),
      maxHp: Math.round(st.hp * diffMult),
      speed: st.spd,
      damage: Math.round(st.dmg * diffMult),
      attackRange: st.rng,
      aggroRange: 20,
      state: 'idle',
      stateTimer: 0,
      attackCooldown: 0.6 + Math.random() * 0.8,
      hitFlashTimer: 0,
      didHitThisSwing: false,
      phase: 1,
      xpReward: Math.round(st.xp * diffMult),
      hitRadius: st.rad,
    });
  }

  private spawnBoss() {
    if (!this.level || this.bossTriggered) return;
    this.bossTriggered = true;
    const bs = this.level.bossSpawn;
    const meta = LEVEL_METADATA[this.level.id];
    const maxHp = Math.round(520 * meta.difficulty);
    const rig = buildBossRig(bs.id, this.mats);
    rig.root.position.set(bs.x, bs.y, bs.z);
    this.scene.add(rig.root);

    this.enemies.push({
      id: this.nextEnemyId++,
      type: 'minotaur',
      name: meta.bossName,
      isBoss: true,
      bossId: bs.id,
      rig,
      pos: new THREE.Vector3(bs.x, bs.y, bs.z),
      vel: new THREE.Vector3(),
      yaw: 0,
      hp: maxHp,
      maxHp,
      speed: 3.7,
      damage: Math.round(32 * meta.difficulty),
      attackRange: 5.2,
      aggroRange: 65,
      state: 'idle',
      stateTimer: 1.0,
      attackCooldown: 1.2,
      hitFlashTimer: 0,
      didHitThisSwing: false,
      phase: 1,
      xpReward: Math.round(400 * meta.difficulty),
      hitRadius: 2.4,
    });

    this.playerYaw = Math.atan2(bs.x - this.playerPos.x, bs.z - this.playerPos.z);
    this.startCutscene(buildBossIntroCutscene(this.level.id), () => {
      this.showBanner(`${meta.bossName.toUpperCase()} — ${meta.bossTitle}`, 2.6);
    });
  }

  private showBanner(msg: string, duration = 2.6) {
    this.bannerMessage = msg;
    this.bannerTimer = duration;
  }

  private addDamageNumber(worldPos: THREE.Vector3, amount: number, type: FloatingDamage['type'], crit = false) {
    _proj.copy(worldPos);
    _proj.y += 1.6;
    _proj.project(this.camera);
    if (_proj.z > 1) return;
    const x = (_proj.x * 0.5 + 0.5) * 100;
    const y = (-_proj.y * 0.5 + 0.5) * 100;
    const id = this.nextDmgId++;
    this.floatingDamages.push({
      id,
      x: Math.max(8, Math.min(92, x + (Math.random() - 0.5) * 4)),
      y: Math.max(10, Math.min(85, y)),
      amount: Math.round(amount),
      crit,
      type,
    });
    if (this.floatingDamages.length > 14) {
      this.floatingDamages.shift();
    }
    window.setTimeout(() => {
      this.floatingDamages = this.floatingDamages.filter((d) => d.id !== id);
    }, 820);
  }

  // Public Controls from React UI & Mobile Touch Overlay
  public setVirtualMove(x: number, y: number) {
    this.virtualMoveX = Math.max(-1, Math.min(1, x));
    this.virtualMoveY = Math.max(-1, Math.min(1, y));
  }

  public addCameraOrbit(dx: number, dy: number) {
    const sens = 0.004 * this.settings.mouseSensitivity;
    this.camYaw -= dx * sens;
    this.camPitch = THREE.MathUtils.clamp(this.camPitch + dy * sens, 0.08, 1.05);
  }

  public touchAction(
    action: 'light' | 'heavy' | 'jump' | 'dodge' | 'interact' | 'magic' | 'rage' | 'block_start' | 'block_end'
  ) {
    if (this.paused || this.isDead || this.levelComplete || this.activeCutscene) return;
    gameAudio.init();
    if (action === 'light') this.triggerAttack('light');
    else if (action === 'heavy') this.triggerAttack('heavy');
    else if (action === 'jump') this.triggerJump();
    else if (action === 'dodge') this.triggerDodge();
    else if (action === 'interact') this.triggerInteractOrGrab();
    else if (action === 'magic') this.triggerMagic();
    else if (action === 'rage') this.triggerRage();
    else if (action === 'block_start') {
      this.blocking = true;
      this.blockStartTime = performance.now() * 0.001;
    } else if (action === 'block_end') {
      this.blocking = false;
    }
  }

  public setPaused(p: boolean) {
    this.paused = p;
    if (p) {
      voiceActing.stop();
      if (document.pointerLockElement === this.renderer.domElement) {
        document.exitPointerLock();
      }
    } else {
      gameAudio.init();
    }
  }

  public requestPointerLock() {
    if (!this.paused && document.pointerLockElement !== this.renderer.domElement) {
      this.renderer.domElement.requestPointerLock?.();
    }
  }

  public updateSettings(newSettings: GameSettings) {
    this.settings = structuredClone(newSettings);
    this.saveState.settings = structuredClone(newSettings);
    gameAudio.setVolumes(newSettings.soundVolume, newSettings.musicVolume);
    voiceActing.setVolume(newSettings.voiceVolume);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && newSettings.graphicsQuality !== 'low';
    this.onSaveNotify(structuredClone(this.saveState));
  }

  public applyUpgrade(key: keyof SaveData['upgrades']): boolean {
    const lvl = this.saveState.upgrades[key];
    if (lvl >= 5) return false;
    const cost = lvl * 120;
    if (this.saveState.xp < cost) return false;
    this.saveState.xp -= cost;
    this.saveState.upgrades[key] = lvl + 1;
    this.recalcPlayerStats(false);
    if (key === 'health') this.hp = Math.min(this.maxHp, this.hp + 45);
    if (key === 'magic') this.magic = Math.min(this.maxMagic, this.magic + 30);
    gameAudio.playPuzzleChime();
    this.onSaveNotify(structuredClone(this.saveState));
    this.emitHUD();
    return true;
  }

  public selectWeapon(w: WeaponId) {
    this.weapon = w;
    setRigWeapon(this.playerRig, w);
    gameAudio.playMenuClick();
    this.emitHUD();
  }

  public selectMagic(m: MagicId) {
    this.magicSkill = m;
    gameAudio.playMenuClick();
    this.emitHUD();
  }

  public respawnAtCheckpoint() {
    this.loadLevel(this.saveState.currentLevel, this.saveState.checkpointIndex, false);
    this.setPaused(false);
  }

  public advanceNextLevel() {
    if (this.saveState.currentLevel < 5) {
      const next = (this.saveState.currentLevel + 1) as LevelId;
      this.saveState.highestUnlockedLevel = Math.max(this.saveState.highestUnlockedLevel, next) as LevelId;
      this.saveState.checkpointIndex = 0;
      this.onSaveNotify(structuredClone(this.saveState));
      this.loadLevel(next, 0, true);
      this.setPaused(false);
    }
  }

  public getSaveSnapshot(): SaveData {
    this.saveState.savedAt = new Date().toISOString();
    return structuredClone(this.saveState);
  }

  // Input Event Listeners
  private handleKeyDown = (e: KeyboardEvent) => {
    const code = e.code;
    if (code === 'Escape') {
      if (this.activeCutscene) {
        this.skipCutscene();
      } else {
        this.onPauseToggle();
      }
      return;
    }
    if (this.activeCutscene && (code === 'Space' || code === 'Enter')) {
      e.preventDefault();
      this.skipCutscene();
      return;
    }
    if (this.paused || this.isDead || this.levelComplete || this.activeCutscene) return;

    this.keys.add(code);

    if (code === 'Space') {
      e.preventDefault();
      this.triggerJump();
    } else if (code === 'ShiftLeft' || code === 'ShiftRight') {
      this.triggerDodge();
    } else if (code === 'KeyE') {
      this.triggerInteractOrGrab();
    } else if (code === 'KeyQ') {
      this.triggerMagic();
    } else if (code === 'KeyF' || code === 'Digit4') {
      const order: MagicId[] = ['fire', 'lightning', 'shockwave', 'projectile'];
      const next = order[(order.indexOf(this.magicSkill) + 1) % order.length];
      this.selectMagic(next);
    } else if (code === 'KeyR') {
      this.triggerRage();
    } else if (code === 'Digit1') {
      this.selectWeapon('blades');
    } else if (code === 'Digit2') {
      this.selectWeapon('hammer');
    } else if (code === 'Digit3') {
      this.selectWeapon('spear');
    } else if (code === 'KeyB' || code === 'KeyC') {
      if (!this.blocking) {
        this.blocking = true;
        this.blockStartTime = performance.now() * 0.001;
      }
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
    if (e.code === 'KeyB' || e.code === 'KeyC') {
      this.blocking = false;
    }
  };

  private handleMouseDown = (e: MouseEvent) => {
    if (this.paused || this.isDead || this.levelComplete || this.activeCutscene) return;
    if (e.target !== this.renderer.domElement) return;
    gameAudio.init();

    if (e.button === 0) {
      this.triggerAttack('light');
      this.isDraggingCamera = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    } else if (e.button === 2) {
      this.triggerAttack('heavy');
    } else if (e.button === 1) {
      e.preventDefault();
      this.blocking = true;
      this.blockStartTime = performance.now() * 0.001;
    }
  };

  private handleMouseUp = (e: MouseEvent) => {
    if (e.button === 0) this.isDraggingCamera = false;
    if (e.button === 1) this.blocking = false;
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (this.paused || this.activeCutscene) return;
    const sens = 0.0024 * this.settings.mouseSensitivity;
    if (this.pointerLocked) {
      this.camYaw -= e.movementX * sens;
      this.camPitch = THREE.MathUtils.clamp(this.camPitch + e.movementY * sens, 0.08, 1.05);
    } else if (this.isDraggingCamera) {
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.camYaw -= dx * sens * 1.4;
      this.camPitch = THREE.MathUtils.clamp(this.camPitch + dy * sens * 1.4, 0.08, 1.05);
    }
  };

  private handlePointerLockChange = () => {
    this.pointerLocked = document.pointerLockElement === this.renderer.domElement;
    this.emitHUD();
  };

  private handleContextMenu = (e: MouseEvent) => {
    if (e.target === this.renderer.domElement) e.preventDefault();
  };

  private handleResize = () => {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.isMobileDevice = w <= 900 || navigator.maxTouchPoints > 0;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private bindEvents() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('contextmenu', this.handleContextMenu);
    window.addEventListener('resize', this.handleResize);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
  }

  // Gameplay Actions
  private triggerJump() {
    if (this.attackState === 'dodge' || this.activeCutscene) return;
    if (this.grounded || this.jumpsUsed < 2) {
      this.playerVel.y = this.jumpsUsed === 0 ? 11.4 : 10.2;
      this.grounded = false;
      this.jumpsUsed++;
      gameAudio.playJump();
      this.vfx.spawnBurst(this.playerPos.x, this.playerPos.y + 0.1, this.playerPos.z, 0xd6cfc2, 6, 3, 0.7, 8);
    }
  }

  private triggerDodge() {
    if (this.attackState === 'dodge' || this.activeCutscene) return;
    this.attackState = 'dodge';
    this.attackDuration = 0.34;
    this.attackTimer = 0.34;
    this.invulnTimer = 0.36;
    this.blocking = false;
    const moveDir = this.getInputMoveDirection();
    if (moveDir.lengthSq() > 0.01) {
      this.playerYaw = Math.atan2(moveDir.x, moveDir.z);
    }
    this.playerVel.x = Math.sin(this.playerYaw) * 15.5;
    this.playerVel.z = Math.cos(this.playerYaw) * 15.5;
    gameAudio.playDodge();
    this.vfx.spawnBurst(this.playerPos.x, this.playerPos.y + 0.8, this.playerPos.z, 0xff8c42, 10, 4, 0.8, 2);
  }

  private triggerAttack(kind: 'light' | 'heavy') {
    if (this.attackState === 'dodge' || this.attackState === 'grab' || this.activeCutscene) return;
    if (this.attackState !== 'none' && this.attackTimer > this.attackDuration * 0.42) return;

    this.blocking = false;
    this.attackState = kind;
    this.attackStep = kind === 'light' ? (this.attackStep % 5) + 1 : 0;
    const speedFactor = this.rageActive ? 1.25 : 1.0;

    if (this.weapon === 'blades') {
      this.attackDuration = (kind === 'light' ? 0.32 : 0.56) / speedFactor;
    } else if (this.weapon === 'hammer') {
      this.attackDuration = (kind === 'light' ? 0.48 : 0.72) / speedFactor;
    } else {
      this.attackDuration = (kind === 'light' ? 0.36 : 0.6) / speedFactor;
    }
    this.attackTimer = this.attackDuration;
    this.attackHitChecked = false;
    this.heroExpression = 'angry';

    const nearest = this.findNearestEnemy(5.5);
    if (nearest) {
      this.playerYaw = Math.atan2(nearest.pos.x - this.playerPos.x, nearest.pos.z - this.playerPos.z);
    }
    this.playerVel.x = Math.sin(this.playerYaw) * (kind === 'heavy' ? 6.5 : 4.2);
    this.playerVel.z = Math.cos(this.playerYaw) * (kind === 'heavy' ? 6.5 : 4.2);

    const arcColor =
      this.weapon === 'blades' ? 0xff5a1f : this.weapon === 'hammer' ? 0xf59e0b : 0x38bdf8;
    const tilt = kind === 'heavy' ? 0 : this.attackStep % 2 === 0 ? 0.4 : -0.4;
    this.vfx.spawnSlashArc(this.playerPos, this.playerYaw, tilt, arcColor, kind === 'heavy' ? 1.45 : 1.05);
    gameAudio.playSwing(this.weapon, kind === 'heavy');
  }

  private triggerMagic() {
    if (this.activeCutscene) return;
    const costs: Record<MagicId, number> = { fire: 30, lightning: 32, shockwave: 28, projectile: 22 };
    const cost = costs[this.magicSkill];
    if (this.magic < cost) {
      this.showBanner('Not Enough Magic!', 1.2);
      return;
    }
    this.magic -= cost;
    this.heroExpression = 'roar';
    const magicMult = 1 + (this.saveState.upgrades.magic - 1) * 0.25;

    if (this.magicSkill === 'fire') {
      gameAudio.playExplosion();
      this.camShake = 0.42;
      this.vfx.spawnShockwave(this.playerPos.x, this.playerPos.y, this.playerPos.z, 0xff4500, 7.5, 0.5);
      this.vfx.spawnBurst(this.playerPos.x, this.playerPos.y + 1, this.playerPos.z, 0xff6a1a, 34, 11, 1.5, 8);
      this.damageEnemiesInRadius(this.playerPos, 7.5, 68 * magicMult, true, 'magic');
    } else if (this.magicSkill === 'lightning') {
      gameAudio.playLightning();
      this.camShake = 0.35;
      const target = this.findNearestEnemy(18);
      const tx = target ? target.pos.x : this.playerPos.x + Math.sin(this.playerYaw) * 6;
      const tz = target ? target.pos.z : this.playerPos.z + Math.cos(this.playerYaw) * 6;
      this.vfx.spawnLightningStrike(tx, this.playerPos.y, tz);
      _v1.set(tx, this.playerPos.y, tz);
      this.damageEnemiesInRadius(_v1, 5.2, 82 * magicMult, true, 'magic');
    } else if (this.magicSkill === 'shockwave') {
      gameAudio.playExplosion();
      this.camShake = 0.5;
      this.vfx.spawnShockwave(this.playerPos.x, this.playerPos.y, this.playerPos.z, 0xfbbf24, 9.0, 0.55);
      this.damageEnemiesInRadius(this.playerPos, 9.0, 56 * magicMult, true, 'magic');
    } else {
      gameAudio.playLightning();
      for (const offset of [-0.22, 0, 0.22]) {
        const yaw = this.playerYaw + offset;
        _v1.set(this.playerPos.x, this.playerPos.y + 1.2, this.playerPos.z);
        _v2.set(Math.sin(yaw), 0, Math.cos(yaw));
        this.vfx.spawnProjectile(_v1, _v2, 22, 34 * magicMult, 0x38bdf8, true);
      }
    }
    this.emitHUD();
  }

  private triggerRage() {
    if (this.rageActive || this.activeCutscene) return;
    if (this.rage < 40) {
      this.showBanner('Need at least 40% Rage for Tartarus Wrath', 1.4);
      return;
    }
    this.rageActive = true;
    this.heroExpression = 'roar';
    this.playerRig.rageAura.visible = true;
    this.camShake = 0.35;
    this.triggerSlowMo(0.38, 0.55);
    gameAudio.playBossRoar();
    this.vfx.spawnShockwave(this.playerPos.x, this.playerPos.y, this.playerPos.z, 0xff2200, 6.5, 0.45);
    this.showBanner('TARTARUS RAGE UNLEASHED!', 2.0);
  }

  private triggerInteractOrGrab() {
    if (!this.level || this.activeCutscene) return;

    const grabCandidate = this.enemies.find(
      (e) =>
        e.state !== 'dead' &&
        !e.isBoss &&
        e.pos.distanceTo(this.playerPos) < 3.2 &&
        (e.state === 'stagger' || e.hp <= e.maxHp * 0.4)
    );
    if (grabCandidate) {
      this.attackState = 'grab';
      this.attackDuration = 0.65;
      this.attackTimer = 0.65;
      this.invulnTimer = 0.75;
      this.camShake = 0.5;
      this.heroExpression = 'roar';
      this.triggerSlowMo(0.25, 0.75);
      gameAudio.playExplosion();
      this.vfx.spawnBurst(grabCandidate.pos.x, grabCandidate.pos.y + 1, grabCandidate.pos.z, 0xdc2626, 30, 9, 1.4, 10);
      this.vfx.spawnShockwave(grabCandidate.pos.x, grabCandidate.pos.y, grabCandidate.pos.z, 0xff4500, 5.2, 0.45);
      this.applyDamageToEnemy(grabCandidate, grabCandidate.hp + 99, true, 'heavy');
      this.hp = Math.min(this.maxHp, this.hp + 22);
      this.addDamageNumber(this.playerPos, 22, 'heal');
      this.showBanner('BRUTAL EXECUTION (+22 HP)', 1.5);
      return;
    }

    for (const prop of this.level.interactives) {
      const dx = this.playerPos.x - prop.x;
      const dz = this.playerPos.z - prop.z;
      const dy = Math.abs(this.playerPos.y - prop.y);
      if (Math.hypot(dx, dz) <= prop.radius && dy < 2.6) {
        if (prop.kind === 'ladder' && prop.ladderTopY !== undefined) {
          this.playerPos.set(-11.2, prop.ladderTopY + 0.1, prop.z);
          this.playerVel.set(0, 0, 0);
          gameAudio.playJump();
          return;
        }
        if (prop.kind === 'relic' && !prop.activated) {
          prop.activated = true;
          prop.mesh.visible = false;
          this.saveState.collectibles++;
          this.saveState.xp += 200;
          gameAudio.playChestOpen();
          this.vfx.spawnBurst(prop.x, prop.y + 1, prop.z, 0xfbbf24, 24, 7, 1.2, 5);
          this.showBanner('OLYMPIAN RELIC CLAIMED! (+200 XP)', 2.4);
          this.onSaveNotify(this.getSaveSnapshot());
          return;
        }
        if (prop.kind === 'chest' && !prop.activated) {
          prop.activated = true;
          prop.mesh.scale.y = 0.65;
          this.hp = this.maxHp;
          this.magic = this.maxMagic;
          this.saveState.xp += 150;
          gameAudio.playChestOpen();
          this.vfx.spawnBurst(prop.x, prop.y + 1, prop.z, 0x22c55e, 24, 7, 1.1, 6);
          this.showBanner('TREASURE CHEST OPENED! Full Health, Magic & +150 XP', 2.5);
          this.onSaveNotify(this.getSaveSnapshot());
          return;
        }
        if (prop.kind === 'checkpoint') {
          prop.activated = true;
          this.hp = this.maxHp;
          this.magic = this.maxMagic;
          this.saveState.checkpointIndex = 1;
          gameAudio.playPuzzleChime();
          this.vfx.spawnShockwave(prop.x, prop.y, prop.z, 0x45f29c, 4, 0.45);
          this.showBanner('CHECKPOINT SAVED & HEALTH RESTORED', 2.2);
          this.onSaveNotify(this.getSaveSnapshot());
          return;
        }
        if (prop.kind === 'switch' && !prop.activated) {
          prop.activated = true;
          prop.mesh.children[1].rotation.z = -0.55;
          gameAudio.playPuzzleChime();
          this.checkPuzzleCompletion();
          return;
        }
        if (prop.kind === 'symbol_statue' && !prop.activated) {
          prop.activated = true;
          const orb = prop.mesh.children[1] as THREE.Mesh;
          orb.material = this.mats.emeraldRune;
          gameAudio.playPuzzleChime();
          this.vfx.spawnBurst(prop.x, prop.y + 2.2, prop.z, 0x45f29c, 16, 5, 1, 4);
          this.checkPuzzleCompletion();
          return;
        }
        if (prop.kind === 'rotate_mech' && !prop.activated) {
          prop.rotationAngle = (prop.rotationAngle || 0) + 1;
          prop.mesh.children[1].rotation.y += Math.PI * 0.66;
          gameAudio.playImpact(false);
          if (prop.rotationAngle >= 3) {
            prop.activated = true;
            gameAudio.playPuzzleChime();
            this.checkPuzzleCompletion();
          } else {
            this.showBanner(`Titan Mechanism Turned (${prop.rotationAngle}/3)`, 1.5);
          }
          return;
        }
        if (prop.kind === 'push_block' && !prop.activated && prop.targetPlate) {
          const toPlateX = prop.targetPlate.x - prop.x;
          const toPlateZ = prop.targetPlate.z - prop.z;
          const dist = Math.hypot(toPlateX, toPlateZ);
          if (dist > 0.2) {
            const step = Math.min(2.6, dist);
            prop.x += (toPlateX / dist) * step;
            prop.z += (toPlateZ / dist) * step;
            prop.mesh.position.set(prop.x, prop.y, prop.z);
            gameAudio.playImpact(true);
            this.vfx.spawnBurst(prop.x, 0.2, prop.z, 0xa8a29e, 10, 4, 0.8, 10);
          }
          if (Math.hypot(prop.targetPlate.x - prop.x, prop.targetPlate.z - prop.z) <= prop.targetPlate.radius) {
            prop.activated = true;
            prop.x = prop.targetPlate.x;
            prop.z = prop.targetPlate.z;
            prop.mesh.position.set(prop.x, prop.y, prop.z);
            prop.targetPlate.indicator.material = this.mats.emeraldRune;
            gameAudio.playPuzzleChime();
            this.checkPuzzleCompletion();
          }
          return;
        }
      }
    }
  }

  private checkPuzzleCompletion() {
    if (!this.level || this.level.puzzleSolved) return;
    const reqKinds = ['push_block', 'switch', 'symbol_statue', 'rotate_mech'];
    const puzzleProps = this.level.interactives.filter((p) => reqKinds.includes(p.kind));
    if (puzzleProps.every((p) => p.activated)) {
      this.level.puzzleSolved = true;
      if (this.level.gate) {
        this.level.gate.open = true;
      }
      this.camShake = 0.4;
      gameAudio.playBossRoar();
      this.showBanner('ANCIENT GATE UNSEALED! Advance to the Arena!', 3.2);
    }
  }

  private findNearestEnemy(maxRange: number): EnemyEntity | null {
    let best: EnemyEntity | null = null;
    let bestDist = maxRange;
    for (const e of this.enemies) {
      if (e.state === 'dead') continue;
      const d = e.pos.distanceTo(this.playerPos);
      if (d < bestDist) {
        bestDist = d;
        best = e;
      }
    }
    return best;
  }

  private getInputMoveDirection(): THREE.Vector3 {
    let f = this.virtualMoveY;
    let r = this.virtualMoveX;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) f += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) f -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) r += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) r -= 1;

    _v1.set(0, 0, 0);
    if (Math.abs(f) < 0.05 && Math.abs(r) < 0.05) return _v1;

    const fwdX = -Math.sin(this.camYaw);
    const fwdZ = -Math.cos(this.camYaw);
    const rightX = Math.cos(this.camYaw);
    const rightZ = -Math.sin(this.camYaw);

    _v1.set(fwdX * f + rightX * r, 0, fwdZ * f + rightZ * r);
    if (_v1.lengthSq() > 1) _v1.normalize();
    return _v1;
  }

  // Main Update Tick
  private tick = () => {
    if (this.disposed) return;
    const rawDt = Math.min(this.clock.getDelta(), 0.05);

    if (!this.paused) {
      // Smoothly update Slow-Motion Time Scale
      if (this.slowMoTimer > 0) {
        this.slowMoTimer -= rawDt;
        this.timeScale = THREE.MathUtils.damp(this.timeScale, this.slowMoTarget, 16, rawDt);
      } else {
        this.timeScale = THREE.MathUtils.damp(this.timeScale, 1.0, 10, rawDt);
      }

      if (this.activeCutscene) {
        this.updateCutscene(rawDt);
      } else if (this.hitStopTimer > 0) {
        this.hitStopTimer -= rawDt;
      } else {
        this.updateWorld(rawDt * this.timeScale, rawDt);
      }
    }

    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private updateCutscene(rawDt: number) {
    if (!this.activeCutscene || !this.level) return;
    const shot = this.activeCutscene.shots[this.cutsceneShotIdx];
    if (!shot) {
      this.skipCutscene();
      return;
    }

    this.cutsceneShotElapsed += rawDt;
    const t = Math.min(1, this.cutsceneShotElapsed / shot.duration);
    const smoothT = t * t * (3 - 2 * t);

    // Animate torches & VFX in background so cutscene is 100% live 3D
    const elapsed = this.clock.elapsedTime;
    for (const torch of this.level.torches) {
      const flicker = 0.85 + Math.sin(elapsed * 13 + torch.phase) * 0.15;
      torch.flame.scale.set(1, flicker * 1.15, 1);
      if (torch.light) torch.light.intensity = torch.baseIntensity * flicker;
    }
    this.vfx.update(rawDt);

    // Talk mouth pulse synced to speaking
    const talkPulse = (Math.sin(elapsed * 16) * 0.5 + 0.5) * (voiceActing.getIsSpeaking() || t < 0.75 ? 1 : 0);

    // Pose & Express Hero
    this.playerRig.root.position.copy(this.playerPos);
    this.playerRig.root.rotation.y = this.playerYaw;
    setCharacterExpression(
      this.playerRig.face,
      shot.heroExpression,
      shot.subtitle.role === 'hero' ? talkPulse : 0
    );

    if (shot.heroPose === 'ready_blades') {
      this.playerRig.rightArm.rotation.x = THREE.MathUtils.damp(this.playerRig.rightArm.rotation.x, -0.85, 8, rawDt);
      this.playerRig.leftArm.rotation.x = THREE.MathUtils.damp(this.playerRig.leftArm.rotation.x, -0.75, 8, rawDt);
    } else if (shot.heroPose === 'defiant_raise') {
      this.playerRig.rightArm.rotation.x = THREE.MathUtils.damp(this.playerRig.rightArm.rotation.x, -2.35, 8, rawDt);
      this.playerRig.leftArm.rotation.x = THREE.MathUtils.damp(this.playerRig.leftArm.rotation.x, -0.45, 8, rawDt);
    } else {
      this.playerRig.rightArm.rotation.x = THREE.MathUtils.damp(this.playerRig.rightArm.rotation.x, -0.25, 8, rawDt);
      this.playerRig.leftArm.rotation.x = THREE.MathUtils.damp(this.playerRig.leftArm.rotation.x, -0.25, 8, rawDt);
    }

    // Pose & Express Oracle if visible
    if (this.oracleRig.root.visible) {
      this.oracleRig.auraRing.rotation.z += rawDt * 1.4;
      this.oracleRig.torso.position.y = 1.02 + Math.sin(elapsed * 2.2) * 0.04;
      setCharacterExpression(
        this.oracleRig.face,
        shot.oracleExpression || 'neutral',
        shot.subtitle.role === 'oracle' ? talkPulse : 0
      );
    }

    // Pose & Express Boss if present
    const boss = this.enemies.find((e) => e.isBoss);
    if (boss) {
      setCharacterExpression(
        boss.rig.face,
        shot.bossExpression || 'angry',
        shot.subtitle.role === 'boss' ? talkPulse : 0
      );
      if (shot.bossPose === 'roar') {
        boss.rig.rightArm.rotation.x = -2.0;
        boss.rig.leftArm.rotation.x = -2.0;
        boss.rig.head.rotation.x = -0.25;
      } else if (shot.bossPose === 'slam') {
        const slam = Math.min(1, t * 2.2);
        boss.rig.rightArm.rotation.x = THREE.MathUtils.lerp(-2.2, 0.55, slam);
        boss.rig.leftArm.rotation.x = THREE.MathUtils.lerp(-2.0, 0.45, slam);
      } else if (shot.bossPose === 'collapse') {
        boss.rig.root.scale.setScalar(Math.max(0.15, 1 - smoothT * 0.78));
        boss.rig.root.position.y = -smoothT * 2.0;
      }
      if (boss.rig.weakSpot) boss.rig.weakSpot.rotation.y += rawDt * 3;
    }

    // Camera Anchor Resolution & Smooth Interpolation
    let anchorPos = this.playerPos;
    if (shot.anchor === 'oracle' && this.oracleRig.root.visible) anchorPos = this.oracleRig.root.position;
    else if (shot.anchor === 'boss' && boss) anchorPos = boss.pos;

    _camGoal.set(
      anchorPos.x + THREE.MathUtils.lerp(shot.camFrom[0], shot.camTo[0], smoothT),
      anchorPos.y + THREE.MathUtils.lerp(shot.camFrom[1], shot.camTo[1], smoothT),
      anchorPos.z + THREE.MathUtils.lerp(shot.camFrom[2], shot.camTo[2], smoothT)
    );
    _lookGoal.set(
      anchorPos.x + THREE.MathUtils.lerp(shot.lookFrom[0], shot.lookTo[0], smoothT),
      anchorPos.y + THREE.MathUtils.lerp(shot.lookFrom[1], shot.lookTo[1], smoothT),
      anchorPos.z + THREE.MathUtils.lerp(shot.lookFrom[2], shot.lookTo[2], smoothT)
    );

    this.camPosCurrent.lerp(_camGoal, Math.min(1, rawDt * 8));
    this.camLookCurrent.lerp(_lookGoal, Math.min(1, rawDt * 10));
    this.camera.position.copy(this.camPosCurrent);
    if (this.camShake > 0.005) {
      this.camera.position.x += (Math.random() - 0.5) * this.camShake;
      this.camera.position.y += (Math.random() - 0.5) * this.camShake;
      this.camShake = Math.max(0, this.camShake - rawDt * 1.1);
    }
    this.camera.lookAt(this.camLookCurrent);

    const targetFov = THREE.MathUtils.lerp(shot.fovFrom, shot.fovTo, smoothT);
    this.camFovCurrent = THREE.MathUtils.damp(this.camFovCurrent, targetFov, 7, rawDt);
    this.camera.fov = this.camFovCurrent;
    this.camera.updateProjectionMatrix();

    if (this.cutsceneShotElapsed >= shot.duration) {
      this.cutsceneShotIdx++;
      this.cutsceneShotElapsed = 0;
      if (this.cutsceneShotIdx >= this.activeCutscene.shots.length) {
        this.skipCutscene();
      } else {
        this.triggerCutsceneShot(this.cutsceneShotIdx);
      }
    }

    this.hudThrottle += rawDt;
    if (this.hudThrottle >= 0.06) {
      this.hudThrottle = 0;
      this.emitHUD();
    }
  }

  private updateWorld(dt: number, rawDt: number) {
    if (!this.level) return;

    if (this.bannerTimer > 0) {
      this.bannerTimer -= rawDt;
      if (this.bannerTimer <= 0) this.bannerMessage = null;
    }

    const time = this.clock.elapsedTime;
    for (const t of this.level.torches) {
      const flicker = 0.85 + Math.sin(time * 13 + t.phase) * 0.15 + Math.cos(time * 23 + t.phase) * 0.08;
      t.flame.scale.set(1, flicker * 1.15, 1);
      if (t.light) t.light.intensity = t.baseIntensity * flicker;
    }

    for (const tp of this.level.timedPlatforms) {
      tp.currentY = tp.baseY + Math.sin(time * tp.speed + tp.phase) * tp.ampY;
      tp.mesh.position.y = tp.currentY - 0.6;
    }

    for (const tr of this.level.traps) {
      const cycle = Math.sin(time * 2.1 + tr.phaseOffset);
      tr.active = cycle > 0.35;
      tr.mesh.children.forEach((c, idx) => {
        if (idx > 0) c.position.y = tr.active ? 0.58 : -0.35;
      });
      if (
        tr.active &&
        !this.isDead &&
        this.invulnTimer <= 0 &&
        Math.hypot(this.playerPos.x - tr.x, this.playerPos.z - tr.z) < tr.radius &&
        Math.abs(this.playerPos.y - tr.y) < 1.2
      ) {
        this.damagePlayer(14, tr.x, tr.z);
      }
    }

    if (this.level.gate && this.level.gate.open && this.level.gate.gateMesh) {
      this.level.gate.gateMesh.position.y = THREE.MathUtils.damp(
        this.level.gate.gateMesh.position.y,
        11.5,
        3.5,
        dt
      );
    }

    if (!this.bossTriggered && this.playerPos.z <= this.level.bossSpawn.triggerZ) {
      this.spawnBoss();
      return;
    }

    this.updatePlayer(dt);
    this.updateEnemies(dt);
    this.updateProjectiles();
    this.vfx.update(dt);
    this.updateCamera(rawDt);

    this.dirLight.position.set(this.playerPos.x + 18, this.playerPos.y + 30, this.playerPos.z + 16);
    this.dirLight.target.position.copy(this.playerPos);

    const activeEnemyNear = this.enemies.some((e) => e.state !== 'dead' && e.pos.distanceTo(this.playerPos) < 18);
    const activeBoss = this.enemies.some((e) => e.isBoss && e.state !== 'dead');
    gameAudio.setCombatIntensity(activeEnemyNear, activeBoss);

    this.hudThrottle += rawDt;
    if (this.hudThrottle >= 0.05) {
      this.hudThrottle = 0;
      this.emitHUD();
    }
  }

  private updatePlayer(dt: number) {
    if (this.isDead || !this.level) return;

    if (this.invulnTimer > 0) this.invulnTimer -= dt;
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.comboCount = 0;
    }

    this.magic = Math.min(this.maxMagic, this.magic + dt * 2.2);
    if (this.rageActive) {
      this.rage -= dt * 9.5;
      this.playerRig.rageAura.rotation.y += dt * 4;
      this.heroExpression = 'roar';
      if (this.rage <= 0) {
        this.rage = 0;
        this.rageActive = false;
        this.playerRig.rageAura.visible = false;
      }
    } else if (this.attackState === 'none') {
      this.heroExpression = 'determined';
    }

    if (this.attackState !== 'none') {
      this.attackTimer -= dt;
      if ((this.attackState === 'light' || this.attackState === 'heavy') && !this.attackHitChecked) {
        if (this.attackTimer <= this.attackDuration * 0.55) {
          this.attackHitChecked = true;
          this.resolvePlayerStrike(this.attackState === 'heavy');
        }
      }
      if (this.attackTimer <= 0) {
        this.attackState = 'none';
      }
    }

    const moveDir = this.getInputMoveDirection();
    const moveSpeed = this.blocking ? 3.5 : this.rageActive ? 9.8 : 8.2;

    if (this.attackState === 'none') {
      if (moveDir.lengthSq() > 0.01) {
        this.playerVel.x = THREE.MathUtils.damp(this.playerVel.x, moveDir.x * moveSpeed, 14, dt);
        this.playerVel.z = THREE.MathUtils.damp(this.playerVel.z, moveDir.z * moveSpeed, 14, dt);
        const targetYaw = Math.atan2(moveDir.x, moveDir.z);
        let diff = targetYaw - this.playerYaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.playerYaw += diff * Math.min(1, dt * 14);

        if (this.grounded) {
          this.footstepTimer -= dt;
          if (this.footstepTimer <= 0) {
            this.footstepTimer = 0.28;
            gameAudio.playFootstep();
          }
        }
      } else {
        this.playerVel.x = THREE.MathUtils.damp(this.playerVel.x, 0, 12, dt);
        this.playerVel.z = THREE.MathUtils.damp(this.playerVel.z, 0, 12, dt);
      }
    } else if (this.attackState !== 'dodge') {
      this.playerVel.x = THREE.MathUtils.damp(this.playerVel.x, 0, 8, dt);
      this.playerVel.z = THREE.MathUtils.damp(this.playerVel.z, 0, 8, dt);
    }

    this.playerVel.y -= 26 * dt;

    const nextX = this.playerPos.x + this.playerVel.x * dt;
    const nextZ = this.playerPos.z + this.playerVel.z * dt;
    if (!this.collidesWithSolid(nextX, this.playerPos.y, this.playerPos.z, 0.55)) {
      this.playerPos.x = nextX;
    }
    if (!this.collidesWithSolid(this.playerPos.x, this.playerPos.y, nextZ, 0.55)) {
      this.playerPos.z = nextZ;
    }

    this.playerPos.y += this.playerVel.y * dt;
    const floorY = this.getFloorHeightAt(this.playerPos.x, this.playerPos.z, this.playerPos.y);
    if (floorY !== null && this.playerPos.y <= floorY + 0.08 && this.playerVel.y <= 0.5) {
      this.playerPos.y = floorY;
      this.playerVel.y = 0;
      this.grounded = true;
      this.jumpsUsed = 0;
      if (floorY >= -0.1) {
        this.lastSafePos.copy(this.playerPos);
      }
    } else {
      this.grounded = false;
    }

    if (this.playerPos.y < -6.5) {
      this.damagePlayer(20, this.playerPos.x, this.playerPos.z);
      this.playerPos.copy(this.lastSafePos);
      this.playerPos.y += 1.0;
      this.playerVel.set(0, 0, 0);
    }

    this.animatePlayerRig(dt);
  }

  private collidesWithSolid(x: number, y: number, z: number, r: number): boolean {
    if (!this.level) return false;
    for (const c of this.level.colliders) {
      if (c.isGate && c.open) continue;
      if (y < c.topY - 0.3 && x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ) {
        return true;
      }
    }
    return false;
  }

  private getFloorHeightAt(x: number, z: number, currentY: number): number | null {
    if (!this.level) return null;
    let bestY: number | null = null;
    for (const f of this.level.walkableFloors) {
      if (x >= f.minX - 0.25 && x <= f.maxX + 0.25 && z >= f.minZ - 0.25 && z <= f.maxZ + 0.25) {
        if (currentY >= f.topY - 1.5 && (bestY === null || f.topY > bestY)) {
          bestY = f.topY;
        }
      }
    }
    for (const tp of this.level.timedPlatforms) {
      if (
        Math.abs(x - tp.x) <= tp.width / 2 + 0.25 &&
        Math.abs(z - tp.z) <= tp.depth / 2 + 0.25 &&
        currentY >= tp.currentY - 1.5
      ) {
        if (bestY === null || tp.currentY > bestY) {
          bestY = tp.currentY;
        }
      }
    }
    return bestY;
  }

  private animatePlayerRig(dt: number) {
    this.playerRig.root.position.copy(this.playerPos);
    this.playerRig.root.rotation.y = this.playerYaw;
    this.playerRig.shieldGuardMesh.visible = this.blocking;
    setCharacterExpression(this.playerRig.face, this.heroExpression, 0);

    const speed = Math.hypot(this.playerVel.x, this.playerVel.z);
    const t = this.clock.elapsedTime;

    if (this.attackState === 'dodge') {
      this.playerRig.hips.rotation.x = 1.1;
      this.playerRig.hips.position.y = 0.65;
    } else if (this.attackState === 'light' || this.attackState === 'heavy' || this.attackState === 'grab') {
      const p = 1 - this.attackTimer / Math.max(0.01, this.attackDuration);
      const swing = Math.sin(p * Math.PI);
      this.playerRig.hips.position.y = 0.94 - swing * 0.1;
      this.playerRig.torso.rotation.y = (this.attackStep % 2 === 0 ? -1 : 1) * (swing * 1.1 - 0.4);
      this.playerRig.rightArm.rotation.x = -1.7 + swing * 2.1;
      this.playerRig.leftArm.rotation.x = this.weapon === 'blades' ? -1.4 + swing * 1.9 : -0.4;
      this.playerRig.hips.rotation.x = 0.2 * swing;
    } else if (!this.grounded) {
      this.playerRig.hips.position.y = 0.96;
      this.playerRig.hips.rotation.x = 0.12;
      this.playerRig.leftLeg.rotation.x = -0.45;
      this.playerRig.rightLeg.rotation.x = 0.35;
      this.playerRig.rightArm.rotation.x = -0.9;
      this.playerRig.leftArm.rotation.x = -0.9;
    } else if (speed > 0.8) {
      const runFreq = 11;
      const stride = Math.sin(t * runFreq);
      this.playerRig.hips.position.y = 0.96 + Math.abs(Math.cos(t * runFreq)) * 0.06;
      this.playerRig.hips.rotation.x = 0.15;
      this.playerRig.torso.rotation.y = THREE.MathUtils.damp(this.playerRig.torso.rotation.y, 0, 10, dt);
      this.playerRig.leftLeg.rotation.x = stride * 0.72;
      this.playerRig.rightLeg.rotation.x = -stride * 0.72;
      this.playerRig.leftArm.rotation.x = -stride * 0.55;
      this.playerRig.rightArm.rotation.x = stride * 0.55;
    } else {
      this.playerRig.hips.position.y = 0.96 + Math.sin(t * 2.5) * 0.02;
      this.playerRig.hips.rotation.x = THREE.MathUtils.damp(this.playerRig.hips.rotation.x, 0, 12, dt);
      this.playerRig.torso.rotation.y = THREE.MathUtils.damp(this.playerRig.torso.rotation.y, 0, 12, dt);
      this.playerRig.leftLeg.rotation.x = THREE.MathUtils.damp(this.playerRig.leftLeg.rotation.x, 0, 12, dt);
      this.playerRig.rightLeg.rotation.x = THREE.MathUtils.damp(this.playerRig.rightLeg.rotation.x, 0, 12, dt);
      this.playerRig.leftArm.rotation.x = THREE.MathUtils.damp(this.playerRig.leftArm.rotation.x, -0.25, 12, dt);
      this.playerRig.rightArm.rotation.x = THREE.MathUtils.damp(this.playerRig.rightArm.rotation.x, -0.25, 12, dt);
    }
  }

  private resolvePlayerStrike(heavy: boolean) {
    if (!this.level) return;

    const wepLvl = this.saveState.upgrades[this.weapon];
    const baseDmgMap: Record<WeaponId, number> = { blades: 22, hammer: 36, spear: 27 };
    const reachMap: Record<WeaponId, number> = { blades: 3.6, hammer: 3.3, spear: 4.5 };

    let dmg = baseDmgMap[this.weapon] * (1 + (wepLvl - 1) * 0.25);
    if (heavy) dmg *= 1.65;
    if (!this.grounded) dmg *= 1.25;
    if (this.comboCount >= 5) dmg *= 1.2;
    if (this.comboCount >= 10) dmg *= 1.35;
    if (this.rageActive) dmg *= 1.65;

    const reach = reachMap[this.weapon] + (heavy ? 0.7 : 0);

    for (const d of this.level.destructibles) {
      if (d.broken) continue;
      if (Math.hypot(d.x - this.playerPos.x, d.z - this.playerPos.z) < reach) {
        d.broken = true;
        d.mesh.visible = false;
        this.hp = Math.min(this.maxHp, this.hp + 12);
        this.magic = Math.min(this.maxMagic, this.magic + 10);
        this.saveState.xp += 15;
        gameAudio.playImpact(false);
        this.vfx.spawnBurst(d.x, d.y + 0.6, d.z, 0xd9a857, 12, 6, 0.9, 12);
      }
    }

    if (heavy && this.weapon === 'hammer') {
      this.vfx.spawnShockwave(
        this.playerPos.x + Math.sin(this.playerYaw) * 1.4,
        this.playerPos.y,
        this.playerPos.z + Math.cos(this.playerYaw) * 1.4,
        0xff6a1a,
        4.4,
        0.38
      );
      this.camShake = Math.max(this.camShake, 0.28);
    }

    let hitAny = false;
    for (const e of this.enemies) {
      if (e.state === 'dead') continue;
      const dist = Math.hypot(e.pos.x - this.playerPos.x, e.pos.z - this.playerPos.z);
      if (dist <= reach + e.hitRadius) {
        this.applyDamageToEnemy(e, dmg, heavy, heavy ? 'heavy' : 'normal');
        hitAny = true;
      }
    }

    if (hitAny) {
      gameAudio.playImpact(heavy);
      this.hitStopTimer = heavy ? 0.045 : 0.022;
      if (heavy || this.comboCount >= 5) {
        this.triggerSlowMo(0.32, 0.28);
      }
      this.camShake = Math.max(this.camShake, heavy ? 0.3 : 0.14);
      if (this.rageActive) {
        this.hp = Math.min(this.maxHp, this.hp + 5);
      }
    }
  }

  private damageEnemiesInRadius(
    center: THREE.Vector3,
    radius: number,
    dmg: number,
    heavy: boolean,
    type: FloatingDamage['type']
  ) {
    for (const e of this.enemies) {
      if (e.state === 'dead') continue;
      if (Math.hypot(e.pos.x - center.x, e.pos.z - center.z) <= radius + e.hitRadius) {
        this.applyDamageToEnemy(e, dmg, heavy, type);
      }
    }
  }

  private applyDamageToEnemy(
    e: EnemyEntity,
    amount: number,
    heavy: boolean,
    type: FloatingDamage['type']
  ) {
    if (e.state === 'dead') return;
    const crit = heavy || (e.isBoss && e.state === 'stagger');
    const finalDmg = Math.round(amount * (e.isBoss && e.state === 'stagger' ? 1.4 : 1.0));
    e.hp = Math.max(0, e.hp - finalDmg);
    e.hitFlashTimer = 0.14;
    setCharacterExpression(e.rig.face, 'pain', 0);

    this.comboCount++;
    this.comboTimer = 3.2;
    this.rage = Math.min(this.maxRage, this.rage + (heavy ? 8 : 4));

    this.addDamageNumber(e.pos, finalDmg, type, crit);
    this.vfx.spawnBurst(e.pos.x, e.pos.y + 1.2, e.pos.z, e.type === 'skeleton' ? 0xe5e7eb : 0xdc2626, 12, 6, 1, 12);

    _v1.subVectors(e.pos, this.playerPos).setY(0).normalize();
    if (!e.isBoss) {
      e.vel.addScaledVector(_v1, heavy ? 9 : 4.5);
      if (heavy && e.state !== 'attack') {
        e.state = 'stagger';
        e.stateTimer = 0.8;
      }
    } else if (e.phase === 1 && e.hp <= e.maxHp * 0.5) {
      e.phase = 2;
      e.state = 'stagger';
      e.stateTimer = 2.0;
      gameAudio.playBossRoar();
      this.triggerSlowMo(0.32, 0.55);
      this.vfx.spawnShockwave(e.pos.x, e.pos.y, e.pos.z, 0xff4500, 9, 0.55);
      this.showBanner(`${e.name.toUpperCase()} ENRAGED — PHASE II!`, 2.4);
    }

    if (e.hp <= 0) {
      e.state = 'dead';
      e.stateTimer = 0.9;
      this.saveState.xp += e.xpReward;
      this.rage = Math.min(this.maxRage, this.rage + 12);
      this.vfx.spawnBurst(e.pos.x, e.pos.y + 1.2, e.pos.z, 0xff5a1f, 28, 9, 1.4, 9);

      if (e.isBoss && !this.bossDefeated && this.level) {
        this.bossDefeated = true;
        this.triggerSlowMo(0.2, 0.8);
        this.camShake = 0.65;
        gameAudio.playExplosion();
        const lvlId = this.level.id;
        this.onSaveNotify(this.getSaveSnapshot());

        // Launch Seamless Post-Mission Victory Cutscene!
        window.setTimeout(() => {
          if (this.disposed) return;
          this.startCutscene(buildBossVictoryCutscene(lvlId), () => {
            if (this.saveState.currentLevel === 5) {
              this.gameComplete = true;
            } else {
              this.levelComplete = true;
            }
            this.setPaused(true);
            this.emitHUD();
          });
        }, 700);
      }
    }
  }

  private updateEnemies(dt: number) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.hitFlashTimer > 0) {
        e.hitFlashTimer -= dt;
        e.rig.hitFlashMaterials.forEach((m) => m.emissive.setHex(e.hitFlashTimer > 0 ? 0xffffff : 0x000000));
      }

      if (e.state === 'dead') {
        e.stateTimer -= dt;
        e.rig.root.scale.setScalar(Math.max(0.01, e.stateTimer));
        e.rig.root.position.y -= dt * 1.4;
        if (e.stateTimer <= 0) {
          this.scene.remove(e.rig.root);
          this.enemies.splice(i, 1);
        }
        continue;
      }

      const dx = this.playerPos.x - e.pos.x;
      const dz = this.playerPos.z - e.pos.z;
      const dist = Math.hypot(dx, dz);

      if (e.attackCooldown > 0) e.attackCooldown -= dt;

      e.pos.addScaledVector(e.vel, dt);
      e.vel.multiplyScalar(Math.max(0, 1 - dt * 7));

      if (e.state === 'stagger') {
        e.stateTimer -= dt;
        e.rig.body.rotation.x = -0.35;
        setCharacterExpression(e.rig.face, 'pain', 0);
        if (e.stateTimer <= 0) {
          e.rig.body.rotation.x = 0;
          e.state = 'chase';
        }
        e.rig.root.position.copy(e.pos);
        continue;
      }

      if (e.state === 'idle') {
        setCharacterExpression(e.rig.face, 'neutral', 0);
        if (dist < e.aggroRange) {
          e.state = 'chase';
        }
      } else if (e.state === 'chase') {
        setCharacterExpression(e.rig.face, 'angry', 0);
        e.yaw = Math.atan2(dx, dz);
        if (dist <= e.attackRange && e.attackCooldown <= 0) {
          e.state = 'windup';
          e.stateTimer = e.isBoss ? (e.phase === 2 ? 0.55 : 0.72) : 0.48;
          e.didHitThisSwing = false;
        } else if (dist > e.attackRange * 0.85) {
          const spd = e.isBoss && e.phase === 2 ? e.speed * 1.3 : e.speed;
          const stepX = (dx / Math.max(0.1, dist)) * spd * dt;
          const stepZ = (dz / Math.max(0.1, dist)) * spd * dt;
          const nextFloor = this.getFloorHeightAt(e.pos.x + stepX, e.pos.z + stepZ, e.pos.y + 0.5);
          if (nextFloor !== null || e.type === 'harpy') {
            e.pos.x += stepX;
            e.pos.z += stepZ;
          }
        }
        const walkT = this.clock.elapsedTime * 7;
        e.rig.leftLeg.rotation.x = Math.sin(walkT) * 0.55;
        e.rig.rightLeg.rotation.x = -Math.sin(walkT) * 0.55;
        e.rig.rightArm.rotation.x = THREE.MathUtils.damp(e.rig.rightArm.rotation.x, -0.3, 8, dt);
      } else if (e.state === 'windup') {
        setCharacterExpression(e.rig.face, 'roar', 0.6);
        e.stateTimer -= dt;
        e.rig.rightArm.rotation.x = -2.1;
        e.rig.leftArm.rotation.x = e.isBoss ? -1.8 : -0.4;
        if (e.stateTimer <= 0) {
          e.state = 'attack';
          e.stateTimer = 0.28;
          gameAudio.playSwing('hammer', e.isBoss);
        }
      } else if (e.state === 'attack') {
        setCharacterExpression(e.rig.face, 'roar', 1.0);
        e.stateTimer -= dt;
        e.rig.rightArm.rotation.x = 0.75;
        if (!e.didHitThisSwing && e.stateTimer <= 0.18) {
          e.didHitThisSwing = true;
          if (e.isBoss) {
            this.vfx.spawnShockwave(e.pos.x, e.pos.y, e.pos.z, 0xff4500, e.attackRange + 1.5, 0.45);
            this.camShake = Math.max(this.camShake, 0.35);
            if (e.phase === 2) {
              _v1.set(e.pos.x, e.pos.y + 2.2, e.pos.z);
              _v2.subVectors(this.playerPos, e.pos).setY(0);
              this.vfx.spawnProjectile(_v1, _v2, 15, e.damage * 0.65, 0xff4500, false);
            }
          }
          if (dist <= e.attackRange + 0.8 && Math.abs(this.playerPos.y - e.pos.y) < 2.6) {
            this.handleIncomingEnemyHit(e);
          }
        }
        if (e.stateTimer <= 0) {
          e.state = 'recover';
          e.stateTimer = e.isBoss ? 0.65 : 0.55;
          e.attackCooldown = e.isBoss ? (e.phase === 2 ? 0.9 : 1.3) : 1.1;
        }
      } else if (e.state === 'recover') {
        e.stateTimer -= dt;
        e.rig.rightArm.rotation.x = THREE.MathUtils.damp(e.rig.rightArm.rotation.x, 0, 8, dt);
        if (e.stateTimer <= 0) {
          e.state = 'chase';
        }
      }

      if (e.rig.weakSpot) {
        e.rig.weakSpot.rotation.y += dt * 2.5;
      }
      e.rig.root.position.copy(e.pos);
      e.rig.root.rotation.y = e.yaw;
    }
  }

  private handleIncomingEnemyHit(attacker: EnemyEntity) {
    if (this.invulnTimer > 0 || this.isDead) return;

    if (this.blocking) {
      const heldFor = performance.now() * 0.001 - this.blockStartTime;
      if (heldFor <= 0.32) {
        gameAudio.playParry();
        this.hitStopTimer = 0.07;
        this.triggerSlowMo(0.28, 0.48);
        this.camShake = 0.25;
        this.rage = Math.min(this.maxRage, this.rage + 24);
        attacker.state = 'stagger';
        attacker.stateTimer = 1.8;
        this.vfx.spawnShockwave(this.playerPos.x, this.playerPos.y + 1, this.playerPos.z, 0xfbbf24, 4.2, 0.35);
        this.addDamageNumber(attacker.pos, 0, 'parry', true);
        this.showBanner('PARRY COUNTER! Enemy Staggered!', 1.3);
        return;
      } else {
        gameAudio.playImpact(false);
        this.damagePlayer(Math.ceil(attacker.damage * 0.25), attacker.pos.x, attacker.pos.z);
        return;
      }
    }

    this.damagePlayer(attacker.damage, attacker.pos.x, attacker.pos.z);
  }

  private damagePlayer(amount: number, srcX: number, srcZ: number) {
    if (this.invulnTimer > 0 || this.isDead) return;
    this.hp = Math.max(0, this.hp - amount);
    this.invulnTimer = 0.42;
    this.heroExpression = 'pain';
    this.camShake = Math.max(this.camShake, 0.28);
    gameAudio.playImpact(true);
    this.vfx.spawnBurst(this.playerPos.x, this.playerPos.y + 1.1, this.playerPos.z, 0xdc2626, 12, 5, 0.9, 10);

    const dx = this.playerPos.x - srcX;
    const dz = this.playerPos.z - srcZ;
    const len = Math.max(0.1, Math.hypot(dx, dz));
    this.playerVel.x += (dx / len) * 6;
    this.playerVel.z += (dz / len) * 6;

    if (this.hp <= 0) {
      this.isDead = true;
      this.setPaused(true);
      this.showBanner('FALLEN IN BATTLE', 4.0);
      this.emitHUD();
    }
  }

  private updateProjectiles() {
    for (const pr of this.vfx.projectiles) {
      if (!pr.active) continue;
      if (pr.fromPlayer) {
        for (const e of this.enemies) {
          if (e.state === 'dead') continue;
          if (Math.hypot(e.pos.x - pr.pos.x, e.pos.z - pr.pos.z) < e.hitRadius + 0.7) {
            this.applyDamageToEnemy(e, pr.damage, false, 'magic');
            pr.active = false;
            pr.mesh.visible = false;
            this.vfx.spawnBurst(pr.pos.x, pr.pos.y, pr.pos.z, 0x38bdf8, 12, 6, 1, 8);
            break;
          }
        }
      } else {
        if (Math.hypot(this.playerPos.x - pr.pos.x, this.playerPos.z - pr.pos.z) < 1.1) {
          this.damagePlayer(pr.damage, pr.pos.x, pr.pos.z);
          pr.active = false;
          pr.mesh.visible = false;
        }
      }
    }
  }

  private updateCamera(dt: number) {
    const activeBoss = this.enemies.find((e) => e.isBoss && e.state !== 'dead');
    const nearbyEnemies = this.enemies.filter((e) => e.state !== 'dead' && e.pos.distanceTo(this.playerPos) < 14).length;

    const portraitScale = this.camera.aspect < 0.85 ? 1.35 : 1.0;
    const dist = (activeBoss ? 10.5 : nearbyEnemies > 1 ? 8.6 : 7.0) * portraitScale;
    const heightOffset = activeBoss ? 3.8 : 2.6;

    const horiz = Math.cos(this.camPitch) * dist;
    const vert = Math.sin(this.camPitch) * dist + heightOffset * 0.45;
    _camGoal.set(
      this.playerPos.x + Math.sin(this.camYaw) * horiz,
      this.playerPos.y + vert,
      this.playerPos.z + Math.cos(this.camYaw) * horiz
    );
    _lookGoal.set(this.playerPos.x, this.playerPos.y + 1.55, this.playerPos.z);

    if (_camGoal.y < this.playerPos.y + 1.2) {
      _camGoal.y = this.playerPos.y + 1.2;
    }

    this.camPosCurrent.x = THREE.MathUtils.damp(this.camPosCurrent.x, _camGoal.x, 9, dt);
    this.camPosCurrent.y = THREE.MathUtils.damp(this.camPosCurrent.y, _camGoal.y, 9, dt);
    this.camPosCurrent.z = THREE.MathUtils.damp(this.camPosCurrent.z, _camGoal.z, 9, dt);

    this.camLookCurrent.x = THREE.MathUtils.damp(this.camLookCurrent.x, _lookGoal.x, 12, dt);
    this.camLookCurrent.y = THREE.MathUtils.damp(this.camLookCurrent.y, _lookGoal.y, 12, dt);
    this.camLookCurrent.z = THREE.MathUtils.damp(this.camLookCurrent.z, _lookGoal.z, 12, dt);

    this.camera.position.copy(this.camPosCurrent);
    if (this.camShake > 0.005) {
      this.camera.position.x += (Math.random() - 0.5) * this.camShake;
      this.camera.position.y += (Math.random() - 0.5) * this.camShake;
      this.camShake = Math.max(0, this.camShake - dt * 1.4);
    }
    this.camera.lookAt(this.camLookCurrent);

    const targetFov = this.slowMoTimer > 0 ? 50 : this.rageActive ? 65 : this.attackState === 'dodge' ? 63 : 58;
    if (Math.abs(this.camFovCurrent - targetFov) > 0.1) {
      this.camFovCurrent = THREE.MathUtils.damp(this.camFovCurrent, targetFov, 8, dt);
      this.camera.fov = this.camFovCurrent;
      this.camera.updateProjectionMatrix();
    }
  }

  private emitHUD() {
    if (!this.level) return;

    let interactPrompt: string | null = null;
    const grabCandidate = this.enemies.find(
      (e) =>
        e.state !== 'dead' &&
        !e.isBoss &&
        e.pos.distanceTo(this.playerPos) < 3.2 &&
        (e.state === 'stagger' || e.hp <= e.maxHp * 0.4)
    );
    if (grabCandidate) {
      interactPrompt = `[E] Execute ${grabCandidate.name}`;
    } else {
      for (const prop of this.level.interactives) {
        if (prop.activated && prop.kind !== 'checkpoint' && prop.kind !== 'ladder') continue;
        const d = Math.hypot(this.playerPos.x - prop.x, this.playerPos.z - prop.z);
        if (d <= prop.radius && Math.abs(this.playerPos.y - prop.y) < 2.6) {
          interactPrompt = `[E] ${prop.label}`;
          break;
        }
      }
    }

    const bossEnt = this.enemies.find((e) => e.isBoss && e.state !== 'dead');
    const nearest = !bossEnt ? this.findNearestEnemy(12) : null;
    const meta = LEVEL_METADATA[this.level.id];

    const objective = bossEnt
      ? `Defeat ${meta.bossName} (${meta.bossTitle})`
      : this.level.puzzleSolved
        ? 'Cross the unsealed Gate into the Boss Sanctum'
        : this.level.puzzleDescription;

    const currentShot = this.activeCutscene ? this.activeCutscene.shots[this.cutsceneShotIdx] : null;

    this.onHUDUpdate({
      hp: Math.round(this.hp),
      maxHp: this.maxHp,
      magic: Math.round(this.magic),
      maxMagic: this.maxMagic,
      rage: Math.round(this.rage),
      maxRage: this.maxRage,
      rageActive: this.rageActive,
      blocking: this.blocking,
      xp: this.saveState.xp,
      collectibles: this.saveState.collectibles,
      weapon: this.weapon,
      magicSkill: this.magicSkill,
      comboCount: this.comboCount,
      comboTimer: this.comboTimer,
      levelId: this.level.id,
      levelName: meta.name,
      objective,
      interactPrompt,
      boss: bossEnt
        ? {
            name: meta.bossName,
            title: meta.bossTitle,
            hp: bossEnt.hp,
            maxHp: bossEnt.maxHp,
            phase: bossEnt.phase,
            staggered: bossEnt.state === 'stagger',
          }
        : null,
      targetEnemy: nearest ? { name: nearest.name, hp: nearest.hp, maxHp: nearest.maxHp } : null,
      bannerMessage: this.bannerMessage,
      cinematicBars: Boolean(this.activeCutscene) || this.slowMoTimer > 0,
      cutscene: {
        active: Boolean(this.activeCutscene),
        title: this.activeCutscene?.title || '',
        subtitle: currentShot ? currentShot.subtitle : null,
        canSkip: Boolean(this.activeCutscene),
      },
      slowMoActive: this.slowMoTimer > 0,
      upgrades: this.saveState.upgrades,
      unlocked: this.saveState.unlocked,
      floatingDamages: [...this.floatingDamages],
      pointerLocked: this.pointerLocked,
      isDead: this.isDead,
      levelComplete: this.levelComplete,
      gameComplete: this.gameComplete,
    });
  }

  public dispose() {
    this.disposed = true;
    voiceActing.stop();
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('contextmenu', this.handleContextMenu);
    window.removeEventListener('resize', this.handleResize);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);

    this.vfx.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
