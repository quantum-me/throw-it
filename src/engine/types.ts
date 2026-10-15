export type GameMode = 'robo' | 'local' | 'online';

export type RoboDifficulty = 'easy' | 'medium' | 'hard';

export type GameStatus = 'setup' | 'playing' | 'paused' | 'won' | 'draw';

export type WinDirection = 'horizontal' | 'vertical' | 'diagonal-up' | 'diagonal-down';

export interface WinResult {
  winnerId: string;
  winningCells: [number, number][]; // [row, col] coordinates
  direction: WinDirection;
}

export interface Player {
  id: string;
  name: string;
  color: string; // CSS color or hex
  symbol: string; // Accessible visual marker (e.g. '●', '▲', '★', '■', '◆', '✦', '⬟')
  avatar: string; // Avatar icon identifier ('bot', 'crown', 'flame', 'zap', 'star', 'shield', 'heart')
  isRobot?: boolean;
  robotDifficulty?: RoboDifficulty;
  isReady?: boolean;
  score: number;
}

export interface Move {
  playerId: string;
  row: number;
  col: number;
  timestamp: number;
}

export interface GameConfig {
  rows: number; // default 6
  cols: number; // default 7
  connectTarget: number; // always 4
  turnTimeoutSeconds: number; // 0 for unlimited, or 15, 30, 60
  handoffPrivacy: boolean; // For Pass & Play mode
}

export interface GameState {
  board: (string | null)[][]; // board[row][col], row 0 is top, row (rows - 1) is bottom
  players: Player[];
  currentTurnIndex: number;
  status: GameStatus;
  winner: WinResult | null;
  moveHistory: Move[];
  startTime: number | null;
  elapsedSeconds: number;
  config: GameConfig;
  mode: GameMode;
}
