export type WeaponId = 'blades' | 'hammer' | 'spear';

export type MagicId = 'fire' | 'lightning' | 'shockwave' | 'projectile';

export type EnemyType =
  | 'soldier'
  | 'skeleton'
  | 'guard'
  | 'fire_demon'
  | 'harpy'
  | 'cyclops'
  | 'minotaur'
  | 'undead';

export type BossId =
  | 'stone_guardian'
  | 'fire_minotaur'
  | 'sea_monster'
  | 'titan_warrior'
  | 'pyre_lord';

export type LevelId = 1 | 2 | 3 | 4 | 5;

export type GraphicsQuality = 'low' | 'medium' | 'high';

export type FacialExpression = 'neutral' | 'angry' | 'roar' | 'determined' | 'pain';

export type TouchControlsMode = 'auto' | 'on' | 'off';

export interface GameSettings {
  graphicsQuality: GraphicsQuality;
  soundVolume: number; // 0..1
  musicVolume: number; // 0..1
  voiceVolume: number; // 0..1
  mouseSensitivity: number; // 0.3..2.5
  fullscreen: boolean;
  touchControls: TouchControlsMode;
}

export interface UpgradeLevels {
  blades: number; // 1..5
  hammer: number; // 1..5
  spear: number; // 1..5
  health: number; // 1..5
  magic: number; // 1..5
  rage: number; // 1..5
}

export interface UnlockedAbilities {
  hammer: boolean;
  spear: boolean;
  fire: boolean;
  lightning: boolean;
  shockwave: boolean;
  projectile: boolean;
}

export interface SaveData {
  currentLevel: LevelId;
  highestUnlockedLevel: LevelId;
  xp: number;
  collectibles: number;
  upgrades: UpgradeLevels;
  unlocked: UnlockedAbilities;
  checkpointIndex: number;
  settings: GameSettings;
  savedAt: string;
}

export interface FloatingDamage {
  id: number;
  x: number; // screen % 0..100
  y: number; // screen % 0..100
  amount: number;
  crit: boolean;
  type: 'normal' | 'heavy' | 'magic' | 'heal' | 'parry';
}

export interface BossHUDInfo {
  name: string;
  title: string;
  hp: number;
  maxHp: number;
  phase: number;
  staggered: boolean;
}

export interface TargetEnemyHUD {
  name: string;
  hp: number;
  maxHp: number;
}

export interface CutsceneSubtitle {
  speaker: string;
  role: 'hero' | 'oracle' | 'boss';
  text: string;
}

export interface CutsceneHUDInfo {
  active: boolean;
  title: string;
  subtitle: CutsceneSubtitle | null;
  canSkip: boolean;
}

export interface HUDState {
  hp: number;
  maxHp: number;
  magic: number;
  maxMagic: number;
  rage: number;
  maxRage: number;
  rageActive: boolean;
  blocking: boolean;
  xp: number;
  collectibles: number;
  weapon: WeaponId;
  magicSkill: MagicId;
  comboCount: number;
  comboTimer: number;
  levelId: LevelId;
  levelName: string;
  objective: string;
  interactPrompt: string | null;
  boss: BossHUDInfo | null;
  targetEnemy: TargetEnemyHUD | null;
  bannerMessage: string | null;
  cinematicBars: boolean;
  cutscene: CutsceneHUDInfo;
  slowMoActive: boolean;
  upgrades: UpgradeLevels;
  unlocked: UnlockedAbilities;
  floatingDamages: FloatingDamage[];
  pointerLocked: boolean;
  isDead: boolean;
  levelComplete: boolean;
  gameComplete: boolean;
}

export const LEVEL_METADATA: Record<
  LevelId,
  { name: string; subtitle: string; bossName: string; bossTitle: string; difficulty: number }
> = {
  1: {
    name: 'Temple of the Fallen Gods',
    subtitle: 'Sanctum of the First Betrayal',
    bossName: 'Aegis Colossus',
    bossTitle: 'Giant Stone Guardian',
    difficulty: 1.0,
  },
  2: {
    name: 'Ruins of Sparta',
    subtitle: 'Ashes of the Broken Legion',
    bossName: 'Pyroclast',
    bossTitle: 'Fire Minotaur Warlord',
    difficulty: 1.3,
  },
  3: {
    name: 'Forgotten Underground City',
    subtitle: 'Sunken Vaults of Tartarus',
    bossName: 'Charybdis Leviathan',
    bossTitle: 'Ancient Sea Monster',
    difficulty: 1.6,
  },
  4: {
    name: 'Mountain of Titans',
    subtitle: 'Ascent of the Obsidian Spire',
    bossName: 'Hyperion Ascendant',
    bossTitle: 'Titan Warrior General',
    difficulty: 1.9,
  },
  5: {
    name: 'Ancient Temple of Fire',
    subtitle: 'Heart of the Eternal Forge',
    bossName: 'Ignis Rex',
    bossTitle: 'Sovereign Titan of Fire',
    difficulty: 2.3,
  },
};

export const DEFAULT_SETTINGS: GameSettings = {
  graphicsQuality: 'high',
  soundVolume: 0.75,
  musicVolume: 0.45,
  voiceVolume: 0.9,
  mouseSensitivity: 1.0,
  fullscreen: false,
  touchControls: 'auto',
};

export const INITIAL_SAVE: SaveData = {
  currentLevel: 1,
  highestUnlockedLevel: 1,
  xp: 250,
  collectibles: 0,
  upgrades: {
    blades: 1,
    hammer: 1,
    spear: 1,
    health: 1,
    magic: 1,
    rage: 1,
  },
  unlocked: {
    hammer: true,
    spear: true,
    fire: true,
    lightning: true,
    shockwave: true,
    projectile: true,
  },
  checkpointIndex: 0,
  settings: DEFAULT_SETTINGS,
  savedAt: new Date().toISOString(),
};
