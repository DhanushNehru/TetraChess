import type { Cell, ChessPiece, PlayerColor, PieceType } from './types';

export const BOARD_SIZE = 14;
export const PLAYER_COLORS: PlayerColor[] = ['white', 'red', 'black', 'blue'];

export const COLOR_NAMES: Record<PlayerColor, string> = {
  white: 'White',
  red: 'Red',
  black: 'Black',
  blue: 'Blue',
};

export const COLOR_SIDES: Record<PlayerColor, string> = {
  white: 'South',
  red: 'West',
  black: 'North',
  blue: 'East',
};

export function isDeadZone(row: number, col: number): boolean {
  return (
    (row < 3 && col < 3) ||
    (row < 3 && col > 10) ||
    (row > 10 && col < 3) ||
    (row > 10 && col > 10)
  );
}

export function isValidSquare(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE && !isDeadZone(row, col);
}

export function createInitialBoard(): Cell[][] {
  const board: Cell[][] = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null),
  );

  const backRank: PieceType[] = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
  const mirrorBack: PieceType[] = ['R', 'N', 'B', 'K', 'Q', 'B', 'N', 'R'];

  // South (white) — rows 12-13, cols 3-10
  for (let i = 0; i < 8; i++) {
    board[13][3 + i] = { type: backRank[i], color: 'white' };
    board[12][3 + i] = { type: 'P', color: 'white' };
  }

  // North (black) — rows 0-1, cols 3-10
  for (let i = 0; i < 8; i++) {
    board[0][3 + i] = { type: mirrorBack[i], color: 'black' };
    board[1][3 + i] = { type: 'P', color: 'black' };
  }

  // West (red) — cols 0-1, rows 3-10
  for (let i = 0; i < 8; i++) {
    board[3 + i][0] = { type: backRank[i], color: 'red' };
    board[3 + i][1] = { type: 'P', color: 'red' };
  }

  // East (blue) — cols 12-13, rows 3-10
  for (let i = 0; i < 8; i++) {
    board[3 + i][13] = { type: mirrorBack[i], color: 'blue' };
    board[3 + i][12] = { type: 'P', color: 'blue' };
  }

  return board;
}

function getPawnDirection(color: PlayerColor): [number, number] {
  switch (color) {
    case 'white':
      return [-1, 0]; // up
    case 'black':
      return [1, 0]; // down
    case 'red':
      return [0, 1]; // right
    case 'blue':
      return [0, -1]; // left
  }
}

function isPawnStartPos(color: PlayerColor, row: number, col: number): boolean {
  switch (color) {
    case 'white':
      return row === 12;
    case 'black':
      return row === 1;
    case 'red':
      return col === 1;
    case 'blue':
      return col === 12;
  }
}

function shouldPromote(color: PlayerColor, toRow: number, toCol: number): boolean {
  switch (color) {
    case 'white':
      return toRow === 0;
    case 'black':
      return toRow === 13;
    case 'red':
      return toCol === 13;
    case 'blue':
      return toCol === 0;
  }
}

export function getValidMoves(board: Cell[][], row: number, col: number): [number, number][] {
  const piece = board[row][col];
  if (!piece) return [];

  const moves: [number, number][] = [];
  const { type, color } = piece;

  const tryAdd = (r: number, c: number): boolean => {
    if (!isValidSquare(r, c)) return false;
    const target = board[r][c];
    if (target && target.color === color) return false;
    moves.push([r, c]);
    return !target; // true if empty → sliding continues
  };

  const slide = (dr: number, dc: number) => {
    for (let i = 1; i < BOARD_SIZE; i++) {
      if (!tryAdd(row + dr * i, col + dc * i)) break;
    }
  };

  switch (type) {
    case 'P': {
      const [dr, dc] = getPawnDirection(color);
      const r1 = row + dr,
        c1 = col + dc;
      if (isValidSquare(r1, c1) && !board[r1][c1]) {
        moves.push([r1, c1]);
        if (isPawnStartPos(color, row, col)) {
          const r2 = row + dr * 2,
            c2 = col + dc * 2;
          if (isValidSquare(r2, c2) && !board[r2][c2]) {
            moves.push([r2, c2]);
          }
        }
      }
      const capDirs: [number, number][] =
        dr !== 0 ? [[dr, -1], [dr, 1]] : [[-1, dc], [1, dc]];
      for (const [cdr, cdc] of capDirs) {
        const cr = row + cdr,
          cc = col + cdc;
        if (isValidSquare(cr, cc) && board[cr][cc] && board[cr][cc]!.color !== color) {
          moves.push([cr, cc]);
        }
      }
      break;
    }
    case 'R':
      slide(1, 0);
      slide(-1, 0);
      slide(0, 1);
      slide(0, -1);
      break;
    case 'B':
      slide(1, 1);
      slide(1, -1);
      slide(-1, 1);
      slide(-1, -1);
      break;
    case 'Q':
      slide(1, 0);
      slide(-1, 0);
      slide(0, 1);
      slide(0, -1);
      slide(1, 1);
      slide(1, -1);
      slide(-1, 1);
      slide(-1, -1);
      break;
    case 'K':
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr || dc) tryAdd(row + dr, col + dc);
        }
      }
      break;
    case 'N': {
      const jumps: [number, number][] = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1],
      ];
      for (const [dr, dc] of jumps) tryAdd(row + dr, col + dc);
      break;
    }
  }

  return moves;
}

export function applyMove(
  board: Cell[][],
  from: [number, number],
  to: [number, number],
): { newBoard: Cell[][]; captured: Cell } {
  const newBoard = board.map((r) => [...r]);
  const piece = newBoard[from[0]][from[1]];
  const captured = newBoard[to[0]][to[1]];
  newBoard[from[0]][from[1]] = null;

  if (piece) {
    if (piece.type === 'P' && shouldPromote(piece.color, to[0], to[1])) {
      newBoard[to[0]][to[1]] = { type: 'Q', color: piece.color };
    } else {
      newBoard[to[0]][to[1]] = piece;
    }
  }

  return { newBoard, captured };
}

export function isKingAlive(board: Cell[][], color: PlayerColor): boolean {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const p = board[r][c];
      if (p && p.type === 'K' && p.color === color) return true;
    }
  }
  return false;
}
