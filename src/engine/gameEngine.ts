import type { GameConfig, GameMode, GameState, Player, WinDirection, WinResult } from './types';

export const DEFAULT_ROWS = 6;
export const DEFAULT_COLS = 7;
export const MIN_ROWS = 4;
export const MIN_COLS = 4;
export const MAX_ROWS = 10;
export const MAX_COLS = 12;
export const WIN_TARGET = 4;

export const DEFAULT_PALETTE = [
  '#06b6d4', // Cyan
  '#f43f5e', // Coral
  '#eab308', // Yellow
  '#d946ef', // Magenta
  '#84cc16', // Lime
  '#f97316', // Orange
  '#8b5cf6', // Purple
];

export const DEFAULT_SYMBOLS = ['●', '▲', '★', '■', '◆', '✦', '⬟'];
export const DEFAULT_AVATARS = ['crown', 'bot', 'flame', 'zap', 'star', 'shield', 'heart'];

/**
 * Creates an empty board of given dimensions (row 0 is top, row - 1 is bottom)
 */
export function createBoard(rows: number = DEFAULT_ROWS, cols: number = DEFAULT_COLS): (string | null)[][] {
  const clampedRows = Math.max(MIN_ROWS, Math.min(MAX_ROWS, rows));
  const clampedCols = Math.max(MIN_COLS, Math.min(MAX_COLS, cols));
  return Array.from({ length: clampedRows }, () => Array(clampedCols).fill(null));
}

/**
 * Checks if a move in the selected column is legal
 */
export function isValidMove(board: (string | null)[][], col: number): boolean {
  if (!board || board.length === 0 || board[0].length === 0) return false;
  const cols = board[0].length;
  if (col < 0 || col >= cols) return false;
  return board[0][col] === null;
}

/**
 * Finds the row a coin will fall into under gravity (lowest empty row)
 */
export function getDropRow(board: (string | null)[][], col: number): number {
  if (!isValidMove(board, col)) return -1;
  const rows = board.length;
  for (let r = rows - 1; r >= 0; r--) {
    if (board[r][col] === null) {
      return r;
    }
  }
  return -1;
}

/**
 * Returns a list of column indices that have open cells
 */
export function getAvailableColumns(board: (string | null)[][]): number[] {
  if (!board || board.length === 0) return [];
  const cols = board[0].length;
  const available: number[] = [];
  for (let c = 0; c < cols; c++) {
    if (isValidMove(board, c)) {
      available.push(c);
    }
  }
  return available;
}

/**
 * Checks whether the entire board is full (no more empty cells in row 0)
 */
export function isBoardFull(board: (string | null)[][]): boolean {
  if (!board || board.length === 0) return true;
  return board[0].every((cell) => cell !== null);
}

interface DirectionVector {
  dr: number;
  dc: number;
  type: WinDirection;
}

const DIRECTIONS: DirectionVector[] = [
  { dr: 0, dc: 1, type: 'horizontal' },
  { dr: 1, dc: 0, type: 'vertical' },
  { dr: 1, dc: 1, type: 'diagonal-down' }, // Top-left to bottom-right (\)
  { dr: -1, dc: 1, type: 'diagonal-up' },   // Bottom-left to top-right (/)
];

/**
 * Efficiently checks if the move at [row, col] creates a winning line of length >= connectTarget (4).
 * Scans only outward in both directions along the 4 lines intersecting [row, col].
 */
export function checkWinFromPosition(
  board: (string | null)[][],
  row: number,
  col: number,
  playerId: string,
  connectTarget: number = WIN_TARGET
): WinResult | null {
  const rows = board.length;
  const cols = board[0].length;

  for (const { dr, dc, type } of DIRECTIONS) {
    const cells: [number, number][] = [[row, col]];

    // Step in positive direction
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r < rows && c >= 0 && c < cols && board[r][c] === playerId) {
      cells.push([r, c]);
      r += dr;
      c += dc;
    }

    // Step in negative direction
    r = row - dr;
    c = col - dc;
    while (r >= 0 && r < rows && c >= 0 && c < cols && board[r][c] === playerId) {
      cells.push([r, c]);
      r -= dr;
      c -= dc;
    }

    if (cells.length >= connectTarget) {
      // Sort cells along line for nice animation rendering
      cells.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      return {
        winnerId: playerId,
        winningCells: cells,
        direction: type,
      };
    }
  }

  return null;
}

/**
 * Initializes a new GameState
 */
export function createInitialState(
  players: Player[],
  configPartial?: Partial<GameConfig>,
  mode: GameMode = 'local'
): GameState {
  if (players.length < 2 || players.length > 7) {
    throw new Error('Throw It requires between 2 and 7 players.');
  }

  const config: GameConfig = {
    rows: configPartial?.rows ?? DEFAULT_ROWS,
    cols: configPartial?.cols ?? DEFAULT_COLS,
    connectTarget: WIN_TARGET,
    turnTimeoutSeconds: configPartial?.turnTimeoutSeconds ?? 0,
    handoffPrivacy: configPartial?.handoffPrivacy ?? false,
  };

  const board = createBoard(config.rows, config.cols);

  return {
    board,
    players: players.map((p, index) => ({
      ...p,
      symbol: p.symbol || DEFAULT_SYMBOLS[index % DEFAULT_SYMBOLS.length],
      avatar: p.avatar || DEFAULT_AVATARS[index % DEFAULT_AVATARS.length],
      color: p.color || DEFAULT_PALETTE[index % DEFAULT_PALETTE.length],
      score: p.score ?? 0,
    })),
    currentTurnIndex: 0,
    status: 'playing',
    winner: null,
    moveHistory: [],
    startTime: Date.now(),
    elapsedSeconds: 0,
    config,
    mode,
  };
}

export interface DropResult {
  state: GameState;
  droppedRow: number;
  droppedCol: number;
  isWin: boolean;
  isDraw: boolean;
}

/**
 * Executes a coin drop in the given column for the specified player.
 * Returns the updated immutable GameState along with drop details.
 */
export function dropCoin(
  state: GameState,
  col: number,
  playerId?: string
): DropResult {
  if (state.status !== 'playing') {
    throw new Error(`Cannot make a move when game status is ${state.status}`);
  }

  const activePlayer = state.players[state.currentTurnIndex];
  if (playerId && activePlayer.id !== playerId) {
    throw new Error(`Not player ${playerId}'s turn (current turn: ${activePlayer.id})`);
  }

  if (!isValidMove(state.board, col)) {
    throw new Error(`Column ${col} is full or out of bounds`);
  }

  const row = getDropRow(state.board, col);
  if (row === -1) {
    throw new Error(`Failed to find drop row for column ${col}`);
  }

  // Clone board immutably
  const newBoard = state.board.map((r) => [...r]);
  newBoard[row][col] = activePlayer.id;

  // Add move to history
  const newMove = {
    playerId: activePlayer.id,
    row,
    col,
    timestamp: Date.now(),
  };
  const newHistory = [...state.moveHistory, newMove];

  // Check win
  const win = checkWinFromPosition(newBoard, row, col, activePlayer.id, state.config.connectTarget);
  let newStatus: GameState['status'] = 'playing';
  let updatedPlayers = state.players;

  if (win) {
    newStatus = 'won';
    updatedPlayers = state.players.map((p) =>
      p.id === activePlayer.id ? { ...p, score: p.score + 1 } : p
    );
  } else if (isBoardFull(newBoard)) {
    newStatus = 'draw';
  }

  const nextTurnIndex =
    newStatus === 'playing'
      ? (state.currentTurnIndex + 1) % state.players.length
      : state.currentTurnIndex;

  const nextState: GameState = {
    ...state,
    board: newBoard,
    players: updatedPlayers,
    currentTurnIndex: nextTurnIndex,
    status: newStatus,
    winner: win,
    moveHistory: newHistory,
  };

  return {
    state: nextState,
    droppedRow: row,
    droppedCol: col,
    isWin: !!win,
    isDraw: newStatus === 'draw',
  };
}

/**
 * Resets the board for a rematch while keeping player scores and order
 */
export function rematchState(state: GameState): GameState {
  const board = createBoard(state.config.rows, state.config.cols);
  return {
    ...state,
    board,
    currentTurnIndex: 0,
    status: 'playing',
    winner: null,
    moveHistory: [],
    startTime: Date.now(),
    elapsedSeconds: 0,
  };
}

/**
 * Reverts the last move (allowed in local/robo mode)
 */
export function undoMove(state: GameState): GameState | null {
  if (state.moveHistory.length === 0) return null;
  const lastMove = state.moveHistory[state.moveHistory.length - 1];

  const newBoard = state.board.map((r) => [...r]);
  newBoard[lastMove.row][lastMove.col] = null;

  const prevTurnIndex =
    (state.currentTurnIndex - 1 + state.players.length) % state.players.length;

  return {
    ...state,
    board: newBoard,
    currentTurnIndex: prevTurnIndex,
    status: 'playing',
    winner: null,
    moveHistory: state.moveHistory.slice(0, -1),
  };
}
