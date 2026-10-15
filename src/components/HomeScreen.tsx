import React from 'react';
import {
  Bot,
  Globe,
  HelpCircle,
  Play,
  Settings,
  Sparkles,
  Users,
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import { BoardPreview } from './BoardPreview';

export const HomeScreen: React.FC = () => {
  const { setView, setSelectedMode, setHowToPlayOpen, setSettingsOpen } = useGame();

  const handleSelectMode = (mode: 'robo' | 'local' | 'online') => {
    setSelectedMode(mode);
    if (mode === 'online') {
      setView('online_lobby');
    } else {
      setView('setup_wizard');
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 py-8 max-w-6xl mx-auto w-full select-none">
      {/* Hero Header */}
      <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400 text-xs font-bold uppercase tracking-wider mb-4 shadow-sm animate-fade-in">
          <Sparkles className="w-3.5 h-3.5" />
          Classic 4-in-a-Row Reimagined for 2–7 Players
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight mb-3">
          <span className="bg-gradient-to-r from-cyan-500 via-sky-400 to-fuchsia-500 bg-clip-text text-transparent">
            THROW IT
          </span>
        </h1>

        <p className="text-base sm:text-xl font-semibold text-slate-600 dark:text-slate-300 max-w-md mx-auto">
          Drop smart. Block rivals. Own the board.
        </p>
      </div>

      {/* Main Grid: Modes on Left, Preview on Right */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Side: Game Mode Selection Cards */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Mode 1: Play vs Robo */}
          <div
            onClick={() => handleSelectMode('robo')}
            className="group relative overflow-hidden p-5 rounded-3xl bg-white dark:bg-game-surface border border-slate-200 dark:border-game-border hover:border-cyan-400 dark:hover:border-cyan-500/60 shadow-md hover:shadow-cyan-500/15 cursor-pointer transition-all duration-200 active:scale-[0.99]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-500 dark:text-cyan-400 group-hover:scale-105 group-hover:bg-cyan-500/25 transition">
                  <Bot className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
                      Play vs Robo
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-cyan-50 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/30">
                      3 Levels
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                    Practice solo against Easy, Medium, or Hard minimax AI opponents.
                  </p>
                </div>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-400 group-hover:text-cyan-500 group-hover:bg-cyan-50 dark:group-hover:bg-cyan-500/20 transition">
                <Play className="w-5 h-5 fill-current ml-0.5" />
              </div>
            </div>
          </div>

          {/* Mode 2: Pass & Play */}
          <div
            onClick={() => handleSelectMode('local')}
            className="group relative overflow-hidden p-5 rounded-3xl bg-white dark:bg-game-surface border border-slate-200 dark:border-game-border hover:border-fuchsia-400 dark:hover:border-fuchsia-500/60 shadow-md hover:shadow-fuchsia-500/15 cursor-pointer transition-all duration-200 active:scale-[0.99]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-fuchsia-500/15 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-500 dark:text-fuchsia-400 group-hover:scale-105 group-hover:bg-fuchsia-500/25 transition">
                  <Users className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-fuchsia-600 dark:group-hover:text-fuchsia-300 transition-colors">
                      Pass & Play
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-fuchsia-50 dark:bg-fuchsia-500/20 text-fuchsia-600 dark:text-fuchsia-300 border border-fuchsia-200 dark:border-fuchsia-500/30">
                      2–7 Players
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                    Share one device with friends. Custom names, colors, and privacy handoff.
                  </p>
                </div>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-400 group-hover:text-fuchsia-500 group-hover:bg-fuchsia-50 dark:group-hover:bg-fuchsia-500/20 transition">
                <Play className="w-5 h-5 fill-current ml-0.5" />
              </div>
            </div>
          </div>

          {/* Mode 3: Online Multiplayer */}
          <div
            onClick={() => handleSelectMode('online')}
            className="group relative overflow-hidden p-5 rounded-3xl bg-white dark:bg-game-surface border border-slate-200 dark:border-game-border hover:border-emerald-400 dark:hover:border-emerald-500/60 shadow-md hover:shadow-emerald-500/15 cursor-pointer transition-all duration-200 active:scale-[0.99]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 dark:text-emerald-400 group-hover:scale-105 group-hover:bg-emerald-500/25 transition">
                  <Globe className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors">
                      Online Multiplayer
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                      Rooms + Voice/Video
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                    Create a private room, send invite links, sync turns & talk live.
                  </p>
                </div>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-400 group-hover:text-emerald-500 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-500/20 transition">
                <Play className="w-5 h-5 fill-current ml-0.5" />
              </div>
            </div>
          </div>

          {/* Quick utility buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => setHowToPlayOpen(true)}
              className="flex-1 py-3 px-4 rounded-2xl bg-white dark:bg-game-surface border border-slate-200 dark:border-game-border hover:border-slate-400 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-sm"
            >
              <HelpCircle className="w-4 h-4 text-cyan-500" />
              Rules & Strategy
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex-1 py-3 px-4 rounded-2xl bg-white dark:bg-game-surface border border-slate-200 dark:border-game-border hover:border-slate-400 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-sm"
            >
              <Settings className="w-4 h-4 text-amber-500" />
              Settings & Themes
            </button>
          </div>
        </div>

        {/* Right Side: Animated Board Showcase */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center">
          <BoardPreview />
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-3 font-medium">
            Responsive on phones, tablets, and desktop browsers.
          </p>
        </div>
      </div>
    </div>
  );
};
