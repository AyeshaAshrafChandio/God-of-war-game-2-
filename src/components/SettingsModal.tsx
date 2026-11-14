import React from 'react';
import { X } from 'lucide-react';
import { GameSettings, GraphicsQuality, TouchControlsMode } from '../game/types';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdate: (s: GameSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onUpdate, onClose }) => {
  const toggleFullscreen = () => {
    const next = !settings.fullscreen;
    if (next) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
    onUpdate({ ...settings, fullscreen: next });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 p-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-[#141013] border border-[#6e522e] rounded-lg p-5 sm:p-6 text-[#f3efe6]">
        <div className="flex items-center justify-between pb-3 border-b border-[#3a2d20]">
          <h2 className="font-display text-xl font-bold text-[#f0c76e]">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 rounded hover:bg-[#261d22] text-[#b9ae9c] hover:text-white"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-sm">
          <div>
            <label className="block text-xs text-[#bfb5a4] mb-1.5">Graphics Quality</label>
            <div className="grid grid-cols-3 gap-2">
              {(['low', 'medium', 'high'] as GraphicsQuality[]).map((q) => (
                <button
                  key={q}
                  onClick={() => onUpdate({ ...settings, graphicsQuality: q })}
                  className={`py-2 min-h-[40px] rounded text-xs font-medium capitalize border transition-colors ${
                    settings.graphicsQuality === q
                      ? 'bg-[#7d1d1d] border-amber-400 text-white'
                      : 'bg-[#1c161b] border-[#3d3023] text-[#bfb5a4] hover:text-white'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#bfb5a4] mb-1.5">Mobile Touch Controls</label>
            <div className="grid grid-cols-3 gap-2">
              {(['auto', 'on', 'off'] as TouchControlsMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => onUpdate({ ...settings, touchControls: mode })}
                  className={`py-2 min-h-[40px] rounded text-xs font-medium capitalize border transition-colors ${
                    settings.touchControls === mode
                      ? 'bg-[#7d1d1d] border-amber-400 text-white'
                      : 'bg-[#1c161b] border-[#3d3023] text-[#bfb5a4] hover:text-white'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs text-[#bfb5a4] mb-1">
              <span>Sound Effects Volume</span>
              <span className="font-mono-num">{Math.round(settings.soundVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.soundVolume}
              onChange={(e) => onUpdate({ ...settings, soundVolume: parseFloat(e.target.value) })}
              className="w-full accent-amber-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-[#bfb5a4] mb-1">
              <span>Music Volume</span>
              <span className="font-mono-num">{Math.round(settings.musicVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.musicVolume}
              onChange={(e) => onUpdate({ ...settings, musicVolume: parseFloat(e.target.value) })}
              className="w-full accent-amber-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-[#bfb5a4] mb-1">
              <span>Voice Acting Volume</span>
              <span className="font-mono-num">{Math.round((settings.voiceVolume ?? 0.9) * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.voiceVolume ?? 0.9}
              onChange={(e) => onUpdate({ ...settings, voiceVolume: parseFloat(e.target.value) })}
              className="w-full accent-amber-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-[#bfb5a4] mb-1">
              <span>Camera Sensitivity</span>
              <span className="font-mono-num">{settings.mouseSensitivity.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min={0.3}
              max={2.5}
              step={0.1}
              value={settings.mouseSensitivity}
              onChange={(e) => onUpdate({ ...settings, mouseSensitivity: parseFloat(e.target.value) })}
              className="w-full accent-amber-500"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-[#bfb5a4]">Fullscreen Mode</span>
            <button
              onClick={toggleFullscreen}
              className="px-4 py-2 min-h-[40px] text-xs font-medium rounded bg-[#231b21] hover:bg-[#332730] border border-[#6e522e] text-amber-200"
            >
              {settings.fullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            </button>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 min-h-[44px] rounded text-sm font-semibold bg-[#8b1e1e] hover:bg-[#a62626] text-white"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
