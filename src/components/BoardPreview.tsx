import React, { useEffect, useState } from 'react';

export const BoardPreview: React.FC = () => {
  // A pre-baked classic dynamic preview pattern with winning highlight
  const [activeWinStep, setActiveWinStep] = useState(0);

  const previewCols = 7;

  // Colors: 1 = Cyan, 2 = Magenta, 3 = Yellow
  const grid = [
    [null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null],
    [null, null, null, '#06b6d4', null, null, null],
    [null, null, '#06b6d4', '#f43f5e', '#eab308', null, null],
    [null, '#06b6d4', '#f43f5e', '#06b6d4', '#f43f5e', '#eab308', null],
    ['#06b6d4', '#f43f5e', '#eab308', '#06b6d4', '#f43f5e', '#06b6d4', '#eab308'],
  ];

  // The diagonal winning cells: [5,0], [4,1], [3,2], [2,3]
  const winCells = [
    [5, 0],
    [4, 1],
    [3, 2],
    [2, 3],
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveWinStep((prev) => (prev + 1) % 2);
    }, 1200);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative mx-auto max-w-sm sm:max-w-md p-4 bg-gradient-to-b from-game-surface/90 to-game-darker/90 rounded-2xl border border-game-border shadow-2xl board-grid-shadow">
      {/* Top Slot Header */}
      <div className="flex justify-around mb-2 px-2">
        {Array.from({ length: previewCols }).map((_, c) => (
          <div
            key={c}
            className={`w-3 h-3 rounded-full transition-opacity ${
              c === 3 ? 'bg-cyan-400 opacity-90 animate-bounce' : 'bg-slate-700/40 opacity-40'
            }`}
          />
        ))}
      </div>

      {/* Board Rack Grid */}
      <div className="bg-blue-950/80 dark:bg-[#131b34] p-3 rounded-xl border border-blue-800/40 grid grid-cols-7 gap-2 shadow-inner">
        {grid.map((row, r) =>
          row.map((cellColor, c) => {
            const isWin = winCells.some(([wr, wc]) => wr === r && wc === c);
            return (
              <div
                key={`${r}-${c}`}
                className="aspect-square rounded-full bg-slate-900/90 dark:bg-[#090d1a] border border-blue-900/60 p-1 flex items-center justify-center board-cell-hole relative overflow-hidden"
              >
                {cellColor && (
                  <div
                    className={`w-full h-full rounded-full shadow-md relative transition-transform ${
                      isWin && activeWinStep === 1 ? 'scale-110 ring-2 ring-white animate-win-pulse' : ''
                    }`}
                    style={{ backgroundColor: cellColor }}
                  >
                    <div className="absolute inset-0 rounded-full coin-gloss" />
                    {isWin && (
                      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white drop-shadow">
                        ★
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 font-medium px-2">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping inline-block" />
          4 in a row to win
        </span>
        <span className="text-cyan-400 font-semibold">T! Interactive Strategy</span>
      </div>
    </div>
  );
};
