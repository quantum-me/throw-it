import React, { useState } from 'react';
import {
  ArrowLeft,
  Bot,
  Crown,
  Flame,
  Heart,
  Play,
  RotateCcw,
  Shield,
  Star,
  Users,
  Zap,
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import {
  DEFAULT_AVATARS,
  DEFAULT_COLS,
  DEFAULT_PALETTE,
  DEFAULT_ROWS,
  DEFAULT_SYMBOLS,
  MAX_COLS,
  MAX_ROWS,
  MIN_COLS,
  MIN_ROWS,
} from '../engine/gameEngine';
import type { Player, RoboDifficulty } from '../engine/types';
import { ColorPalettePicker } from './ColorPalettePicker';

interface AvatarIconProps {
  avatar: string;
  className?: string;
}

export const AvatarIcon: React.FC<AvatarIconProps> = ({ avatar, className = 'w-4 h-4' }) => {
  switch (avatar) {
    case 'bot':
      return <Bot className={className} />;
    case 'crown':
      return <Crown className={className} />;
    case 'flame':
      return <Flame className={className} />;
    case 'zap':
      return <Zap className={className} />;
    case 'star':
      return <Star className={className} />;
    case 'shield':
      return <Shield className={className} />;
    case 'heart':
      return <Heart className={className} />;
    default:
      return <Star className={className} />;
  }
};

export const SetupWizard: React.FC = () => {
  const { selectedMode, startNewGame, setView } = useGame();

  // Configuration state
  const [playerCount, setPlayerCount] = useState<number>(selectedMode === 'robo' ? 2 : 2);
  const [difficulty, setDifficulty] = useState<RoboDifficulty>('medium');
  const [rows, setRows] = useState<number>(DEFAULT_ROWS);
  const [cols, setCols] = useState<number>(DEFAULT_COLS);
  const [turnTimeout, setTurnTimeout] = useState<number>(0); // 0 = unlimited
  const [handoffPrivacy, setHandoffPrivacy] = useState<boolean>(false);

  // Player configs
  const [players, setPlayers] = useState<Player[]>([
    {
      id: 'p1',
      name: 'Player 1',
      color: DEFAULT_PALETTE[0],
      symbol: DEFAULT_SYMBOLS[0],
      avatar: 'crown',
      score: 0,
    },
    {
      id: selectedMode === 'robo' ? 'robo' : 'p2',
      name: selectedMode === 'robo' ? 'Robo Rival' : 'Player 2',
      color: DEFAULT_PALETTE[1],
      symbol: DEFAULT_SYMBOLS[1],
      avatar: selectedMode === 'robo' ? 'bot' : 'star',
      isRobot: selectedMode === 'robo',
      robotDifficulty: 'medium',
      score: 0,
    },
  ]);

  // Adjust player array when count changes
  const handlePlayerCountChange = (count: number) => {
    setPlayerCount(count);
    const newPlayers: Player[] = [];

    for (let i = 0; i < count; i++) {
      if (players[i]) {
        newPlayers.push(players[i]);
      } else {
        newPlayers.push({
          id: `p${i + 1}`,
          name: `Player ${i + 1}`,
          color: DEFAULT_PALETTE[i % DEFAULT_PALETTE.length],
          symbol: DEFAULT_SYMBOLS[i % DEFAULT_SYMBOLS.length],
          avatar: DEFAULT_AVATARS[i % DEFAULT_AVATARS.length],
          score: 0,
        });
      }
    }
    setPlayers(newPlayers);
  };

  const updatePlayer = (index: number, updates: Partial<Player>) => {
    setPlayers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const autoAssignColors = () => {
    setPlayers((prev) =>
      prev.map((p, i) => ({
        ...p,
        color: DEFAULT_PALETTE[i % DEFAULT_PALETTE.length],
        symbol: DEFAULT_SYMBOLS[i % DEFAULT_SYMBOLS.length],
      }))
    );
  };

  // Check for duplicate colors
  const colorList = players.map((p) => p.color.toLowerCase());
  const hasDuplicateColors = new Set(colorList).size !== colorList.length;

  const handleStartGame = () => {
    if (selectedMode === 'robo') {
      const roboPlayer: Player = {
        id: 'robo',
        name: `Robo (${difficulty.toUpperCase()})`,
        color: players[1]?.color || DEFAULT_PALETTE[1],
        symbol: DEFAULT_SYMBOLS[1],
        avatar: 'bot',
        isRobot: true,
        robotDifficulty: difficulty,
        score: 0,
      };
      startNewGame([players[0], roboPlayer], { rows, cols, turnTimeoutSeconds: turnTimeout }, 'robo');
    } else {
      startNewGame(
        players,
        { rows, cols, turnTimeoutSeconds: turnTimeout, handoffPrivacy },
        'local'
      );
    }
  };

  return (
    <div className="flex-1 max-w-4xl mx-auto px-4 py-6 w-full flex flex-col justify-center">
      {/* Wizard Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView('home')}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-game-surfaceLight dark:hover:bg-game-border text-slate-700 dark:text-slate-300 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              {selectedMode === 'robo' ? 'Configure Robo Match' : 'Pass & Play Setup'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Customize players, colors, board dimensions, and match rules.
            </p>
          </div>
        </div>

        <button
          onClick={autoAssignColors}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-game-surfaceLight dark:hover:bg-game-border text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700/50"
          title="Auto-assign unique palette"
        >
          <RotateCcw className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
          <span>Reset Palette</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Player Customization */}
        <div className="md:col-span-7 flex flex-col gap-4">
          {/* Player Count Selection (for local mode) */}
          {selectedMode === 'local' && (
            <div className="p-4 rounded-2xl bg-white dark:bg-game-surface border border-slate-200 dark:border-game-border shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-fuchsia-500 dark:text-fuchsia-400" />
                  Number of Players (2–7)
                </label>
                <span className="text-xs font-bold text-fuchsia-600 dark:text-fuchsia-400 bg-fuchsia-50 dark:bg-fuchsia-500/10 px-2.5 py-0.5 rounded-full border border-fuchsia-200 dark:border-fuchsia-500/20">
                  {playerCount} Players
                </span>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {[2, 3, 4, 5, 6, 7].map((num) => (
                  <button
                    key={num}
                    onClick={() => handlePlayerCountChange(num)}
                    className={`py-2 text-sm font-bold rounded-xl border transition ${
                      playerCount === num
                        ? 'bg-fuchsia-600 text-white border-fuchsia-500 shadow-md shadow-fuchsia-500/20'
                        : 'bg-slate-50 dark:bg-game-surfaceLight text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-game-border hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {num}P
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Robo Difficulty (for Robo mode) */}
          {selectedMode === 'robo' && (
            <div className="p-4 rounded-2xl bg-white dark:bg-game-surface border border-slate-200 dark:border-game-border shadow-sm">
              <label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                <Bot className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                Robot AI Difficulty
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['easy', 'medium', 'hard'] as RoboDifficulty[]).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setDifficulty(lvl)}
                    className={`py-2 px-3 text-xs sm:text-sm font-bold capitalize rounded-xl border transition ${
                      difficulty === lvl
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20 font-black'
                        : 'bg-slate-50 dark:bg-game-surfaceLight text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-game-border hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2.5">
                {difficulty === 'easy' && 'Casual play. Makes safe moves with random placement.'}
                {difficulty === 'medium' && 'Sharp tactician. Seizes immediate wins & blocks lethal opponent threats.'}
                {difficulty === 'hard' && 'Master strategist. Minimax lookahead with deep positional heuristics.'}
              </p>
            </div>
          )}

          {/* Duplicate Color Warning */}
          {hasDuplicateColors && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between">
              <span>Multiple players have matching colors. Please select distinct colors.</span>
              <button
                onClick={autoAssignColors}
                className="font-bold underline ml-2 hover:text-amber-950 dark:hover:text-white"
              >
                Auto-fix
              </button>
            </div>
          )}

          {/* Players Roster Customizer */}
          <div className="flex flex-col gap-3 max-h-[380px] overflow-y-auto pr-1">
            {players.map((player, idx) => (
              <div
                key={player.id}
                className="p-3.5 rounded-2xl bg-white dark:bg-game-surface border border-slate-200 dark:border-game-border flex flex-col gap-3 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-xs font-bold text-slate-400 w-6">#{idx + 1}</span>
                    <input
                      type="text"
                      value={player.name}
                      maxLength={16}
                      disabled={player.isRobot}
                      onChange={(e) => updatePlayer(idx, { name: e.target.value })}
                      className="bg-slate-50 dark:bg-game-surfaceLight border border-slate-300 dark:border-slate-700/70 rounded-lg px-2.5 py-1 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-cyan-400 w-full max-w-[180px]"
                    />
                  </div>

                  {/* Avatar Picker */}
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-game-surfaceLight/80 p-1 rounded-lg border border-slate-200 dark:border-slate-700/50">
                    {DEFAULT_AVATARS.slice(0, 4).map((av) => (
                      <button
                        key={av}
                        onClick={() => updatePlayer(idx, { avatar: av })}
                        className={`p-1 rounded ${
                          player.avatar === av
                            ? 'bg-cyan-500 text-slate-950'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                        title={av}
                      >
                        <AvatarIcon avatar={av} className="w-3.5 h-3.5" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Palette Picker with 16 presets + full RGB spectrum */}
                <ColorPalettePicker
                  selectedColor={player.color}
                  onSelectColor={(color) => updatePlayer(idx, { color })}
                  label="Select Color"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Board & Match Preferences */}
        <div className="md:col-span-5 flex flex-col gap-4">
          {/* Board Dimensions */}
          <div className="p-4 rounded-2xl bg-white dark:bg-game-surface border border-slate-200 dark:border-game-border shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center justify-between">
              <span>Board Dimensions</span>
              <span className="text-xs text-cyan-600 dark:text-cyan-400 font-bold">
                {cols} Columns × {rows} Rows
              </span>
            </h3>

            {/* Presets */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <button
                onClick={() => {
                  setCols(7);
                  setRows(6);
                }}
                className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition ${
                  cols === 7 && rows === 6
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                    : 'bg-slate-50 dark:bg-game-surfaceLight text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-game-border'
                }`}
              >
                Classic 7×6
              </button>
              <button
                onClick={() => {
                  setCols(8);
                  setRows(7);
                }}
                className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition ${
                  cols === 8 && rows === 7
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                    : 'bg-slate-50 dark:bg-game-surfaceLight text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-game-border'
                }`}
              >
                Wide 8×7
              </button>
              <button
                onClick={() => {
                  setCols(9);
                  setRows(7);
                }}
                className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition ${
                  cols === 9 && rows === 7
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                    : 'bg-slate-50 dark:bg-game-surfaceLight text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-game-border'
                }`}
              >
                Grand 9×7
              </button>
            </div>

            {/* Custom Sliders */}
            <div className="flex flex-col gap-3">
              <div>
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                  <span>Columns ({MIN_COLS}–{MAX_COLS})</span>
                  <span className="font-bold text-slate-900 dark:text-white">{cols}</span>
                </div>
                <input
                  type="range"
                  min={MIN_COLS}
                  max={MAX_COLS}
                  value={cols}
                  onChange={(e) => setCols(Number(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                  <span>Rows ({MIN_ROWS}–{MAX_ROWS})</span>
                  <span className="font-bold text-slate-900 dark:text-white">{rows}</span>
                </div>
                <input
                  type="range"
                  min={MIN_ROWS}
                  max={MAX_ROWS}
                  value={rows}
                  onChange={(e) => setRows(Number(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3">
              Rule Note: The winning target is <strong>always 4</strong> connected coins horizontally, vertically, or diagonally.
            </p>
          </div>

          {/* Turn Timer */}
          <div className="p-4 rounded-2xl bg-white dark:bg-game-surface border border-slate-200 dark:border-game-border shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Turn Countdown</h3>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'None', val: 0 },
                { label: '15s', val: 15 },
                { label: '30s', val: 30 },
                { label: '60s', val: 60 },
              ].map(({ label, val }) => (
                <button
                  key={val}
                  onClick={() => setTurnTimeout(val)}
                  className={`py-1.5 text-xs font-bold rounded-xl border transition ${
                    turnTimeout === val
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                      : 'bg-slate-50 dark:bg-game-surfaceLight text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-game-border'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Pass & Play Handoff Privacy Screen */}
          {selectedMode === 'local' && (
            <div className="p-4 rounded-2xl bg-white dark:bg-game-surface border border-slate-200 dark:border-game-border flex items-center justify-between shadow-sm">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Privacy Handoff Screen</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Hides the board between turns until the next player taps.
                </p>
              </div>
              <input
                type="checkbox"
                checked={handoffPrivacy}
                onChange={(e) => setHandoffPrivacy(e.target.checked)}
                className="w-5 h-5 accent-fuchsia-500 cursor-pointer rounded"
              />
            </div>
          )}

          {/* Start Match CTA */}
          <button
            onClick={handleStartGame}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-500 to-fuchsia-500 hover:from-cyan-400 hover:to-fuchsia-400 text-white font-black text-base shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 active:scale-[0.98] transition cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            START MATCH
          </button>
        </div>
      </div>
    </div>
  );
};
