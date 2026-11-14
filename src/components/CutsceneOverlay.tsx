import React from 'react';
import { SkipForward } from 'lucide-react';
import { CutsceneHUDInfo } from '../game/types';

interface CutsceneOverlayProps {
  cutscene: CutsceneHUDInfo;
  onSkip: () => void;
}

export const CutsceneOverlay: React.FC<CutsceneOverlayProps> = ({ cutscene, onSkip }) => {
  if (!cutscene.active) return null;

  const speakerColor =
    cutscene.subtitle?.role === 'hero'
      ? 'text-amber-300'
      : cutscene.subtitle?.role === 'boss'
        ? 'text-red-400'
        : 'text-sky-300';

  return (
    <div className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between">
      {/* Top Cinema Letterbox Bar */}
      <div className="w-full bg-black h-12 sm:h-16 md:h-20 flex items-center justify-between px-4 sm:px-8 border-b border-[#3a2a1a]/60">
        <span className="font-display text-xs sm:text-sm tracking-[0.18em] uppercase text-[#c9a35b] truncate">
          {cutscene.title}
        </span>
        {cutscene.canSkip && (
          <button
            onClick={onSkip}
            className="pointer-events-auto flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded bg-[#23191e] hover:bg-[#38242b] border border-[#805e32] text-xs font-semibold text-amber-200 transition-colors whitespace-nowrap"
          >
            <span>Skip [Space]</span>
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Bottom Cinema Letterbox Bar with Synchronized Subtitles */}
      <div className="w-full bg-black min-h-[5.5rem] sm:min-h-[6.5rem] md:min-h-[7.5rem] flex items-center justify-center px-4 sm:px-10 py-3 border-t border-[#3a2a1a]/60">
        {cutscene.subtitle && (
          <div className="max-w-3xl text-center">
            <div className={`font-display text-xs sm:text-sm font-bold tracking-wider uppercase mb-1 ${speakerColor}`}>
              {cutscene.subtitle.speaker}
            </div>
            <p className="text-sm sm:text-base md:text-lg text-[#f5efe2] leading-snug font-medium">
              “{cutscene.subtitle.text}”
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
