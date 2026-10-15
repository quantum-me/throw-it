import React from 'react';
import { Smartphone, Eye } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { AvatarIcon } from './SetupWizard';

export const PassHandoffModal: React.FC = () => {
  const { handoffPlayer, dismissHandoff } = useGame();

  if (!handoffPlayer) return null;

  return (
    <div
      onClick={dismissHandoff}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-game-darker/95 backdrop-blur-md cursor-pointer select-none animate-fade-in"
    >
      <div className="max-w-sm w-full rounded-3xl bg-game-surface border-2 border-game-border p-8 flex flex-col items-center text-center shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30 flex items-center justify-center mb-4">
          <Smartphone className="w-8 h-8 animate-bounce" />
        </div>

        <span className="text-xs font-black uppercase tracking-widest text-fuchsia-400 mb-1">
          PASS & PLAY HANDOFF
        </span>

        <h3 className="text-xl font-black text-white mb-2">
          Pass Device To
        </h3>

        {/* Player Badge */}
        <div
          className="flex items-center gap-3 px-5 py-3 rounded-2xl border-2 my-3 shadow-lg"
          style={{
            borderColor: handoffPlayer.color,
            backgroundColor: `${handoffPlayer.color}15`,
          }}
        >
          <div
            className="w-10 h-10 rounded-full border border-white flex items-center justify-center text-white relative"
            style={{ backgroundColor: handoffPlayer.color }}
          >
            <AvatarIcon avatar={handoffPlayer.avatar} className="w-5 h-5 relative z-10" />
          </div>
          <span className="text-lg font-black text-white">{handoffPlayer.name}</span>
        </div>

        <p className="text-xs text-slate-400 mt-2 mb-6">
          Board is hidden for privacy. Hand the device over, then tap below to take your turn.
        </p>

        <button
          onClick={dismissHandoff}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white font-black text-sm shadow-lg shadow-fuchsia-500/25 flex items-center justify-center gap-2"
        >
          <Eye className="w-4 h-4" />
          Tap to Reveal Board
        </button>
      </div>
    </div>
  );
};
