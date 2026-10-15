import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { RotateCcw, Trophy, Users, Home } from 'lucide-react';
import { useGame } from '../context/GameContext';
import type { Player } from '../engine/types';
import { AvatarIcon } from './SetupWizard';

export const WinModal: React.FC = () => {
  const { gameState, handleRematch, returnToHome, setView } = useGame();

  const status = gameState?.status;
  const isWon = status === 'won';
  const isDraw = status === 'draw';

  useEffect(() => {
    if (isWon) {
      // Fire celebratory confetti explosion
      confetti({
        particleCount: 110,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#06b6d4', '#f43f5e', '#eab308', '#d946ef', '#84cc16'],
      });
    }
  }, [isWon]);

  if (!isWon && !isDraw) return null;
  if (!gameState) return null;

  const winnerPlayer = isWon && gameState.winner
    ? gameState.players.find((p: Player) => p.id === gameState.winner?.winnerId)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm rounded-3xl bg-game-surface border-2 border-game-border p-6 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
        {/* Decorative corner glow */}
        {winnerPlayer && (
          <div
            className="absolute -top-12 -left-12 w-32 h-32 rounded-full blur-3xl opacity-40 pointer-events-none"
            style={{ backgroundColor: winnerPlayer.color }}
          />
        )}

        {isWon && winnerPlayer ? (
          <>
            {/* Winner Badge */}
            <div
              className="w-20 h-20 rounded-full border-4 border-white shadow-xl flex items-center justify-center text-white mb-4 relative"
              style={{ backgroundColor: winnerPlayer.color }}
            >
              <div className="absolute inset-0 rounded-full coin-gloss" />
              <AvatarIcon avatar={winnerPlayer.avatar} className="w-10 h-10 relative z-10" />
              <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-amber-400 text-slate-950 shadow-md">
                <Trophy className="w-4 h-4 fill-current" />
              </div>
            </div>

            <span className="text-xs font-black uppercase tracking-widest text-amber-400 mb-1">
              VICTORY!
            </span>
            <h3 className="text-2xl font-black text-white mb-1">
              {winnerPlayer.name} Wins!
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Connected 4 coins {gameState.winner?.direction.replace('-', ' ')}!
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center text-slate-300 mb-4">
              <Users className="w-8 h-8" />
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">
              STALEMATE
            </span>
            <h3 className="text-2xl font-black text-white mb-1">It's a Draw!</h3>
            <p className="text-xs text-slate-400 mb-5">
              The board is full and no rival achieved four-in-a-row.
            </p>
          </>
        )}

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-2.5">
          <button
            onClick={handleRematch}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:from-cyan-400 hover:to-fuchsia-400 text-white font-extrabold text-sm shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            Play Rematch
          </button>

          <button
            onClick={() => setView('setup_wizard')}
            className="w-full py-2.5 px-4 rounded-xl bg-game-surfaceLight hover:bg-game-border text-slate-300 hover:text-white font-semibold text-xs border border-slate-700/60 transition"
          >
            Change Match Settings
          </button>

          <button
            onClick={returnToHome}
            className="w-full py-2 px-4 text-xs text-slate-400 hover:text-slate-200 font-medium flex items-center justify-center gap-1.5 transition"
          >
            <Home className="w-3.5 h-3.5" />
            Return to Menu
          </button>
        </div>
      </div>
    </div>
  );
};
