import React from 'react';
import {
  Eye,
  Moon,
  Settings as SettingsIcon,
  Sun,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import { useGame } from '../context/GameContext';

export const SettingsModal: React.FC = () => {
  const {
    settingsOpen,
    setSettingsOpen,
    theme,
    toggleTheme,
    soundEnabled,
    toggleSound,
    animationsEnabled,
    setAnimationsEnabled,
    accessibleSymbols,
    setAccessibleSymbols,
  } = useGame();

  if (!settingsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in select-none">
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-game-surface border-2 border-slate-200 dark:border-game-border p-6 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={() => setSettingsOpen(false)}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-game-surfaceLight border border-slate-200 dark:border-slate-700/60 transition active:scale-95"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-9 h-9 rounded-2xl bg-amber-50 dark:bg-amber-500/20 text-amber-500 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">Preferences & Settings</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Configure visual themes, sounds, and accessibility</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 text-sm">
          {/* Theme Option */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-game-surfaceLight border border-slate-200 dark:border-game-border flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? (
                <Moon className="w-5 h-5 text-indigo-400" />
              ) : (
                <Sun className="w-5 h-5 text-amber-500" />
              )}
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">Appearance Theme</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {theme === 'dark' ? 'Midnight Navy Dark Mode' : 'High Contrast Light Mode'}
                </p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-game-border border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-sm"
            >
              Switch to {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
          </div>

          {/* Sound FX Option */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-game-surfaceLight border border-slate-200 dark:border-game-border flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              {soundEnabled ? (
                <Volume2 className="w-5 h-5 text-cyan-500" />
              ) : (
                <VolumeX className="w-5 h-5 text-slate-400" />
              )}
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">Audio & Sound FX</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Synthesized coin drops and victory fanfare</p>
              </div>
            </div>
            <button
              onClick={toggleSound}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-sm ${
                soundEnabled
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-white dark:bg-game-border border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400'
              }`}
            >
              {soundEnabled ? 'Enabled' : 'Muted'}
            </button>
          </div>

          {/* Animations Option */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-game-surfaceLight border border-slate-200 dark:border-game-border flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-fuchsia-500" />
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">Coin Drop Animations</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Visual physics and winning pulse</p>
              </div>
            </div>
            <button
              onClick={() => setAnimationsEnabled(!animationsEnabled)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-sm ${
                animationsEnabled
                  ? 'bg-fuchsia-500 text-white font-bold'
                  : 'bg-white dark:bg-game-border border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400'
              }`}
            >
              {animationsEnabled ? 'Enabled' : 'Reduced'}
            </button>
          </div>

          {/* Accessible Symbols Option */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-game-surfaceLight border border-slate-200 dark:border-game-border flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-emerald-500" />
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">Accessible Coin Symbols</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Shapes (●, ▲, ★, ■) on coins for colorblind accessibility
                </p>
              </div>
            </div>
            <button
              onClick={() => setAccessibleSymbols(!accessibleSymbols)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-sm ${
                accessibleSymbols
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-white dark:bg-game-border border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400'
              }`}
            >
              {accessibleSymbols ? 'Active' : 'Off'}
            </button>
          </div>
        </div>

        <button
          onClick={() => setSettingsOpen(false)}
          className="mt-6 w-full py-3.5 rounded-2xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-bold text-sm transition shadow-md"
        >
          Save & Close
        </button>
      </div>
    </div>
  );
};
