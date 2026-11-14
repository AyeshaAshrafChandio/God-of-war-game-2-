import React from 'react';
import { LEVEL_METADATA, LevelId, SaveData } from '../game/types';

interface MainMenuProps {
  savedGame: SaveData | null;
  onNewGame: () => void;
  onContinue: () => void;
  onSelectLevel: (level: LevelId) => void;
  onOpenSettings: () => void;
  onOpenControls: () => void;
  onOpenCredits: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  savedGame,
  onNewGame,
  onContinue,
  onSelectLevel,
  onOpenSettings,
  onOpenControls,
  onOpenCredits,
}) => {
  const highestLevel = savedGame?.highestUnlockedLevel || 1;

  return (
    <div className="fixed inset-0 z-30 flex items-start lg:items-center overflow-y-auto bg-gradient-to-r from-[#0a0709]/95 via-[#110b0d]/85 to-[#0a0709]/65 p-4 sm:p-6 md:p-14">
      <div className="w-full max-w-5xl mx-auto my-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
        {/* Left: Brand & Primary Actions */}
        <div className="lg:col-span-6 space-y-6">
          <div>
            <p className="text-xs tracking-[0.25em] uppercase text-[#c99b49] font-semibold">
              Ancient Greek Action Adventure
            </p>
            <h1 className="font-display text-4xl md:text-6xl font-extrabold text-[#f5efe2] tracking-tight mt-2 leading-none">
              THAROS
            </h1>
            <p className="font-display text-lg md:text-xl text-[#d1412e] tracking-wider mt-1">
              CHAINS OF TARTARUS
            </p>
            <p className="text-sm text-[#c2b7a5] mt-4 max-w-md leading-relaxed">
              Betrayed by Olympus and bound to living fire, Tharos rises from the ashes of Sparta
              to shatter the ancient Seals and overthrow the Colossus Guardians.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 max-w-xs">
            {savedGame && (
              <button
                onClick={onContinue}
                className="w-full py-3 px-5 rounded bg-[#991b1b] hover:bg-[#b91c1c] border border-amber-400/60 text-white font-display font-bold tracking-wider text-left transition-colors"
              >
                Continue — Realm {savedGame.currentLevel}
              </button>
            )}
            <button
              onClick={onNewGame}
              className="w-full py-3 px-5 rounded bg-[#23191e] hover:bg-[#36242b] border border-[#805e32] text-[#f5efe2] font-display font-bold tracking-wider text-left transition-colors"
            >
              New Game
            </button>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                onClick={onOpenSettings}
                className="py-2 px-3 rounded bg-[#161114] hover:bg-[#241c20] border border-[#4a3723] text-xs font-medium text-[#d6cbb8]"
              >
                Settings
              </button>
              <button
                onClick={onOpenControls}
                className="py-2 px-3 rounded bg-[#161114] hover:bg-[#241c20] border border-[#4a3723] text-xs font-medium text-[#d6cbb8]"
              >
                Controls
              </button>
              <button
                onClick={onOpenCredits}
                className="py-2 px-3 rounded bg-[#161114] hover:bg-[#241c20] border border-[#4a3723] text-xs font-medium text-[#d6cbb8]"
              >
                Credits
              </button>
            </div>
          </div>
        </div>

        {/* Right: 5 Mythic Realms Selector (Playable immediately or via progression) */}
        <div className="lg:col-span-6 bg-[#130e11]/92 border border-[#5e462a]/70 rounded-lg p-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#3a2d20]">
            <h2 className="font-display text-base font-bold text-[#f0c76e]">Five Realms of Olympus</h2>
            <span className="text-xs text-[#a89c8a]">Select Realm to Enter</span>
          </div>
          <div className="mt-3 space-y-2">
            {([1, 2, 3, 4, 5] as LevelId[]).map((lvl) => {
              const meta = LEVEL_METADATA[lvl];
              const unlocked = lvl <= highestLevel || lvl === 1;
              return (
                <button
                  key={lvl}
                  onClick={() => onSelectLevel(lvl)}
                  className="w-full flex items-center justify-between gap-3 p-3 rounded border text-left transition-colors bg-[#1a1418] hover:bg-[#291e23] border-[#3d2f21] hover:border-amber-500/60"
                >
                  <div>
                    <div className="text-sm font-semibold text-[#f3efe6]">
                      {lvl}. {meta.name}
                    </div>
                    <div className="text-xs text-[#a89c8a]">
                      Boss: {meta.bossName} ({meta.bossTitle})
                    </div>
                  </div>
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded whitespace-nowrap ${
                      unlocked
                        ? 'bg-[#3b2914] text-amber-200 border border-[#735228]'
                        : 'bg-[#211b1e] text-[#b5a795] border border-[#3a2d20]'
                    }`}
                  >
                    {unlocked ? 'Enter' : 'Trial Mode'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
