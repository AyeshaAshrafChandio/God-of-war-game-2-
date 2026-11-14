import React from 'react';
import { HUDState } from '../game/types';

interface VictoryDeathOverlayProps {
  hud: HUDState;
  onRespawn: () => void;
  onNextLevel: () => void;
  onMainMenu: () => void;
}

export const VictoryDeathOverlay: React.FC<VictoryDeathOverlayProps> = ({
  hud,
  onRespawn,
  onNextLevel,
  onMainMenu,
}) => {
  if (!hud.isDead && !hud.levelComplete && !hud.gameComplete) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/82 p-4">
      <div className="w-full max-w-md bg-[#140e10] border border-[#805e32] rounded-lg p-7 text-center text-[#f3efe6]">
        {hud.isDead && (
          <>
            <h2 className="font-display text-3xl font-extrabold text-red-500 tracking-wider">
              FALLEN IN BATTLE
            </h2>
            <p className="text-sm text-[#c2b7a5] mt-2">
              The Chains of Tartarus pull you back from the abyss. Rise again at your last checkpoint.
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                onClick={onRespawn}
                className="w-full py-2.5 px-4 rounded bg-[#991b1b] hover:bg-[#b91c1c] font-semibold text-white"
              >
                Respawn at Checkpoint
              </button>
              <button
                onClick={onMainMenu}
                className="w-full py-2 px-4 rounded bg-[#1f171b] hover:bg-[#2c2126] border border-[#4a3723] text-sm text-[#d6cbb8]"
              >
                Return to Main Menu
              </button>
            </div>
          </>
        )}

        {hud.levelComplete && (
          <>
            <p className="text-xs uppercase tracking-[0.2em] text-amber-400">Realm Conquered</p>
            <h2 className="font-display text-3xl font-extrabold text-[#f5efe2] mt-1">
              VICTORY IN {hud.levelName.toUpperCase()}
            </h2>
            <p className="text-sm text-[#c2b7a5] mt-2">
              Your total Experience: <span className="font-mono-num text-amber-300 font-bold">{hud.xp} XP</span> · Relics:{' '}
              <span className="font-mono-num text-amber-300 font-bold">{hud.collectibles}</span>
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                onClick={onNextLevel}
                className="w-full py-3 px-4 rounded bg-[#991b1b] hover:bg-[#b91c1c] font-display font-bold tracking-wider text-white"
              >
                Advance to Realm {hud.levelId + 1}
              </button>
              <button
                onClick={onMainMenu}
                className="w-full py-2 px-4 rounded bg-[#1f171b] hover:bg-[#2c2126] border border-[#4a3723] text-sm text-[#d6cbb8]"
              >
                Return to Main Menu
              </button>
            </div>
          </>
        )}

        {hud.gameComplete && (
          <>
            <p className="text-xs uppercase tracking-[0.2em] text-amber-400">Olympus Shattered</p>
            <h2 className="font-display text-3xl font-extrabold text-[#f0c76e] mt-1">
              SOVEREIGN OF TARTARUS
            </h2>
            <p className="text-sm text-[#c2b7a5] mt-3">
              All five realms and their colossal guardians have fallen before the Chains of Tartarus.
              Tharos stands unbroken.
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                onClick={onMainMenu}
                className="w-full py-3 px-4 rounded bg-[#991b1b] hover:bg-[#b91c1c] font-display font-bold tracking-wider text-white"
              >
                Return to Main Menu
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
