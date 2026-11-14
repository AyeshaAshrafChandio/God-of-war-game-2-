import { CutsceneSubtitle, FacialExpression, LEVEL_METADATA, LevelId } from './types';

export interface CutsceneShot {
  duration: number;
  // Offsets relative to anchor ('hero' | 'oracle' | 'boss' | 'arena_center')
  anchor: 'hero' | 'oracle' | 'boss' | 'arena_center';
  camFrom: [number, number, number];
  camTo: [number, number, number];
  lookFrom: [number, number, number];
  lookTo: [number, number, number];
  fovFrom: number;
  fovTo: number;
  subtitle: CutsceneSubtitle;
  heroExpression: FacialExpression;
  oracleExpression?: FacialExpression;
  bossExpression?: FacialExpression;
  heroPose: 'idle' | 'ready_blades' | 'defiant_raise' | 'sheathe';
  bossPose?: 'idle' | 'roar' | 'slam' | 'collapse';
  triggerSting?: boolean;
  triggerRoar?: boolean;
  triggerExplosion?: boolean;
  triggerShake?: number;
}

export interface CutsceneSequence {
  kind: 'intro' | 'boss_intro' | 'victory';
  title: string;
  shots: CutsceneShot[];
}

export function buildIntroCutscene(levelId: LevelId): CutsceneSequence {
  const meta = LEVEL_METADATA[levelId];

  const scripts: Record<LevelId, { oracleLine: string; heroLine: string; finalLine: string }> = {
    1: {
      oracleLine:
        'Tharos of Sparta... The Fallen Gods have sealed the inner sanctum behind the Stone Colossus.',
      heroLine:
        'No seal of marble or bronze can hold the Chains of Tartarus. I will tear their temple down.',
      finalLine:
        'Awaken the ancient mechanism ahead, Spartan. Your vengeance begins now.',
    },
    2: {
      oracleLine:
        'Look upon the Ruins of Sparta. Pyroclast burns what remains of your fallen legion.',
      heroLine:
        'They turned my homeland to ash. Tonight, that fire consumes the Minotaur Warlord.',
      finalLine:
        'Ignite the three Spartan rune statues to shatter the gate of flame.',
    },
    3: {
      oracleLine:
        'Beneath the sunken vaults, Charybdis stirs in the abyssal dark. Few mortals survive its gaze.',
      heroLine:
        'I crawled out of Tartarus itself. No sea beast will bar my path to Olympus.',
      finalLine:
        'Release the floodgate seal and strike the Leviathan’s glowing core.',
    },
    4: {
      oracleLine:
        'The Mountain of Titans rises above the storm. Hyperion guards the final ascent.',
      heroLine:
        'A Titan General... Good. Tell Olympus their reckoning climbs the spire.',
      finalLine:
        'Turn the great Titan gear mechanism three times to unlock the summit.',
    },
    5: {
      oracleLine:
        'At last, the Ancient Temple of Fire. Ignis Rex awaits at the heart of the eternal forge.',
      heroLine:
        'This ends today. By blade, hammer, and lightning, Olympus will burn.',
      finalLine:
        'Unleash every ounce of Spartan wrath, Tharos. Strike without mercy.',
    },
  };

  const s = scripts[levelId];

  return {
    kind: 'intro',
    title: `Realm ${levelId}: ${meta.name}`,
    shots: [
      {
        // Shot 1: Sweeping Wide Establishing Shot of Temple & Characters
        duration: 4.0,
        anchor: 'hero',
        camFrom: [7.5, 5.2, 7.5],
        camTo: [3.2, 2.4, 3.8],
        lookFrom: [0, 1.4, -2.5],
        lookTo: [0, 1.5, -1.5],
        fovFrom: 62,
        fovTo: 52,
        subtitle: { speaker: 'Olympian Spirit', role: 'oracle', text: s.oracleLine },
        heroExpression: 'determined',
        oracleExpression: 'determined',
        heroPose: 'idle',
        triggerSting: true,
      },
      {
        // Shot 2: Dramatic Close-up on Tharos drawing fire blades
        duration: 4.2,
        anchor: 'hero',
        camFrom: [-1.1, 1.68, 2.0],
        camTo: [-0.55, 1.62, 1.35],
        lookFrom: [0, 1.55, 0],
        lookTo: [0, 1.58, 0],
        fovFrom: 42,
        fovTo: 36,
        subtitle: { speaker: 'Tharos', role: 'hero', text: s.heroLine },
        heroExpression: 'angry',
        oracleExpression: 'neutral',
        heroPose: 'ready_blades',
        triggerExplosion: true,
        triggerShake: 0.18,
      },
      {
        // Shot 3: Over-the-shoulder Reverse Shot looking toward Temple Gate
        duration: 3.4,
        anchor: 'hero',
        camFrom: [1.6, 1.9, 2.8],
        camTo: [0, 2.5, 6.2],
        lookFrom: [0, 1.5, -3.5],
        lookTo: [0, 1.55, 0],
        fovFrom: 46,
        fovTo: 58,
        subtitle: { speaker: 'Olympian Spirit', role: 'oracle', text: s.finalLine },
        heroExpression: 'determined',
        oracleExpression: 'determined',
        heroPose: 'ready_blades',
      },
    ],
  };
}

export function buildBossIntroCutscene(levelId: LevelId): CutsceneSequence {
  const meta = LEVEL_METADATA[levelId];

  const bossLines: Record<LevelId, { bossLine: string; heroReply: string }> = {
    1: {
      bossLine: 'MORTAL WORM! NONE SHALL PASS THE STONE AEGIS OF THE GODS!',
      heroReply: 'Then shatter like the rest of their monuments!',
    },
    2: {
      bossLine: 'SPARTA BELONGS TO THE FLAME! YOUR ASHES WILL FEED MY FORGE!',
      heroReply: 'Come down here and bleed, beast!',
    },
    3: {
      bossLine: 'THE ABYSS CLAIMS ALL WHO TRESPASS IN THE SUNKEN VAULT!',
      heroReply: 'I will carve my path right through your scales!',
    },
    4: {
      bossLine: 'I AM HYPERION, WARDEN OF THE TITANS! KNEEL BEFORE ETERNAL MIGHT!',
      heroReply: 'A Spartan kneels to no god and no Titan!',
    },
    5: {
      bossLine: 'YOU DARE ENTER THE HEART OF FIRE, TRAITOR?! BURN IN TARTARUS!',
      heroReply: 'I brought Tartarus with me. Face your end!',
    },
  };

  const lines = bossLines[levelId];

  return {
    kind: 'boss_intro',
    title: `${meta.bossName} — ${meta.bossTitle}`,
    shots: [
      {
        // Shot 1: Low-angle Hollywood Crane Rise on Massive Boss Slamming Arena
        duration: 3.6,
        anchor: 'boss',
        camFrom: [-8.5, 1.4, 14.0],
        camTo: [-3.5, 4.8, 9.5],
        lookFrom: [0, 3.2, 0],
        lookTo: [0, 5.2, 0],
        fovFrom: 64,
        fovTo: 50,
        subtitle: { speaker: meta.bossName, role: 'boss', text: lines.bossLine },
        heroExpression: 'angry',
        bossExpression: 'roar',
        heroPose: 'ready_blades',
        bossPose: 'slam',
        triggerRoar: true,
        triggerExplosion: true,
        triggerShake: 0.55,
      },
      {
        // Shot 2: Tight Close-Up on Boss's Glowing Eyes & Roaring Jaw
        duration: 2.6,
        anchor: 'boss',
        camFrom: [2.2, 5.8, 5.8],
        camTo: [0.8, 6.2, 4.8],
        lookFrom: [0, 5.9, 0.3],
        lookTo: [0, 6.0, 0.3],
        fovFrom: 42,
        fovTo: 36,
        subtitle: { speaker: meta.bossName, role: 'boss', text: `${meta.bossTitle.toUpperCase()} AWAKENS!` },
        heroExpression: 'angry',
        bossExpression: 'roar',
        heroPose: 'ready_blades',
        bossPose: 'roar',
        triggerSting: true,
      },
      {
        // Shot 3: Whip Cut to Hero Close-Up Raising Weapon in Defiance
        duration: 2.8,
        anchor: 'hero',
        camFrom: [1.3, 1.25, 2.2],
        camTo: [-0.8, 1.55, 1.8],
        lookFrom: [0, 1.45, 0],
        lookTo: [0, 1.55, 0],
        fovFrom: 42,
        fovTo: 54,
        subtitle: { speaker: 'Tharos', role: 'hero', text: lines.heroReply },
        heroExpression: 'roar',
        bossExpression: 'angry',
        heroPose: 'defiant_raise',
        bossPose: 'idle',
        triggerShake: 0.2,
      },
    ],
  };
}

export function buildBossVictoryCutscene(levelId: LevelId): CutsceneSequence {
  const meta = LEVEL_METADATA[levelId];
  const closingLine =
    levelId === 5
      ? 'Ignis Rex is no more. The chains are broken, and Olympus trembles at last.'
      : `The ${meta.bossTitle} lies in ruins. Ahead awaits the next trial of Olympus.`;

  return {
    kind: 'victory',
    title: `${meta.name} Conquered`,
    shots: [
      {
        // Shot 1: Dramatic Slow-Orbit over Boss Shattering in Fire
        duration: 3.4,
        anchor: 'boss',
        camFrom: [-6.5, 2.5, 8.0],
        camTo: [6.5, 4.2, 7.5],
        lookFrom: [0, 2.2, 0],
        lookTo: [0, 1.2, 0],
        fovFrom: 52,
        fovTo: 58,
        subtitle: { speaker: meta.bossName, role: 'boss', text: 'NO... THIS CANNOT BE THE END...' },
        heroExpression: 'determined',
        bossExpression: 'pain',
        heroPose: 'defiant_raise',
        bossPose: 'collapse',
        triggerExplosion: true,
        triggerShake: 0.45,
      },
      {
        // Shot 2: Heroic Close-Up as Tharos Sheathes Blades Amid Rising Embers
        duration: 3.6,
        anchor: 'hero',
        camFrom: [-1.4, 1.35, 2.2],
        camTo: [0.4, 1.75, 2.6],
        lookFrom: [0, 1.45, 0],
        lookTo: [0, 1.55, 0],
        fovFrom: 44,
        fovTo: 48,
        subtitle: { speaker: 'Tharos', role: 'hero', text: closingLine },
        heroExpression: 'determined',
        heroPose: 'sheathe',
        triggerSting: true,
      },
    ],
  };
}
