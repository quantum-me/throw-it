import { describe, expect, it } from 'vitest';
import {
  checkWinFromPosition,
  createBoard,
  createInitialState,
  dropCoin,
  getAvailableColumns,
  getDropRow,
  isBoardFull,
  isValidMove,
  rematchState,
  undoMove,
} from '../gameEngine';
import { getRobotMove, isWinningMove } from '../robot';
import type { Player } from '../types';

describe('Game Engine - Board & Moves', () => {
  it('creates default 6x7 board with all cells null', () => {
    const board = createBoard();
    expect(board.length).toBe(6);
    expect(board[0].length).toBe(7);
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 7; c++) {
        expect(board[r][c]).toBeNull();
      }
    }
  });

  it('creates custom size board within bounds (4x4 to 10x12)', () => {
    const board4x4 = createBoard(4, 4);
    expect(board4x4.length).toBe(4);
    expect(board4x4[0].length).toBe(4);

    const boardClamped = createBoard(2, 20); // should clamp to 4 rows and 12 cols
    expect(boardClamped.length).toBe(4);
    expect(boardClamped[0].length).toBe(12);
  });

  it('drops coins to the lowest available row due to gravity', () => {
    const board = createBoard();
    expect(getDropRow(board, 3)).toBe(5); // row 5 is bottom (0-indexed for 6 rows)

    board[5][3] = 'p1';
    expect(getDropRow(board, 3)).toBe(4); // row 4 is next

    board[4][3] = 'p2';
    expect(getDropRow(board, 3)).toBe(3);
  });

  it('rejects drops into full columns and out of bounds columns', () => {
    const board = createBoard();
    for (let r = 0; r < 6; r++) {
      board[r][0] = 'p1';
    }
    expect(isValidMove(board, 0)).toBe(false);
    expect(getDropRow(board, 0)).toBe(-1);
    expect(isValidMove(board, -1)).toBe(false);
    expect(isValidMove(board, 7)).toBe(false);
    expect(isValidMove(board, 1)).toBe(true);
  });

  it('reports available columns correctly', () => {
    const board = createBoard(4, 4);
    expect(getAvailableColumns(board)).toEqual([0, 1, 2, 3]);

    for (let r = 0; r < 4; r++) {
      board[r][2] = 'p1';
    }
    expect(getAvailableColumns(board)).toEqual([0, 1, 3]);
  });
});

describe('Game Engine - Win Detection in All 4 Directions', () => {
  it('detects horizontal win', () => {
    const board = createBoard();
    const r = 5;
    board[r][1] = 'p1';
    board[r][2] = 'p1';
    board[r][3] = 'p1';
    board[r][4] = 'p1';

    const win = checkWinFromPosition(board, r, 4, 'p1');
    expect(win).not.toBeNull();
    expect(win?.winnerId).toBe('p1');
    expect(win?.direction).toBe('horizontal');
    expect(win?.winningCells.length).toBe(4);
    expect(win?.winningCells).toEqual([
      [5, 1],
      [5, 2],
      [5, 3],
      [5, 4],
    ]);
  });

  it('detects vertical win', () => {
    const board = createBoard();
    board[5][2] = 'p2';
    board[4][2] = 'p2';
    board[3][2] = 'p2';
    board[2][2] = 'p2';

    const win = checkWinFromPosition(board, 2, 2, 'p2');
    expect(win).not.toBeNull();
    expect(win?.winnerId).toBe('p2');
    expect(win?.direction).toBe('vertical');
    expect(win?.winningCells).toEqual([
      [2, 2],
      [3, 2],
      [4, 2],
      [5, 2],
    ]);
  });

  it('detects diagonal-down (\\) win', () => {
    const board = createBoard();
    board[2][1] = 'p1';
    board[3][2] = 'p1';
    board[4][3] = 'p1';
    board[5][4] = 'p1';

    const win = checkWinFromPosition(board, 3, 2, 'p1');
    expect(win).not.toBeNull();
    expect(win?.winnerId).toBe('p1');
    expect(win?.direction).toBe('diagonal-down');
    expect(win?.winningCells.length).toBe(4);
  });

  it('detects diagonal-up (/) win', () => {
    const board = createBoard();
    board[5][1] = 'p3';
    board[4][2] = 'p3';
    board[3][3] = 'p3';
    board[2][4] = 'p3';

    const win = checkWinFromPosition(board, 4, 2, 'p3');
    expect(win).not.toBeNull();
    expect(win?.winnerId).toBe('p3');
    expect(win?.direction).toBe('diagonal-up');
    expect(win?.winningCells.length).toBe(4);
  });

  it('does not trigger win on only 3 connected coins', () => {
    const board = createBoard();
    board[5][0] = 'p1';
    board[5][1] = 'p1';
    board[5][2] = 'p1';
    expect(checkWinFromPosition(board, 5, 2, 'p1')).toBeNull();
  });

  it('detects draws when board is full and no one has won', () => {
    const board = createBoard(4, 4);
    // Fill board in alternating pattern with no 4 in a row
    // P1 P2 P1 P2
    // P1 P2 P1 P2
    // P2 P1 P2 P1
    // P2 P1 P2 P1
    const pattern = [
      ['p1', 'p2', 'p1', 'p2'],
      ['p1', 'p2', 'p1', 'p2'],
      ['p2', 'p1', 'p2', 'p1'],
      ['p2', 'p1', 'p2', 'p1'],
    ];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        board[r][c] = pattern[r][c];
      }
    }
    expect(isBoardFull(board)).toBe(true);
  });
});

describe('Game Engine - Multi-Player Turn Rotation (2 to 7 players)', () => {
  const makePlayers = (count: number): Player[] =>
    Array.from({ length: count }, (_, i) => ({
      id: `p${i + 1}`,
      name: `Player ${i + 1}`,
      color: '#ffffff',
      symbol: '●',
      avatar: 'star',
      score: 0,
    }));

  it('rotates turns accurately across 2 players', () => {
    let state = createInitialState(makePlayers(2));
    expect(state.currentTurnIndex).toBe(0);

    state = dropCoin(state, 0).state;
    expect(state.currentTurnIndex).toBe(1);

    state = dropCoin(state, 1).state;
    expect(state.currentTurnIndex).toBe(0);
  });

  it('rotates turns accurately across 7 players', () => {
    let state = createInitialState(makePlayers(7));
    expect(state.players.length).toBe(7);

    for (let i = 0; i < 7; i++) {
      expect(state.currentTurnIndex).toBe(i);
      state = dropCoin(state, i).state;
    }
    // Should loop back to player 0
    expect(state.currentTurnIndex).toBe(0);
  });

  it('rejects player count less than 2 or greater than 7', () => {
    expect(() => createInitialState(makePlayers(1))).toThrow();
    expect(() => createInitialState(makePlayers(8))).toThrow();
  });

  it('stops accepting moves once someone has won', () => {
    let state = createInitialState(makePlayers(2));
    // P1: col 0, P2: col 1, repeated 3 times
    for (let i = 0; i < 3; i++) {
      state = dropCoin(state, 0).state;
      state = dropCoin(state, 1).state;
    }
    // P1 drops 4th coin in col 0 to win vertically
    const result = dropCoin(state, 0);
    expect(result.isWin).toBe(true);
    expect(result.state.status).toBe('won');
    expect(result.state.winner?.winnerId).toBe('p1');

    // Attempting next move should throw error
    expect(() => dropCoin(result.state, 2)).toThrow();
  });

  it('supports rematch and undo in local mode', () => {
    let state = createInitialState(makePlayers(2));
    state = dropCoin(state, 3).state;
    expect(state.moveHistory.length).toBe(1);

    const undone = undoMove(state);
    expect(undone).not.toBeNull();
    expect(undone?.moveHistory.length).toBe(0);
    expect(undone?.board[5][3]).toBeNull();
    expect(undone?.currentTurnIndex).toBe(0);

    const rematched = rematchState(state);
    expect(rematched.moveHistory.length).toBe(0);
    expect(rematched.status).toBe('playing');
    expect(rematched.winner).toBeNull();
  });
});

describe('Robot AI Engine', () => {
  const players: Player[] = [
    { id: 'human', name: 'Human', color: '#06b6d4', symbol: '●', avatar: 'star', score: 0 },
    { id: 'robo', name: 'Robo', color: '#f43f5e', symbol: '▲', avatar: 'bot', isRobot: true, score: 0 },
  ];

  it('identifies immediate winning moves', () => {
    const board = createBoard();
    board[5][0] = 'robo';
    board[5][1] = 'robo';
    board[5][2] = 'robo';
    // col 3 is open and should be winning move
    expect(isWinningMove(board, 3, 'robo')).toBe(true);
    expect(isWinningMove(board, 4, 'robo')).toBe(false);
  });

  it('Medium Robo takes immediate winning move', () => {
    const state = createInitialState(players);
    state.currentTurnIndex = 1; // Robo turn
    state.board[5][1] = 'robo';
    state.board[5][2] = 'robo';
    state.board[5][3] = 'robo';

    const chosenCol = getRobotMove(state, 'medium');
    // col 0 or col 4 gives immediate 4-in-a-row
    expect([0, 4]).toContain(chosenCol);
  });

  it('Medium Robo immediately blocks an opponent about to win', () => {
    const state = createInitialState(players);
    state.currentTurnIndex = 1; // Robo turn
    // Human has 3 in col 2 vertically
    state.board[5][2] = 'human';
    state.board[4][2] = 'human';
    state.board[3][2] = 'human';

    const chosenCol = getRobotMove(state, 'medium');
    // Robo must drop in col 2 to block
    expect(chosenCol).toBe(2);
  });

  it('Hard Robo blocks opponent and takes win', () => {
    const state = createInitialState(players);
    state.currentTurnIndex = 1; // Robo turn
    state.board[5][0] = 'human';
    state.board[4][0] = 'human';
    state.board[3][0] = 'human';

    const chosenCol = getRobotMove(state, 'hard');
    expect(chosenCol).toBe(0);
  });
});
