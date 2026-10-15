import React, { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { isValidMove } from '../engine/gameEngine';
import type { Player } from '../engine/types';

export const GameBoard: React.FC = () => {
  const {
    gameState,
    handleMakeMove,
    isRobotThinking,
    accessibleSymbols,
    animationsEnabled,
  } = useGame();

  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [selectedKeyCol, setSelectedKeyCol] = useState<number>(3); // Keyboard focus column

  if (!gameState) return null;

  const { board, players, currentTurnIndex, winner, status, config } = gameState;
  const activePlayer = players[currentTurnIndex];
  const isGameOver = status === 'won' || status === 'draw';
  const isInputLocked = isGameOver || isRobotThinking;

  // Keyboard navigation for column selection (ArrowLeft / ArrowRight / Enter / Space)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInputLocked) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setSelectedKeyCol((prev) => (prev > 0 ? prev - 1 : config.cols - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setSelectedKeyCol((prev) => (prev < config.cols - 1 ? prev + 1 : 0));
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (isValidMove(board, selectedKeyCol)) {
          handleMakeMove(selectedKeyCol);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInputLocked, selectedKeyCol, config.cols, board, handleMakeMove]);

  // Player lookup map
  const playerMap = new Map<string, Player>(players.map((p: Player) => [p.id, p]));

  // Is winning cell helper
  const isWinningCell = (r: number, c: number): boolean => {
    if (!winner) return false;
    return winner.winningCells.some(([wr, wc]: [number, number]) => wr === r && wc === c);
  };

  const activeHoverOrKeyCol = hoveredCol !== null ? hoveredCol : selectedKeyCol;

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-full px-2 sm:px-4 py-2">
      {/* Top Drop Indicator Bar */}
      <div
        className="grid gap-1.5 sm:gap-2 mb-2 w-full max-w-[580px] px-3 sm:px-4"
        style={{ gridTemplateColumns: `repeat(${config.cols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: config.cols }).map((_, col) => {
          const isLegal = isValidMove(board, col);
          const isTargeted = activeHoverOrKeyCol === col && !isInputLocked;

          return (
            <button
              key={`drop-btn-${col}`}
              disabled={isInputLocked || !isLegal}
              onClick={() => handleMakeMove(col)}
              onMouseEnter={() => setHoveredCol(col)}
              onMouseLeave={() => setHoveredCol(null)}
              className={`h-8 sm:h-10 rounded-lg flex items-center justify-center transition-all ${
                isTargeted && isLegal
                  ? 'opacity-100 scale-105 shadow-lg'
                  : 'opacity-0 sm:opacity-20 hover:opacity-70'
              }`}
              style={{
                backgroundColor: isTargeted ? activePlayer.color : 'transparent',
              }}
              title={isLegal ? `Drop in column ${col + 1}` : 'Column full'}
              aria-label={`Drop coin in column ${col + 1}`}
            >
              {isLegal && (
                <ChevronDown
                  className={`w-5 h-5 text-white ${
                    isTargeted ? 'animate-bounce' : ''
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Main Board Rack Container */}
      <div className="relative p-2.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-[#141b34] dark:bg-[#0c1224] border-4 border-[#22305c] dark:border-[#1a2548] shadow-2xl board-grid-shadow w-full max-w-[620px] transition-all">
        {/* The Grid of Slots */}
        <div
          className="grid gap-1.5 sm:gap-2.5"
          style={{ gridTemplateColumns: `repeat(${config.cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: config.cols }).map((_, c) => (
            <div
              key={`col-${c}`}
              onClick={() => {
                if (!isInputLocked && isValidMove(board, c)) {
                  handleMakeMove(c);
                }
              }}
              onMouseEnter={() => setHoveredCol(c)}
              onMouseLeave={() => setHoveredCol(null)}
              className={`flex flex-col gap-1.5 sm:gap-2.5 cursor-pointer rounded-xl p-0.5 sm:p-1 transition-colors ${
                hoveredCol === c && !isInputLocked && isValidMove(board, c)
                  ? 'bg-white/5 ring-1 ring-cyan-400/40'
                  : ''
              }`}
            >
              {Array.from({ length: config.rows }).map((_, r) => {
                const cellPlayerId = board[r][c];
                const player = cellPlayerId ? playerMap.get(cellPlayerId) : null;
                const isWin = isWinningCell(r, c);

                return (
                  <div
                    key={`cell-${r}-${c}`}
                    className="aspect-square rounded-full bg-[#0a0d17] dark:bg-[#060810] border border-blue-900/60 p-0.5 sm:p-1 flex items-center justify-center board-cell-hole relative overflow-hidden"
                  >
                    {player && (
                      <div
                        className={`w-full h-full rounded-full relative flex items-center justify-center font-bold text-white shadow-md ${
                          animationsEnabled ? 'animate-coin-drop' : ''
                        } ${
                          isWin ? 'ring-4 ring-white animate-win-pulse z-10 scale-105' : ''
                        }`}
                        style={{
                          backgroundColor: player.color,
                        }}
                      >
                        {/* Radial 3D Coin Gloss Overlay */}
                        <div className="absolute inset-0 rounded-full coin-gloss" />

                        {/* Visual Accessible Marker / Win Trophy */}
                        {isWin ? (
                          <span className="text-white text-xs sm:text-base font-black drop-shadow-md z-20">
                            ★
                          </span>
                        ) : accessibleSymbols ? (
                          <span className="text-white/80 text-[10px] sm:text-xs font-black drop-shadow-sm z-20 select-none">
                            {player.symbol}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile-Friendly Column Number Buttons */}
      <div
        className="grid gap-1.5 sm:gap-2 mt-3 w-full max-w-[580px] px-3 sm:px-4 sm:hidden"
        style={{ gridTemplateColumns: `repeat(${config.cols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: config.cols }).map((_, col) => {
          const isLegal = isValidMove(board, col);
          return (
            <button
              key={`mob-btn-${col}`}
              disabled={isInputLocked || !isLegal}
              onClick={() => handleMakeMove(col)}
              className={`py-1.5 text-xs font-bold rounded border transition ${
                isLegal && !isInputLocked
                  ? 'bg-game-surfaceLight border-slate-600 text-slate-200 active:bg-cyan-500 active:text-slate-950'
                  : 'bg-transparent border-transparent text-slate-700'
              }`}
            >
              {col + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
};
