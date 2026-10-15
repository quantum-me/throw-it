import React from 'react';
import { X, CheckCircle2, ShieldAlert, Sparkles } from 'lucide-react';
import { useGame } from '../context/GameContext';

export const HowToPlayModal: React.FC = () => {
  const { howToPlayOpen, setHowToPlayOpen } = useGame();

  if (!howToPlayOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-game-surface border-2 border-game-border p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={() => setHowToPlayOpen(false)}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white bg-game-surfaceLight border border-slate-700/60 transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
            ?
          </div>
          <h3 className="text-xl font-black text-white">How to Play Throw It</h3>
        </div>

        <div className="flex flex-col gap-4 text-xs sm:text-sm text-slate-300">
          <div className="p-3.5 rounded-xl bg-game-surfaceLight border border-game-border">
            <h4 className="font-bold text-white mb-1 flex items-center gap-1.5 text-cyan-400">
              <CheckCircle2 className="w-4 h-4" /> The Winning Objective
            </h4>
            <p className="text-slate-300">
              Be the first player to connect <strong>4 of your colored coins</strong> in an unbroken line — horizontally, vertically, or diagonally.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-game-surfaceLight border border-game-border">
            <h4 className="font-bold text-white mb-1 flex items-center gap-1.5 text-fuchsia-400">
              <Sparkles className="w-4 h-4" /> 2 to 7 Players
            </h4>
            <p className="text-slate-300">
              Throw It supports anywhere from 2 up to 7 players in a single match. Turns alternate sequentially. In 3+ player matches, you must defend against multiple rivals while building your own winning opportunities!
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-game-surfaceLight border border-game-border">
            <h4 className="font-bold text-white mb-1 flex items-center gap-1.5 text-amber-400">
              <ShieldAlert className="w-4 h-4" /> Gravity & Drop Rules
            </h4>
            <p className="text-slate-300">
              Coins fall straight down to the lowest unoccupied slot in the column you select. When a column is completely filled, no further coins can be dropped into it.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-game-surfaceLight border border-game-border">
            <h4 className="font-bold text-white mb-1.5 text-emerald-400">Pro Tips:</h4>
            <ul className="list-disc pl-4 space-y-1 text-slate-400">
              <li>Control center columns early — they offer the most winning line combinations.</li>
              <li>Always check if your drop opens up a winning opportunity for the player right after you!</li>
              <li>Create "double threats" (forks) where two separate lines can connect 4 on your next turn.</li>
            </ul>
          </div>
        </div>

        <button
          onClick={() => setHowToPlayOpen(false)}
          className="mt-6 w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition"
        >
          Got It, Let's Play!
        </button>
      </div>
    </div>
  );
};
