import React from 'react';
import { Flame, Shield, Sparkles, Sword, Zap } from 'lucide-react';
import { HUDState, MagicId, WeaponId } from '../game/types';

interface GameHUDProps {
  hud: HUDState;
  showTouchControls: boolean;
  onSelectWeapon: (w: WeaponId) => void;
  onSelectMagic: (m: MagicId) => void;
  onPauseClick: () => void;
  onEngageCamera: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  hud,
  showTouchControls,
  onSelectWeapon,
  onSelectMagic,
  onPauseClick,
  onEngageCamera,
}) => {
  if (hud.cutscene.active) return null;

  const hpPct = Math.max(0, Math.min(100, (hud.hp / hud.maxHp) * 100));
  const mpPct = Math.max(0, Math.min(100, (hud.magic / hud.maxMagic) * 100));
  const ragePct = Math.max(0, Math.min(100, (hud.rage / hud.maxRage) * 100));

  const weaponMeta: { id: WeaponId; key: string; label: string }[] = [
    { id: 'blades', key: '1', label: 'Fire Blades' },
    { id: 'hammer', key: '2', label: 'Hammer' },
    { id: 'spear', key: '3', label: 'Spear' },
  ];

  const magicMeta: { id: MagicId; label: string; icon: React.ReactNode }[] = [
    { id: 'fire', label: 'Fire', icon: <Flame className="w-3.5 h-3.5 text-orange-400" /> },
    { id: 'lightning', label: 'Bolt', icon: <Zap className="w-3.5 h-3.5 text-sky-400" /> },
    { id: 'shockwave', label: 'Quake', icon: <Sparkles className="w-3.5 h-3.5 text-amber-400" /> },
    { id: 'projectile', label: 'Volley', icon: <Sword className="w-3.5 h-3.5 text-cyan-300" /> },
  ];

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between">
      {/* Slow-Motion Dramatic Framing Bars */}
      {hud.slowMoActive && (
        <>
          <div className="fixed top-0 left-0 right-0 h-8 sm:h-11 bg-black z-30 transition-all duration-150" />
          <div className="fixed bottom-0 left-0 right-0 h-8 sm:h-11 bg-black z-30 transition-all duration-150" />
        </>
      )}

      {/* Floating Screen-Space Damage Numbers */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-20">
        {hud.floatingDamages.map((d) => {
          const color =
            d.type === 'heal'
              ? 'text-emerald-400'
              : d.type === 'parry'
                ? 'text-amber-300'
                : d.type === 'magic'
                  ? 'text-sky-300'
                  : d.type === 'heavy'
                    ? 'text-orange-400'
                    : 'text-[#f3efe6]';
          return (
            <div
              key={d.id}
              style={{ left: `${d.x}%`, top: `${d.y}%` }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 font-mono-num font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] ${color} ${
                d.crit ? 'text-xl sm:text-2xl' : 'text-sm sm:text-base'
              }`}
            >
              {d.type === 'parry' ? 'PARRY!' : d.type === 'heal' ? `+${d.amount}` : d.amount}
            </div>
          );
        })}
      </div>

      {/* TOP ROW: Responsive across Phone, Tablet & Desktop */}
      <div className="flex flex-wrap items-start justify-between px-3 sm:px-5 pt-3 sm:pt-4 gap-2 sm:gap-4">
        {/* Top-Left: Warrior Bars */}
        <div className="w-48 sm:w-64 md:w-72 bg-[#120e12]/90 border border-[#5e462a]/70 rounded-md p-2.5 sm:p-3 pointer-events-auto">
          <div className="flex items-center justify-between mb-1 text-[11px] sm:text-xs text-[#d6cbb8]">
            <span className="font-display font-bold tracking-wide text-[#f0c76e]">THAROS</span>
            <span className="font-mono-num text-[10px] sm:text-[11px]">
              {hud.hp}/{hud.maxHp} · MP {hud.magic}
            </span>
          </div>

          <div className="h-2 sm:h-2.5 w-full bg-[#1d181c] rounded-sm overflow-hidden mb-1 border border-black/60">
            <div
              className="h-full bg-gradient-to-r from-[#8b1111] to-[#e02828] transition-[width] duration-150"
              style={{ width: `${hpPct}%` }}
            />
          </div>

          <div className="h-1.5 sm:h-2 w-full bg-[#1d181c] rounded-sm overflow-hidden mb-1 border border-black/60">
            <div
              className="h-full bg-gradient-to-r from-[#0c4a6e] to-[#38bdf8] transition-[width] duration-150"
              style={{ width: `${mpPct}%` }}
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 bg-[#1d181c] rounded-sm overflow-hidden border border-black/60">
              <div
                className={`h-full transition-[width] duration-150 ${
                  hud.rageActive ? 'bg-amber-400' : 'bg-gradient-to-r from-amber-700 to-orange-500'
                }`}
                style={{ width: `${ragePct}%` }}
              />
            </div>
            <span className="font-mono-num text-[10px] text-orange-300">
              {hud.rageActive ? 'RAGE' : `${Math.round(ragePct)}%`}
            </span>
          </div>

          {hud.blocking && (
            <div className="mt-1 flex items-center gap-1 text-[10px] sm:text-[11px] text-amber-300 font-medium">
              <Shield className="w-3 h-3" />
              <span>Aegis Guard</span>
            </div>
          )}
        </div>

        {/* Top-Center: Level & Objective (hidden on ultra-narrow portrait, shown sm+) */}
        <div className="hidden md:block max-w-md text-center bg-[#120e12]/88 border border-[#5e462a]/60 rounded-md px-4 py-2">
          <div className="text-[11px] text-[#c9a35b] font-display tracking-wider">
            Realm {hud.levelId} · {hud.levelName}
          </div>
          <div className="text-xs text-[#f3efe6] mt-0.5 leading-snug">{hud.objective}</div>
        </div>

        {/* Top-Right: Combo, XP, Pause */}
        <div className="flex flex-col items-end gap-1.5 pointer-events-auto">
          <div className="flex items-center gap-2 bg-[#120e12]/90 border border-[#5e462a]/70 rounded-md px-2.5 sm:px-3 py-1.5 sm:py-2">
            <div className="text-right mr-1">
              <div className="font-mono-num text-[11px] sm:text-xs font-bold text-amber-300">{hud.xp} XP</div>
              <div className="text-[10px] text-[#b9ae9c]">Relics {hud.collectibles}</div>
            </div>
            {!showTouchControls && !hud.pointerLocked && (
              <button
                onClick={onEngageCamera}
                className="hidden sm:inline-flex px-2.5 py-1.5 text-xs font-medium bg-[#3b2914] hover:bg-[#52391c] text-amber-200 border border-[#805e32] rounded transition-colors whitespace-nowrap"
              >
                Lock Mouse
              </button>
            )}
            <button
              onClick={onPauseClick}
              className="px-2.5 sm:px-3 py-1.5 min-h-[36px] text-xs font-medium bg-[#221a21] hover:bg-[#322630] text-[#f3efe6] border border-[#5e462a]/80 rounded transition-colors whitespace-nowrap"
            >
              Pause
            </button>
          </div>

          {hud.comboCount > 1 && (
            <div className="bg-[#290b0b]/92 border border-red-700/70 rounded-md px-3 py-1 text-right">
              <div className="font-display font-extrabold text-base sm:text-xl text-amber-400 font-mono-num">
                {hud.comboCount} HIT{hud.comboCount >= 10 ? ' TITANIC!' : hud.comboCount >= 5 ? ' BRUTAL!' : ''}
              </div>
            </div>
          )}

          {hud.targetEnemy && !hud.boss && (
            <div className="w-40 sm:w-52 bg-[#120e12]/90 border border-red-900/70 rounded-md px-2.5 py-1.5">
              <div className="flex justify-between text-[10px] sm:text-[11px] text-[#e6dcd0] mb-1">
                <span className="truncate">{hud.targetEnemy.name}</span>
                <span className="font-mono-num">
                  {hud.targetEnemy.hp}/{hud.targetEnemy.maxHp}
                </span>
              </div>
              <div className="h-1.5 bg-[#1d181c] rounded-sm overflow-hidden">
                <div
                  className="h-full bg-red-600 transition-[width] duration-100"
                  style={{ width: `${(hud.targetEnemy.hp / hud.targetEnemy.maxHp) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Objective Strip */}
      <div className="md:hidden mx-auto mt-1 max-w-[90vw] bg-[#120e12]/82 border border-[#5e462a]/50 rounded px-3 py-1 text-center text-[11px] text-[#e5dccb] truncate">
        {hud.objective}
      </div>

      {/* CENTER FEEDBACK */}
      <div className="flex flex-col items-center justify-center gap-2 px-4 my-auto">
        {hud.bannerMessage && (
          <div className="bg-[#140d0f]/92 border border-[#b88635]/80 px-4 sm:px-6 py-2 rounded-md text-center shadow-lg">
            <p className="font-display text-sm sm:text-lg font-bold tracking-wide text-[#f7dca1]">
              {hud.bannerMessage}
            </p>
          </div>
        )}
        {hud.interactPrompt && (
          <div className="bg-[#141114]/92 border border-amber-500/80 px-3.5 py-1.5 rounded text-xs font-semibold text-amber-200">
            {hud.interactPrompt}
          </div>
        )}
      </div>

      {/* BOTTOM AREA */}
      <div className="flex flex-col items-center gap-1.5 pb-2 sm:pb-3 px-2 sm:px-4 z-30">
        {hud.boss && (
          <div className="w-full max-w-xl bg-[#140a0c]/92 border border-[#a83232]/80 rounded-md px-3 sm:px-4 py-2">
            <div className="flex items-center justify-between text-[11px] sm:text-xs mb-1 gap-2">
              <span className="font-display font-bold text-amber-300 tracking-wider truncate">
                {hud.boss.name}
                {hud.boss.staggered ? ' · STAGGERED!' : ''}
              </span>
              <span className="font-mono-num text-[#f3efe6] whitespace-nowrap">
                Ph.{hud.boss.phase} · {hud.boss.hp}/{hud.boss.maxHp}
              </span>
            </div>
            <div className="h-2.5 sm:h-3 w-full bg-[#1e1214] rounded-sm overflow-hidden border border-black">
              <div
                className="h-full bg-gradient-to-r from-[#991b1b] via-[#dc2626] to-[#f97316] transition-[width] duration-150"
                style={{ width: `${Math.max(0, (hud.boss.hp / hud.boss.maxHp) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Weapon & Magic Quick Switcher */}
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 bg-[#120e12]/90 border border-[#5e462a]/70 rounded-md px-2.5 py-1">
          <div className="flex items-center gap-1 pr-1.5 border-r border-[#5e462a]/50">
            {weaponMeta.map((w) => (
              <button
                key={w.id}
                onClick={() => onSelectWeapon(w.id)}
                className={`px-2 py-1 min-h-[32px] text-[11px] sm:text-xs rounded transition-colors whitespace-nowrap ${
                  hud.weapon === w.id
                    ? 'bg-[#8b1e1e] text-amber-100 border border-amber-400/70 font-semibold'
                    : 'bg-[#1c161b] text-[#c7bca9] hover:text-white border border-transparent'
                }`}
              >
                {showTouchControls ? w.label : `[${w.key}] ${w.label}`}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            {magicMeta.map((m) => (
              <button
                key={m.id}
                onClick={() => onSelectMagic(m.id)}
                className={`flex items-center gap-1 px-2 py-1 min-h-[32px] text-[11px] sm:text-xs rounded transition-colors whitespace-nowrap ${
                  hud.magicSkill === m.id
                    ? 'bg-[#16384d] text-sky-100 border border-sky-400/70 font-semibold'
                    : 'bg-[#1c161b] text-[#c7bca9] hover:text-white border border-transparent'
                }`}
              >
                {m.icon}
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {!showTouchControls && (
          <div className="hidden lg:block text-[11px] text-[#bfb5a4] bg-[#0e0b0e]/85 border border-[#453521]/50 rounded px-3 py-1 text-center">
            WASD Move · Mouse Camera · L-Click Light · R-Click Heavy · Space Jump · Shift Dodge · B Block/Parry · E Interact/Grab · Q Magic · F Cycle · R Rage
          </div>
        )}
      </div>
    </div>
  );
};
