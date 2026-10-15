import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  ChevronRight,
  RotateCcw,
  X,
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import { sound } from '../utils/audio';

export const HowToPlayModal: React.FC = () => {
  const { howToPlayOpen, setHowToPlayOpen } = useGame();
  const [activeTab, setActiveTab] = useState<'rules' | 'interactive' | 'tactics' | 'about'>('rules');

  // Interactive Mini Board inside the instructions
  const miniRows = 5;
  const miniCols = 5;
  const [demoBoard, setDemoBoard] = useState<(string | null)[][]>(() =>
    Array.from({ length: miniRows }, () => Array(miniCols).fill(null))
  );
  const [demoTurn, setDemoTurn] = useState<'cyan' | 'fuchsia'>('cyan');
  const [demoWin, setDemoWin] = useState<string | null>(null);

  if (!howToPlayOpen) return null;

  const handleMiniDrop = (col: number) => {
    if (demoWin) return;

    // Check if column is full
    if (demoBoard[0][col] !== null) return;

    // Drop to lowest available row
    let targetRow = -1;
    for (let r = miniRows - 1; r >= 0; r--) {
      if (demoBoard[r][col] === null) {
        targetRow = r;
        break;
      }
    }
    if (targetRow === -1) return;

    const newBoard = demoBoard.map((row) => [...row]);
    const currentColor = demoTurn === 'cyan' ? '#06b6d4' : '#d946ef';
    newBoard[targetRow][col] = currentColor;
    sound.playCoinDrop();

    // Check 4-in-a-row horizontally, vertically, or diagonally
    const checkLine = (r: number, c: number, dr: number, dc: number) => {
      let count = 0;
      for (let i = -3; i <= 3; i++) {
        const nr = r + i * dr;
        const nc = c + i * dc;
        if (nr >= 0 && nr < miniRows && nc >= 0 && nc < miniCols && newBoard[nr][nc] === currentColor) {
          count++;
          if (count >= 4) return true;
        } else {
          count = 0;
        }
      }
      return false;
    };

    const isWin =
      checkLine(targetRow, col, 0, 1) ||
      checkLine(targetRow, col, 1, 0) ||
      checkLine(targetRow, col, 1, 1) ||
      checkLine(targetRow, col, -1, 1);

    if (isWin) {
      setDemoWin(demoTurn === 'cyan' ? 'Cyan Player' : 'Fuchsia Player');
      sound.playVictory();
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    } else {
      setDemoTurn(demoTurn === 'cyan' ? 'fuchsia' : 'cyan');
    }

    setDemoBoard(newBoard);
  };

  const resetMiniDemo = () => {
    setDemoBoard(Array.from({ length: miniRows }, () => Array(miniCols).fill(null)));
    setDemoTurn('cyan');
    setDemoWin(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-game-surface border-2 border-slate-200 dark:border-game-border p-5 sm:p-7 shadow-2xl relative max-h-[92vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={() => setHowToPlayOpen(false)}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-game-surfaceLight border border-slate-200 dark:border-slate-700/60 transition active:scale-95"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-sky-400 to-fuchsia-500 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-cyan-500/25">
            T!
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>Game Guide & About</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/30">
                v2.0
              </span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Interactive rules, master tactics & game specifications.
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-game-surfaceLight rounded-2xl mb-4 border border-slate-200 dark:border-game-border">
          <button
            onClick={() => setActiveTab('rules')}
            className={`py-2 px-1 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition ${
              activeTab === 'rules'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>📜</span>
            <span className="hidden sm:inline">Rules</span>
          </button>

          <button
            onClick={() => setActiveTab('interactive')}
            className={`py-2 px-1 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition ${
              activeTab === 'interactive'
                ? 'bg-fuchsia-500 text-white shadow-md font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>🕹️</span>
            <span>Try Demo</span>
          </button>

          <button
            onClick={() => setActiveTab('tactics')}
            className={`py-2 px-1 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition ${
              activeTab === 'tactics'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>🧠</span>
            <span className="hidden sm:inline">Tactics</span>
          </button>

          <button
            onClick={() => setActiveTab('about')}
            className={`py-2 px-1 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition ${
              activeTab === 'about'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>ℹ️</span>
            <span className="hidden sm:inline">About</span>
          </button>
        </div>

        {/* Tab Content Area (Scrollable) */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 text-xs sm:text-sm">
          {/* TAB 1: RULES */}
          {activeTab === 'rules' && (
            <div className="flex flex-col gap-3">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-500/10 via-sky-500/5 to-transparent border border-cyan-500/30 flex items-start gap-3">
                <span className="text-2xl">🎯</span>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white mb-1">
                    The Winning Objective: Connect 4
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-xs">
                    Drop your colored coins into columns. The first player to connect <strong>four (4) of their own coins</strong> in an unbroken straight line wins the match!
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-game-surfaceLight border border-slate-200 dark:border-game-border flex items-start gap-2.5">
                  <span className="text-xl">↕️</span>
                  <div>
                    <h5 className="font-bold text-slate-900 dark:text-white text-xs mb-0.5">Vertical Line</h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Stack 4 coins directly on top of each other in the same column.</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-game-surfaceLight border border-slate-200 dark:border-game-border flex items-start gap-2.5">
                  <span className="text-xl">↔️</span>
                  <div>
                    <h5 className="font-bold text-slate-900 dark:text-white text-xs mb-0.5">Horizontal Line</h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Connect 4 coins across neighboring columns on the same row.</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-game-surfaceLight border border-slate-200 dark:border-game-border flex items-start gap-2.5">
                  <span className="text-xl">↗️</span>
                  <div>
                    <h5 className="font-bold text-slate-900 dark:text-white text-xs mb-0.5">Rising Diagonal</h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Connect 4 coins ascending from bottom-left up to top-right.</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-game-surfaceLight border border-slate-200 dark:border-game-border flex items-start gap-2.5">
                  <span className="text-xl">↘️</span>
                  <div>
                    <h5 className="font-bold text-slate-900 dark:text-white text-xs mb-0.5">Falling Diagonal</h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Connect 4 coins descending from top-left down to bottom-right.</p>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/30 flex items-start gap-3">
                <span className="text-2xl">👥</span>
                <div>
                  <h4 className="font-bold text-fuchsia-700 dark:text-fuchsia-300 text-xs mb-1">
                    Multiplayer Chaos: 2 to 7 Players!
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-xs">
                    In matches with 3+ players, turns rotate sequentially clockwise. You must watch multiple opponents at once and coordinate blocks so no single player connects 4!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INTERACTIVE DEMO BOARD */}
          {activeTab === 'interactive' && (
            <div className="flex flex-col items-center gap-3">
              <div className="text-center">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center justify-center gap-1">
                  <span>Interactive Playground: Tap any column to drop a coin!</span>
                </span>
                <div className="mt-1 flex items-center justify-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white shadow-sm"
                      style={{ backgroundColor: demoTurn === 'cyan' ? '#06b6d4' : '#d946ef' }}
                    />
                    <span className="text-slate-800 dark:text-slate-200">
                      {demoWin ? demoWin + ' Won!' : `Current Turn: ${demoTurn.toUpperCase()}`}
                    </span>
                  </div>
                  <button
                    onClick={resetMiniDemo}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-game-surfaceLight dark:hover:bg-game-border text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700/60"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset
                  </button>
                </div>
              </div>

              {/* Mini 5x5 Board Rack */}
              <div className="p-3 rounded-2xl bg-[#141b34] dark:bg-[#0c1224] border-2 border-[#22305c] shadow-xl w-64 max-w-full">
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: miniCols }).map((_, c) => (
                    <div
                      key={`demo-col-${c}`}
                      onClick={() => handleMiniDrop(c)}
                      className="flex flex-col gap-2 cursor-pointer p-1 rounded-lg hover:bg-white/10 transition"
                      title={`Drop in column ${c + 1}`}
                    >
                      {Array.from({ length: miniRows }).map((_, r) => {
                        const cellColor = demoBoard[r][c];
                        return (
                          <div
                            key={`demo-cell-${r}-${c}`}
                            className="aspect-square rounded-full bg-[#0a0d17] border border-blue-900/60 p-0.5 flex items-center justify-center relative overflow-hidden board-cell-hole"
                          >
                            {cellColor && (
                              <div
                                className="w-full h-full rounded-full shadow-md relative animate-coin-drop"
                                style={{ backgroundColor: cellColor }}
                              >
                                <div className="absolute inset-0 rounded-full coin-gloss" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {demoWin && (
                <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold text-center animate-bounce">
                  🎉 Fantastic! 4-in-a-Row achieved! You have mastered coin dropping!
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PRO TACTICS */}
          {activeTab === 'tactics' && (
            <div className="flex flex-col gap-2.5">
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                <span className="text-2xl">🔱</span>
                <div>
                  <h4 className="font-bold text-amber-800 dark:text-amber-300 text-xs mb-0.5">
                    1. The Fork (Double Win Trap)
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-xs">
                    Create two simultaneous winning threats at once! Your opponent can only block one column, guaranteeing your victory on the next turn.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-start gap-3">
                <span className="text-2xl">🏰</span>
                <div>
                  <h4 className="font-bold text-cyan-800 dark:text-cyan-300 text-xs mb-0.5">
                    2. Center Column Domination
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-xs">
                    The central column is the most powerful column on the board because it participates in the highest number of possible horizontal, vertical, and diagonal four-in-a-row connections.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3">
                <span className="text-2xl">🛡️</span>
                <div>
                  <h4 className="font-bold text-rose-800 dark:text-rose-300 text-xs mb-0.5">
                    3. Never Gift a Winning Slot
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-xs">
                    Be careful when dropping coins below an open slot! If your opponent needs that slot to win, dropping underneath will let them claim victory right above you.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-start gap-3">
                <span className="text-2xl">🪤</span>
                <div>
                  <h4 className="font-bold text-purple-800 dark:text-purple-300 text-xs mb-0.5">
                    4. Sneaky Diagonals
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-xs">
                    Over 65% of surprise victories occur diagonally. Always scan the diagonal angles before taking your turn!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ABOUT THROW IT */}
          {activeTab === 'about' && (
            <div className="flex flex-col gap-3">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-game-surfaceLight border border-slate-200 dark:border-game-border flex flex-col gap-2">
                <div className="flex items-center gap-2 font-black text-slate-900 dark:text-white">
                  <span className="text-lg">🔴</span>
                  <span>THROW IT: Drop smart. Block rivals. Own the board.</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                  Throw It is a modern casual strategy web game engineered for Google Antigravity. It re-envisions the timeless four-in-a-row genre with multi-rival dynamics (2 to 7 players), customizable board grids, and real-time multiplayer with integrated voice and video calls.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-game-surfaceLight border border-slate-200 dark:border-game-border">
                  <span className="font-bold text-slate-900 dark:text-white block mb-0.5">⌨️ Controls</span>
                  <span className="text-slate-500 dark:text-slate-400">Mouse Click, Touch Screen, or Left/Right Arrow keys + Enter</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-game-surfaceLight border border-slate-200 dark:border-game-border">
                  <span className="font-bold text-slate-900 dark:text-white block mb-0.5">🤖 Robot AI</span>
                  <span className="text-slate-500 dark:text-slate-400">Easy, Medium (Threat Blocker), Hard (Minimax Lookahead)</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-game-surfaceLight border border-slate-200 dark:border-game-border">
                  <span className="font-bold text-slate-900 dark:text-white block mb-0.5">📱 Responsive</span>
                  <span className="text-slate-500 dark:text-slate-400">Optimized for iPhone, Android, iPad, and Desktop</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-game-surfaceLight border border-slate-200 dark:border-game-border">
                  <span className="font-bold text-slate-900 dark:text-white block mb-0.5">🔊 Audio FX</span>
                  <span className="text-slate-500 dark:text-slate-400">Synthesized Web Audio API procedural drops and fanfares</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer CTA */}
        <button
          onClick={() => setHowToPlayOpen(false)}
          className="mt-4 w-full py-3.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-sm shadow-lg shadow-cyan-500/20 active:scale-95 transition flex items-center justify-center gap-2"
        >
          <span>LET'S PLAY!</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
