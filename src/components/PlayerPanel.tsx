import React, { useEffect, useState } from 'react';
import {
  Clock,
  RotateCcw,
  Sparkles,
  Trophy,
  Undo2,
  Users,
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import type { Player } from '../engine/types';
import { AvatarIcon } from './SetupWizard';

export const PlayerPanel: React.FC = () => {
  const {
    gameState,
    isRobotThinking,
    handleUndo,
    handleRematch,
    handleMakeMove,
  } = useGame();

  // Elapsed timer state calculated from start timestamp
  const [elapsed, setElapsed] = useState<number>(0);
  const [turnTimeRemaining, setTurnTimeRemaining] = useState<number>(0);

  const startTime = gameState?.startTime || Date.now();
  const status = gameState?.status;
  const isPlaying = status === 'playing';
  const timeoutLimit = gameState?.config.turnTimeoutSeconds || 0;

  // Reliable elapsed timer based on Date.now() diffing
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      const seconds = Math.floor((Date.now() - startTime) / 1000);
      setElapsed(seconds);
    }, 500);

    return () => clearInterval(interval);
  }, [isPlaying, startTime]);

  // Turn countdown timer
  useEffect(() => {
    if (!isPlaying || timeoutLimit === 0) return;

    setTurnTimeRemaining(timeoutLimit);
    const startTurnTime = Date.now();

    const interval = setInterval(() => {
      const passed = Math.floor((Date.now() - startTurnTime) / 1000);
      const remaining = Math.max(0, timeoutLimit - passed);
      setTurnTimeRemaining(remaining);

      // Timeout auto-move / skip logic
      if (remaining === 0) {
        clearInterval(interval);
        // Find first available column to prevent stall
        if (gameState) {
          const availableCols = gameState.board[0]
            .map((c: string | null, idx: number) => (c === null ? idx : -1))
            .filter((idx: number) => idx !== -1);
          if (availableCols.length > 0) {
            handleMakeMove(availableCols[0]);
          }
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, timeoutLimit, gameState?.currentTurnIndex, handleMakeMove]);

  if (!gameState) return null;

  const { players, currentTurnIndex, moveHistory, mode } = gameState;
  const activePlayer = players[currentTurnIndex];
  const nextPlayer = players[(currentTurnIndex + 1) % players.length];

  // Format mm:ss
  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full flex flex-col gap-3 select-none">
      {/* Active Player Banner Card */}
      <div
        className="p-4 rounded-3xl border-2 transition-all shadow-xl relative overflow-hidden"
        style={{
          borderColor: activePlayer.color,
          backgroundColor: `${activePlayer.color}15`,
        }}
      >
        {/* Glow corner */}
        <div
          className="absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl opacity-30"
          style={{ backgroundColor: activePlayer.color }}
        />

        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase font-black tracking-wider flex items-center gap-1.5" style={{ color: activePlayer.color }}>
            <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: activePlayer.color }} />
            Active Turn
          </span>

          {/* Turn timer badge if enabled */}
          {timeoutLimit > 0 && isPlaying && (
            <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${
              turnTimeRemaining <= 5
                ? 'bg-red-500/20 text-red-500 border-red-500/40 animate-pulse'
                : 'bg-amber-500/20 text-amber-500 border-amber-500/40'
            }`}>
              {turnTimeRemaining}s left
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Active Player Coin Badge */}
          <div
            className="w-12 h-12 rounded-full border-2 border-white shadow-lg flex items-center justify-center relative text-white font-black text-sm shrink-0"
            style={{ backgroundColor: activePlayer.color }}
          >
            <div className="absolute inset-0 rounded-full coin-gloss" />
            <AvatarIcon avatar={activePlayer.avatar} className="w-6 h-6 relative z-10" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-black text-slate-900 dark:text-white truncate flex items-center gap-2">
              <span>{activePlayer.name}</span>
              {activePlayer.isRobot && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-50 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/40">
                  AI
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              {isRobotThinking ? (
                <span className="text-cyan-600 dark:text-cyan-400 font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  Calculating best strategy...
                </span>
              ) : (
                <span>Drop coin in any open column</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Roster & Scores Card */}
      <div className="p-4 rounded-3xl bg-white dark:bg-game-surface border border-slate-200 dark:border-game-border shadow-sm">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-2.5 pb-2 border-b border-slate-100 dark:border-game-border/60">
          <span className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-fuchsia-500" /> Turn Order & Scores
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-cyan-500" />
            {formatTimer(elapsed)}
          </span>
        </div>

        <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto pr-1">
          {players.map((p: Player, idx: number) => {
            const isTurn = idx === currentTurnIndex;
            return (
              <div
                key={p.id}
                className={`flex items-center justify-between p-2 rounded-xl text-xs transition ${
                  isTurn
                    ? 'bg-slate-100 dark:bg-white/10 font-black text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-white/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-white/80 shadow-sm shrink-0"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="truncate">{p.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {p.score > 0 && (
                    <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                      <Trophy className="w-3 h-3" /> {p.score}
                    </span>
                  )}
                  {isTurn && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 font-bold">
                      Now
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Up Next & Move Counter Footer */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-game-border/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
          <span>
            Up Next: <strong className="text-slate-900 dark:text-slate-200">{nextPlayer.name}</strong>
          </span>
          <span>Moves: {moveHistory.length}</span>
        </div>
      </div>

      {/* In-Game Action Buttons */}
      <div className="flex items-center gap-2">
        {mode !== 'online' && (
          <button
            onClick={handleUndo}
            disabled={moveHistory.length === 0 || isRobotThinking || status !== 'playing'}
            className="flex-1 py-2.5 px-3 rounded-2xl bg-white dark:bg-game-surface border border-slate-200 dark:border-game-border hover:bg-slate-50 dark:hover:bg-game-surfaceLight text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition disabled:opacity-40 disabled:pointer-events-none shadow-sm"
            title="Undo last move"
          >
            <Undo2 className="w-3.5 h-3.5" />
            Undo
          </button>
        )}

        <button
          onClick={handleRematch}
          className="flex-1 py-2.5 px-3 rounded-2xl bg-white dark:bg-game-surface border border-slate-200 dark:border-game-border hover:bg-slate-50 dark:hover:bg-game-surfaceLight text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm"
          title="Restart match"
        >
          <RotateCcw className="w-3.5 h-3.5 text-cyan-500" />
          Restart
        </button>
      </div>
    </div>
  );
};
