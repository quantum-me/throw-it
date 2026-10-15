import {
  checkWinFromPosition,
  getAvailableColumns,
  getDropRow,
  isValidMove,
  WIN_TARGET,
} from './gameEngine';
import type { GameState, RoboDifficulty } from './types';

/**
 * Evaluates a window of 4 cells for scoring
 */
function evaluateWindow(window: (string | null)[], robotId: string, opponentIds: string[]): number {
  let score = 0;
  const robotCount = window.filter((cell) => cell === robotId).length;
  const emptyCount = window.filter((cell) => cell === null).length;

  if (robotCount === 4) {
    score += 10000;
  } else if (robotCount === 3 && emptyCount === 1) {
    score += 100;
  } else if (robotCount === 2 && emptyCount === 2) {
    score += 10;
  }

  // Penalize windows that favour opponents
  for (const oppId of opponentIds) {
    const oppCount = window.filter((cell) => cell === oppId).length;
    if (oppCount === 3 && emptyCount === 1) {
      score -= 150;
    } else if (oppCount === 2 && emptyCount === 2) {
      score -= 15;
    }
  }

  return score;
}

/**
 * Heuristic board evaluation for Hard mode
 */
export function scoreBoard(board: (string | null)[][], robotId: string, opponentIds: string[]): number {
  const rows = board.length;
  const cols = board[0].length;
  let score = 0;

  // Center column preference: center columns have the highest branching factor
  const centerCol = Math.floor(cols / 2);
  let centerCount = 0;
  for (let r = 0; r < rows; r++) {
    if (board[r][centerCol] === robotId) centerCount++;
  }
  score += centerCount * 6;

  // Horizontal windows
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c <= cols - WIN_TARGET; c++) {
      const window = [board[r][c], board[r][c + 1], board[r][c + 2], board[r][c + 3]];
      score += evaluateWindow(window, robotId, opponentIds);
    }
  }

  // Vertical windows
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r <= rows - WIN_TARGET; r++) {
      const window = [board[r][c], board[r + 1][c], board[r + 2][c], board[r + 3][c]];
      score += evaluateWindow(window, robotId, opponentIds);
    }
  }

  // Diagonal Down (\)
  for (let r = 0; r <= rows - WIN_TARGET; r++) {
    for (let c = 0; c <= cols - WIN_TARGET; c++) {
      const window = [
        board[r][c],
        board[r + 1][c + 1],
        board[r + 2][c + 2],
        board[r + 3][c + 3],
      ];
      score += evaluateWindow(window, robotId, opponentIds);
    }
  }

  // Diagonal Up (/)
  for (let r = WIN_TARGET - 1; r < rows; r++) {
    for (let c = 0; c <= cols - WIN_TARGET; c++) {
      const window = [
        board[r][c],
        board[r - 1][c + 1],
        board[r - 2][c + 2],
        board[r - 3][c + 3],
      ];
      score += evaluateWindow(window, robotId, opponentIds);
    }
  }

  return score;
}

/**
 * Checks if a move by player in column results in an immediate win
 */
export function isWinningMove(board: (string | null)[][], col: number, playerId: string): boolean {
  if (!isValidMove(board, col)) return false;
  const row = getDropRow(board, col);
  if (row === -1) return false;

  board[row][col] = playerId;
  const win = checkWinFromPosition(board, row, col, playerId);
  board[row][col] = null; // revert

  return win !== null;
}

/**
 * Minimax algorithm with Alpha-Beta pruning for Hard AI
 */
function minimax(
  board: (string | null)[][],
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  robotId: string,
  opponentIds: string[]
): { score: number; bestCol: number } {
  const availableCols = getAvailableColumns(board);
  const isTerminal = availableCols.length === 0 || depth === 0;

  if (isTerminal) {
    return {
      score: scoreBoard(board, robotId, opponentIds),
      bestCol: availableCols[0] ?? -1,
    };
  }

  // Sort columns so center columns are explored first for better alpha-beta pruning
  const cols = board[0].length;
  const center = Math.floor(cols / 2);
  const sortedCols = [...availableCols].sort((a, b) => Math.abs(a - center) - Math.abs(b - center));

  if (isMaximizing) {
    let maxScore = -Infinity;
    let chosenCol = sortedCols[0];

    for (const col of sortedCols) {
      const row = getDropRow(board, col);
      board[row][col] = robotId;

      if (checkWinFromPosition(board, row, col, robotId)) {
        board[row][col] = null;
        return { score: 100000 + depth, bestCol: col };
      }

      const result = minimax(board, depth - 1, alpha, beta, false, robotId, opponentIds);
      board[row][col] = null;

      if (result.score > maxScore) {
        maxScore = result.score;
        chosenCol = col;
      }
      alpha = Math.max(alpha, maxScore);
      if (alpha >= beta) break;
    }
    return { score: maxScore, bestCol: chosenCol };
  } else {
    // Minimizing for the primary opponent or next player
    const primaryOpponent = opponentIds[0];
    let minScore = Infinity;
    let chosenCol = sortedCols[0];

    for (const col of sortedCols) {
      const row = getDropRow(board, col);
      board[row][col] = primaryOpponent;

      if (checkWinFromPosition(board, row, col, primaryOpponent)) {
        board[row][col] = null;
        return { score: -100000 - depth, bestCol: col };
      }

      const result = minimax(board, depth - 1, alpha, beta, true, robotId, opponentIds);
      board[row][col] = null;

      if (result.score < minScore) {
        minScore = result.score;
        chosenCol = col;
      }
      beta = Math.min(beta, minScore);
      if (alpha >= beta) break;
    }
    return { score: minScore, bestCol: chosenCol };
  }
}

/**
 * Computes the robot's next move based on difficulty
 */
export function getRobotMove(
  state: GameState,
  difficulty: RoboDifficulty = 'medium'
): number {
  const { board, players, currentTurnIndex } = state;
  const robot = players[currentTurnIndex];
  const robotId = robot.id;
  const opponentIds = players
    .filter((p) => p.id !== robotId)
    .map((p) => p.id);

  const availableCols = getAvailableColumns(board);
  if (availableCols.length === 0) return -1;
  if (availableCols.length === 1) return availableCols[0];

  const cols = board[0].length;
  const centerCol = Math.floor(cols / 2);

  // 1. EASY DIFFICULTY:
  // Makes legal moves, with slight preference for center columns over edge columns, 
  // but doesn't do deep lookahead.
  if (difficulty === 'easy') {
    // 35% chance to pick center or near-center if available, else random
    if (Math.random() < 0.35 && availableCols.includes(centerCol)) {
      return centerCol;
    }
    const randomIndex = Math.floor(Math.random() * availableCols.length);
    return availableCols[randomIndex];
  }

  // 2. MEDIUM DIFFICULTY:
  // - Priority 1: If Robot has an immediate winning move, TAKE IT.
  for (const col of availableCols) {
    if (isWinningMove(board, col, robotId)) {
      return col;
    }
  }

  // - Priority 2: If ANY opponent has an immediate winning move, BLOCK IT.
  for (const oppId of opponentIds) {
    for (const col of availableCols) {
      if (isWinningMove(board, col, oppId)) {
        return col;
      }
    }
  }

  if (difficulty === 'medium') {
    // Priority 3: Filter out columns that would immediately hand the next player a win
    const safeCols = availableCols.filter((col) => {
      const r = getDropRow(board, col);
      if (r <= 0) return true; // full or top row
      // If we play here, the cell above (r - 1) becomes available to the next player
      const nextRow = r - 1;
      board[r][col] = robotId;
      const givesWin = opponentIds.some((oppId) => {
        board[nextRow][col] = oppId;
        const win = checkWinFromPosition(board, nextRow, col, oppId);
        board[nextRow][col] = null;
        return win !== null;
      });
      board[r][col] = null;
      return !givesWin;
    });

    const candidateCols = safeCols.length > 0 ? safeCols : availableCols;

    // Pick candidate with best 1-ply board score
    let bestScore = -Infinity;
    let chosenCol = candidateCols[0];

    for (const col of candidateCols) {
      const row = getDropRow(board, col);
      board[row][col] = robotId;
      const score = scoreBoard(board, robotId, opponentIds);
      board[row][col] = null;

      if (score > bestScore) {
        bestScore = score;
        chosenCol = col;
      }
    }

    return chosenCol;
  }

  // 3. HARD DIFFICULTY:
  // Check immediate win first (guaranteed 0ms evaluation)
  for (const col of availableCols) {
    if (isWinningMove(board, col, robotId)) {
      return col;
    }
  }

  // Check immediate block for any opponent
  for (const oppId of opponentIds) {
    for (const col of availableCols) {
      if (isWinningMove(board, col, oppId)) {
        return col;
      }
    }
  }

  // Search depth based on board dimensions to guarantee sub-300ms execution
  const totalCells = board.length * board[0].length;
  let searchDepth = 4;
  if (totalCells > 60 || players.length > 3) {
    searchDepth = 3;
  }

  const { bestCol } = minimax(
    board,
    searchDepth,
    -Infinity,
    Infinity,
    true,
    robotId,
    opponentIds
  );

  return bestCol !== -1 && availableCols.includes(bestCol)
    ? bestCol
    : availableCols[0];
}
