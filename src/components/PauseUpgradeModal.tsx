import React from 'react';
import { ArrowUpCircle, Save } from 'lucide-react';
import { HUDState, SaveData } from '../game/types';

interface PauseUpgradeModalProps {
  hud: HUDState;
  onResume: () => void;
  onUpgrade: (key: keyof SaveData['upgrades']) => void;
  onSaveGame: () => void;
  onOpenSettings: () => void;
  onOpenControls: () => void;
  onQuitToMenu: () => void;
  saveNotice: string | null;
}

export const PauseUpgradeModal: React.FC<PauseUpgradeModalProps> = ({
  hud,
  onResume,
  onUpgrade,
  onSaveGame,
  onOpenSettings,
  onOpenControls,
  onQuitToMenu,
  saveNotice,
}) => {
  const upgradeItems: { key: keyof SaveData['upgrades']; label: string; desc: string }[] = [
    { key: 'blades', label: 'Blades of Tartarus', desc: '+25% Dual Fire Blade damage' },
    { key: 'hammer', label: 'Titanbreaker Hammer', desc: '+25% Heavy Slam & Cleave damage' },
    { key: 'spear', label: 'Aetheris Lightning Spear', desc: '+25% Thrust & Shock damage' },
    { key: 'health', label: 'Spartan Vitality', desc: '+35 Max Health & instant +45 HP' },
    { key: 'magic', label: 'Olympian Conduit', desc: '+25 Max Magic & +25% Spell power' },
    { key: 'rage', label: 'Tartarus Wrath', desc: '+20 Max Rage Capacity' },
  ];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/78 p-4">
      <div className="w-full max-w-3xl bg-[#141013] border border-[#6e522e] rounded-lg p-6 text-[#f3efe6] grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left: Pause Navigation */}
        <div className="md:col-span-5 flex flex-col justify-between border-b md:border-b-0 md:border-r border-[#3a2d20] pb-4 md:pb-0 md:pr-5">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#f0c76e]">Sanctuary Paused</h2>
            <p className="text-xs text-[#b9ae9c] mt-1">
              Realm {hud.levelId}: {hud.levelName}
            </p>
            <div className="mt-5 space-y-2">
              <button
                onClick={onResume}
                className="w-full py-2.5 px-4 rounded text-sm font-semibold bg-[#8b1e1e] hover:bg-[#a62626] text-white text-left"
              >
                Resume Battle
              </button>
              <button
                onClick={onSaveGame}
                className="w-full py-2 px-4 rounded text-sm font-medium bg-[#1e181d] hover:bg-[#2c232b] border border-[#4a3723] text-amber-200 flex items-center justify-between"
              >
                <span>Save Progress</span>
                <Save className="w-4 h-4" />
              </button>
              <button
                onClick={onOpenSettings}
                className="w-full py-2 px-4 rounded text-sm font-medium bg-[#1e181d] hover:bg-[#2c232b] border border-[#4a3723] text-[#e5dccb] text-left"
              >
                Settings
              </button>
              <button
                onClick={onOpenControls}
                className="w-full py-2 px-4 rounded text-sm font-medium bg-[#1e181d] hover:bg-[#2c232b] border border-[#4a3723] text-[#e5dccb] text-left"
              >
                Controls
              </button>
              <button
                onClick={onQuitToMenu}
                className="w-full py-2 px-4 rounded text-sm font-medium bg-[#181216] hover:bg-[#291a1f] border border-[#3a2424] text-red-300 text-left"
              >
                Return to Main Menu
              </button>
            </div>
            {saveNotice && <p className="mt-3 text-xs text-emerald-400">{saveNotice}</p>}
          </div>
          <div className="mt-4 pt-3 border-t border-[#2a2018] text-xs text-[#a69a87]">
            Available Experience: <span className="font-mono-num font-bold text-amber-300">{hud.xp} XP</span>
          </div>
        </div>

        {/* Right: Upgrade Forge */}
        <div className="md:col-span-7">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-lg font-bold text-[#f3efe6]">Forge Upgrades</h3>
            <span className="font-mono-num text-xs text-amber-300 font-bold">{hud.xp} XP Available</span>
          </div>
          <div className="space-y-2.5 max-h-[58vh] overflow-y-auto pr-1">
            {upgradeItems.map((u) => {
              const lvl = hud.upgrades[u.key];
              const maxed = lvl >= 5;
              const cost = lvl * 120;
              const canBuy = !maxed && hud.xp >= cost;
              return (
                <div
                  key={u.key}
                  className="flex items-center justify-between gap-3 bg-[#1c161b] border border-[#3a2d20] rounded-md p-3"
                >
                  <div>
                    <div className="text-sm font-semibold text-[#f3efe6]">
                      {u.label} <span className="text-xs text-amber-400 font-mono-num">Lv.{lvl}/5</span>
                    </div>
                    <div className="text-xs text-[#a89c8a]">{u.desc}</div>
                  </div>
                  <button
                    disabled={!canBuy}
                    onClick={() => onUpgrade(u.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap ${
                      maxed
                        ? 'bg-[#262026] text-[#8a7f70] cursor-default'
                        : canBuy
                          ? 'bg-[#b45309] hover:bg-[#d97706] text-white'
                          : 'bg-[#211b1e] text-[#6e6357] cursor-not-allowed'
                    }`}
                  >
                    <ArrowUpCircle className="w-3.5 h-3.5" />
                    <span>{maxed ? 'MAX' : `${cost} XP`}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
