import React from 'react';
import { X } from 'lucide-react';

interface ControlsCreditsModalProps {
  mode: 'controls' | 'credits';
  onClose: () => void;
}

export const ControlsCreditsModal: React.FC<ControlsCreditsModalProps> = ({ mode, onClose }) => {
  const bindings = [
    ['W / A / S / D', 'Move Warrior (Camera-Relative)'],
    ['Mouse', 'Rotate Camera (Click Lock Mouse or Hold Left Drag)'],
    ['Left Click', 'Light Attack (5-Hit & 10-Hit Combo Chain)'],
    ['Right Click', 'Heavy Attack / Ground Slam / Cyclone'],
    ['Space', 'Jump & Double Jump'],
    ['Shift', 'Dodge Roll (Invulnerability Frames)'],
    ['B or Middle Mouse', 'Aegis Shield Block & Timed Counter-Parry'],
    ['E', 'Interact, Solve Puzzles, Climb Ladders, or Execute Staggered Enemy'],
    ['Q', 'Cast Active Magic Ability'],
    ['F or 4', 'Cycle Magic (Fire Blast / Sky Bolt / Shockwave / Aether Volley)'],
    ['R', 'Unleash Tartarus Rage Mode'],
    ['1 / 2 / 3', 'Equip Fire Blades / Titan Hammer / Lightning Spear'],
    ['ESC', 'Pause Menu & Weapon Upgrades'],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-lg bg-[#141013] border border-[#6e522e] rounded-lg p-6 text-[#f3efe6]">
        <div className="flex items-center justify-between pb-3 border-b border-[#3a2d20]">
          <h2 className="font-display text-xl font-bold text-[#f0c76e]">
            {mode === 'controls' ? 'Combat & Exploration Controls' : 'Credits'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-[#261d22] text-[#b9ae9c] hover:text-white"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {mode === 'controls' ? (
          <div className="mt-4 space-y-2 max-h-[65vh] overflow-y-auto pr-1">
            {bindings.map(([k, desc]) => (
              <div
                key={k}
                className="flex items-center justify-between gap-4 py-1.5 border-b border-[#2a2018] text-xs"
              >
                <span className="font-mono-num font-semibold text-amber-300 whitespace-nowrap">{k}</span>
                <span className="text-[#d6cbb8] text-right">{desc}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 space-y-3 text-sm text-[#d6cbb8] leading-relaxed">
            <p className="font-display text-base text-[#f0c76e]">Tharos: Chains of Tartarus</p>
            <p>
              An original 3D Greek mythology hack-and-slash action-adventure forged with Three.js,
              WebGL PBR rendering, articulated procedural warriors and colossal bosses, and real-time
              Web Audio synthesis.
            </p>
            <p className="text-xs text-[#9c907f]">
              Five realms: Temple of the Fallen Gods · Ruins of Sparta · Forgotten Underground City ·
              Mountain of Titans · Ancient Temple of Fire.
            </p>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded text-sm font-semibold bg-[#8b1e1e] hover:bg-[#a62626] text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
