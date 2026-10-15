import React from 'react';
import {
  ArrowLeft,
  HelpCircle,
  Moon,
  Settings as SettingsIcon,
  Sun,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useGame } from '../context/GameContext';

export const Navbar: React.FC = () => {
  const {
    view,
    returnToHome,
    theme,
    toggleTheme,
    soundEnabled,
    toggleSound,
    setHowToPlayOpen,
    setSettingsOpen,
    gameState,
  } = useGame();

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/85 dark:bg-[#0b0f19]/85 border-b border-slate-200 dark:border-slate-800 transition-colors duration-300 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Left: Brand or Back Button */}
        <div className="flex items-center gap-3">
          {view !== 'home' ? (
            <button
              onClick={returnToHome}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-game-surfaceLight dark:hover:bg-game-border transition active:scale-95 border border-slate-200 dark:border-slate-700/50"
              title="Return to Menu"
            >
              <ArrowLeft className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
              <span className="hidden sm:inline">Menu</span>
            </button>
          ) : null}

          <div
            onClick={returnToHome}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
          >
            {/* T! Logo Icon */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-fuchsia-500 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-cyan-500/25 group-hover:scale-105 transition-transform">
              T!
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition-colors">
                  THROW IT
                </span>
                {gameState && (
                  <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-cyan-50 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/30">
                    {gameState.mode === 'robo'
                      ? 'Vs Robo'
                      : gameState.mode === 'local'
                      ? `${gameState.players.length}P Local`
                      : 'Online'}
                  </span>
                )}
              </div>
              <p className="hidden sm:block text-[11px] text-slate-500 dark:text-slate-400 -mt-0.5 tracking-wider font-semibold">
                DROP SMART. BLOCK RIVALS.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Quick Controls */}
        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className={`p-2 rounded-xl transition active:scale-95 ${
              soundEnabled
                ? 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/10 hover:bg-cyan-100 dark:hover:bg-cyan-500/20 border border-cyan-200 dark:border-cyan-500/30'
                : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-game-surfaceLight/60 hover:bg-slate-200 dark:hover:bg-game-surfaceLight border border-slate-200 dark:border-slate-700/40'
            }`}
            title={soundEnabled ? 'Mute sound effects' : 'Unmute sound effects'}
            aria-label="Toggle sound"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-amber-500 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 border border-amber-200 dark:border-amber-500/30 transition active:scale-95 shadow-sm"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Rules / How to play */}
          <button
            onClick={() => setHowToPlayOpen(true)}
            className="p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-game-surfaceLight/60 hover:bg-slate-200 dark:hover:bg-game-surfaceLight border border-slate-200 dark:border-slate-700/40 transition active:scale-95"
            title="How to play"
            aria-label="How to play rules"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Settings */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-game-surfaceLight/60 hover:bg-slate-200 dark:hover:bg-game-surfaceLight border border-slate-200 dark:border-slate-700/40 transition active:scale-95"
            title="Settings"
            aria-label="Game settings"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
