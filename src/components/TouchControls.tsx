import React, { useRef, useState } from 'react';
import { Flame, Hand, Shield, Sparkles, Sword, Zap } from 'lucide-react';

interface TouchControlsProps {
  interactAvailable: boolean;
  onMove: (x: number, y: number) => void;
  onCameraOrbit: (dx: number, dy: number) => void;
  onAction: (
    action: 'light' | 'heavy' | 'jump' | 'dodge' | 'interact' | 'magic' | 'rage' | 'block_start' | 'block_end'
  ) => void;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  interactAvailable,
  onMove,
  onCameraOrbit,
  onAction,
}) => {
  const joyRef = useRef<HTMLDivElement | null>(null);
  const joyTouchId = useRef<number | null>(null);
  const camTouchId = useRef<number | null>(null);
  const camLastPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [knobOffset, setKnobOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const maxRadius = 44;

  const updateJoystick = (clientX: number, clientY: number) => {
    const el = joyRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }
    setKnobOffset({ x: dx, y: dy });
    // Screen Y down = negative forward
    onMove(dx / maxRadius, -dy / maxRadius);
  };

  const handleJoyTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (joyTouchId.current !== null) return;
    const t = e.changedTouches[0];
    joyTouchId.current = t.identifier;
    updateJoystick(t.clientX, t.clientY);
  };

  const handleJoyTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === joyTouchId.current) {
        updateJoystick(t.clientX, t.clientY);
      }
    }
  };

  const handleJoyTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joyTouchId.current) {
        joyTouchId.current = null;
        setKnobOffset({ x: 0, y: 0 });
        onMove(0, 0);
      }
    }
  };

  // Full-canvas touch-drag camera orbit behind buttons
  const handleCamTouchStart = (e: React.TouchEvent) => {
    if (camTouchId.current !== null) return;
    const t = e.changedTouches[0];
    camTouchId.current = t.identifier;
    camLastPos.current = { x: t.clientX, y: t.clientY };
  };

  const handleCamTouchMove = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === camTouchId.current) {
        const dx = t.clientX - camLastPos.current.x;
        const dy = t.clientY - camLastPos.current.y;
        camLastPos.current = { x: t.clientX, y: t.clientY };
        onCameraOrbit(dx, dy);
      }
    }
  };

  const handleCamTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === camTouchId.current) {
        camTouchId.current = null;
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-20 pointer-events-auto touch-none"
      onTouchStart={handleCamTouchStart}
      onTouchMove={handleCamTouchMove}
      onTouchEnd={handleCamTouchEnd}
      onTouchCancel={handleCamTouchEnd}
    >
      {/* Left Thumb: Virtual Analog Joystick */}
      <div
        ref={joyRef}
        onTouchStart={handleJoyTouchStart}
        onTouchMove={handleJoyTouchMove}
        onTouchEnd={handleJoyTouchEnd}
        onTouchCancel={handleJoyTouchEnd}
        className="fixed bottom-16 left-5 sm:left-8 w-28 h-28 rounded-full bg-[#120e12]/70 border-2 border-[#805e32]/75 flex items-center justify-center"
      >
        <div
          style={{ transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)` }}
          className="w-12 h-12 rounded-full bg-[#b88635]/85 border-2 border-amber-200/80 shadow-md"
        />
      </div>

      {/* Right Thumb: Combat & Parkour Cluster (>=44px touch hitboxes) */}
      <div
        className="fixed bottom-14 right-4 sm:right-7 flex flex-col items-end gap-2.5"
        onTouchStart={(e) => e.stopPropagation()}
      >
        {/* Top Row: Interact, Magic, Rage */}
        <div className="flex items-center gap-2">
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              onAction('interact');
            }}
            onClick={() => onAction('interact')}
            className={`min-w-[48px] min-h-[48px] px-2.5 rounded-full border flex items-center justify-center text-xs font-bold ${
              interactAvailable
                ? 'bg-amber-600 border-amber-200 text-white'
                : 'bg-[#1a1418]/80 border-[#6e522e]/70 text-[#d6cbb8]'
            }`}
            aria-label="Interact or Execute"
          >
            <Hand className="w-4 h-4 mr-1" />E
          </button>
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              onAction('magic');
            }}
            onClick={() => onAction('magic')}
            className="min-w-[48px] min-h-[48px] rounded-full bg-[#16384d]/85 border border-sky-400/75 text-sky-100 flex items-center justify-center"
            aria-label="Cast Magic"
          >
            <Zap className="w-5 h-5" />
          </button>
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              onAction('rage');
            }}
            onClick={() => onAction('rage')}
            className="min-w-[48px] min-h-[48px] rounded-full bg-[#5c1616]/85 border border-orange-400/75 text-orange-200 flex items-center justify-center"
            aria-label="Unleash Rage"
          >
            <Sparkles className="w-5 h-5" />
          </button>
        </div>

        {/* Middle Row: Block, Dodge, Jump */}
        <div className="flex items-center gap-2">
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              onAction('block_start');
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              onAction('block_end');
            }}
            className="min-w-[48px] min-h-[48px] rounded-full bg-[#241b16]/85 border border-amber-500/70 text-amber-200 flex items-center justify-center"
            aria-label="Block or Parry"
          >
            <Shield className="w-5 h-5" />
          </button>
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              onAction('dodge');
            }}
            onClick={() => onAction('dodge')}
            className="min-w-[48px] min-h-[48px] px-3 rounded-full bg-[#1f191d]/85 border border-[#805e32] text-xs font-bold text-[#f3efe6]"
          >
            Roll
          </button>
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              onAction('jump');
            }}
            onClick={() => onAction('jump')}
            className="min-w-[48px] min-h-[48px] px-3 rounded-full bg-[#1f191d]/85 border border-[#805e32] text-xs font-bold text-[#f3efe6]"
          >
            Jump
          </button>
        </div>

        {/* Primary Attacks: Heavy & Light */}
        <div className="flex items-center gap-3">
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              onAction('heavy');
            }}
            onClick={() => onAction('heavy')}
            className="w-14 h-14 rounded-full bg-[#7c2d12]/90 border-2 border-orange-400 text-orange-100 flex items-center justify-center shadow-lg"
            aria-label="Heavy Attack"
          >
            <Flame className="w-6 h-6" />
          </button>
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              onAction('light');
            }}
            onClick={() => onAction('light')}
            className="w-16 h-16 rounded-full bg-[#991b1b]/92 border-2 border-amber-300 text-amber-50 flex items-center justify-center shadow-lg"
            aria-label="Light Attack"
          >
            <Sword className="w-7 h-7" />
          </button>
        </div>
      </div>
    </div>
  );
};
