import { useCallback, useEffect, useRef, useState } from 'react';
import { ControlsCreditsModal } from './components/ControlsCreditsModal';
import { CutsceneOverlay } from './components/CutsceneOverlay';
import { GameHUD } from './components/GameHUD';
import { MainMenu } from './components/MainMenu';
import { PauseUpgradeModal } from './components/PauseUpgradeModal';
import { SettingsModal } from './components/SettingsModal';
import { TouchControls } from './components/TouchControls';
import { VictoryDeathOverlay } from './components/VictoryDeathOverlay';
import { gameAudio } from './game/audio';
import { GameEngine } from './game/engine';
import { loadSavedGame, persistSavedGame } from './game/storage';
import { GameSettings, HUDState, INITIAL_SAVE, LevelId, MagicId, SaveData, WeaponId } from './game/types';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [savedGame, setSavedGame] = useState<SaveData | null>(() => loadSavedGame());
  const [screen, setScreen] = useState<'menu' | 'playing'>('menu');
  const [paused, setPaused] = useState(true);
  const [activeModal, setActiveModal] = useState<'none' | 'settings' | 'controls' | 'credits'>('none');
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [isTouchViewport, setIsTouchViewport] = useState<boolean>(
    () => typeof window !== 'undefined' && (window.innerWidth <= 1024 || navigator.maxTouchPoints > 0)
  );

  const [hud, setHud] = useState<HUDState>({
    hp: 150,
    maxHp: 150,
    magic: 100,
    maxMagic: 100,
    rage: 40,
    maxRage: 100,
    rageActive: false,
    blocking: false,
    xp: INITIAL_SAVE.xp,
    collectibles: 0,
    weapon: 'blades',
    magicSkill: 'fire',
    comboCount: 0,
    comboTimer: 0,
    levelId: 1,
    levelName: 'Temple of the Fallen Gods',
    objective: '',
    interactPrompt: null,
    boss: null,
    targetEnemy: null,
    bannerMessage: null,
    cinematicBars: false,
    cutscene: { active: false, title: '', subtitle: null, canSkip: false },
    slowMoActive: false,
    upgrades: INITIAL_SAVE.upgrades,
    unlocked: INITIAL_SAVE.unlocked,
    floatingDamages: [],
    pointerLocked: false,
    isDead: false,
    levelComplete: false,
    gameComplete: false,
  });

  const screenRef = useRef(screen);
  screenRef.current = screen;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    const onResize = () => {
      setIsTouchViewport(window.innerWidth <= 1024 || navigator.maxTouchPoints > 0);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const initial = loadSavedGame() || INITIAL_SAVE;
    const engine = new GameEngine(container, initial, {
      onHUDUpdate: (nextHud) => setHud(nextHud),
      onPauseToggle: () => {
        if (screenRef.current !== 'playing') return;
        const nextPaused = !pausedRef.current;
        setPaused(nextPaused);
        engineRef.current?.setPaused(nextPaused);
        setSaveNotice(null);
      },
      onSaveNotify: (data) => {
        persistSavedGame(data);
        setSavedGame(data);
      },
    });
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
      gameAudio.dispose();
    };
  }, []);

  const startPlay = useCallback((level: LevelId, resetSave: boolean) => {
    gameAudio.init();
    const engine = engineRef.current;
    if (!engine) return;
    if (resetSave) {
      const fresh = { ...INITIAL_SAVE, currentLevel: level, savedAt: new Date().toISOString() };
      persistSavedGame(fresh);
      setSavedGame(fresh);
      engine.loadLevel(level, 0, true);
    } else {
      const existing = loadSavedGame() || INITIAL_SAVE;
      const cp = level === existing.currentLevel ? existing.checkpointIndex : 0;
      engine.loadLevel(level, cp, cp === 0);
    }
    setScreen('playing');
    setPaused(false);
    setActiveModal('none');
    engine.setPaused(false);
  }, []);

  const handleNewGame = () => startPlay(1, true);
  const handleContinue = () => {
    const s = loadSavedGame();
    startPlay(s ? s.currentLevel : 1, false);
  };
  const handleSelectLevel = (lvl: LevelId) => startPlay(lvl, false);

  const handleResume = () => {
    setPaused(false);
    setSaveNotice(null);
    engineRef.current?.setPaused(false);
  };

  const handleSaveManual = () => {
    const engine = engineRef.current;
    if (!engine) return;
    const snap = engine.getSaveSnapshot();
    persistSavedGame(snap);
    setSavedGame(snap);
    setSaveNotice('Progress saved to sanctuary.');
  };

  const handleUpdateSettings = (s: GameSettings) => {
    engineRef.current?.updateSettings(s);
    const cur = loadSavedGame() || INITIAL_SAVE;
    const next = { ...cur, settings: s };
    persistSavedGame(next);
    setSavedGame(next);
  };

  const handleQuitToMenu = () => {
    engineRef.current?.skipCutscene();
    setPaused(true);
    engineRef.current?.setPaused(true);
    setScreen('menu');
    setActiveModal('none');
  };

  const currentSettings = savedGame?.settings || INITIAL_SAVE.settings;
  const showTouchControls =
    currentSettings.touchControls === 'on' ||
    (currentSettings.touchControls === 'auto' && isTouchViewport);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#08070a]">
      {/* Dedicated Isolated WebGL Canvas Container */}
      <div ref={canvasMountRef} className="absolute inset-0 w-full h-full" />

      {screen === 'menu' && (
        <MainMenu
          savedGame={savedGame}
          onNewGame={handleNewGame}
          onContinue={handleContinue}
          onSelectLevel={handleSelectLevel}
          onOpenSettings={() => setActiveModal('settings')}
          onOpenControls={() => setActiveModal('controls')}
          onOpenCredits={() => setActiveModal('credits')}
        />
      )}

      {screen === 'playing' && (
        <>
          <CutsceneOverlay
            cutscene={hud.cutscene}
            onSkip={() => engineRef.current?.skipCutscene()}
          />
          <GameHUD
            hud={hud}
            showTouchControls={showTouchControls}
            onSelectWeapon={(w: WeaponId) => engineRef.current?.selectWeapon(w)}
            onSelectMagic={(m: MagicId) => engineRef.current?.selectMagic(m)}
            onPauseClick={() => {
              setPaused(true);
              engineRef.current?.setPaused(true);
            }}
            onEngageCamera={() => engineRef.current?.requestPointerLock()}
          />
          {showTouchControls && !paused && !hud.cutscene.active && !hud.isDead && !hud.levelComplete && !hud.gameComplete && (
            <TouchControls
              interactAvailable={Boolean(hud.interactPrompt)}
              onMove={(x, y) => engineRef.current?.setVirtualMove(x, y)}
              onCameraOrbit={(dx, dy) => engineRef.current?.addCameraOrbit(dx, dy)}
              onAction={(act) => engineRef.current?.touchAction(act)}
            />
          )}
        </>
      )}

      {screen === 'playing' && paused && !hud.isDead && !hud.levelComplete && !hud.gameComplete && activeModal === 'none' && (
        <PauseUpgradeModal
          hud={hud}
          onResume={handleResume}
          onUpgrade={(k) => engineRef.current?.applyUpgrade(k)}
          onSaveGame={handleSaveManual}
          onOpenSettings={() => setActiveModal('settings')}
          onOpenControls={() => setActiveModal('controls')}
          onQuitToMenu={handleQuitToMenu}
          saveNotice={saveNotice}
        />
      )}

      {screen === 'playing' && (
        <VictoryDeathOverlay
          hud={hud}
          onRespawn={() => {
            setPaused(false);
            engineRef.current?.respawnAtCheckpoint();
          }}
          onNextLevel={() => {
            setPaused(false);
            engineRef.current?.advanceNextLevel();
          }}
          onMainMenu={handleQuitToMenu}
        />
      )}

      {activeModal === 'settings' && (
        <SettingsModal
          settings={currentSettings}
          onUpdate={handleUpdateSettings}
          onClose={() => setActiveModal('none')}
        />
      )}

      {(activeModal === 'controls' || activeModal === 'credits') && (
        <ControlsCreditsModal mode={activeModal} onClose={() => setActiveModal('none')} />
      )}
    </div>
  );
}
