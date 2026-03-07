import { Board, Square, PieceColor, PieceType } from './types';

// The board is 14x14.
// The corners are 3x3 blocks that are "out of bounds".
// 14 x 14 = 196 total squares
// 196 - (4 * 9) = 160 active squares.

export const createInitialBoard = (): Board => {
  const board: Board = Array(14)
    .fill(null)
    .map(() => Array(14).fill(null));

  // 1. Mark dead corners (3x3 blocks on the four corners)
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      board[r][c] = 'out-of-bounds'; // Top Left
      board[r][13 - c] = 'out-of-bounds'; // Top Right
      board[13 - r][c] = 'out-of-bounds'; // Bottom Left
      board[13 - r][13 - c] = 'out-of-bounds'; // Bottom Right
    }
  }

  // Helper to place a row of pieces
  const placeRow = (r: number, startC: number, color: PieceColor, typeOrder: PieceType[]) => {
    for (let i = 0; i < typeOrder.length; i++) {
        board[r][startC + i] = { color, type: typeOrder[i] };
    }
  };

  // Helper to place a column of pieces
  const placeCol = (startR: number, c: number, color: PieceColor, typeOrder: PieceType[]) => {
    for (let i = 0; i < typeOrder.length; i++) {
        board[startR + i][c] = { color, type: typeOrder[i] };
    }
  };

  const mainRowOrder: PieceType[] = ['rook', 'knight', 'bishop', 'king', 'queen', 'bishop', 'knight', 'rook'];
  const pawnRowOrder: PieceType[] = Array(8).fill('pawn');

  // Red (Top, moves down)
  placeRow(0, 3, 'red', mainRowOrder);
  placeRow(1, 3, 'red', pawnRowOrder);

  // Blue (Bottom, moves up) - King on Left, Queen on Right relative to the player
  // Actually, standard 4 player chess often reverses the king/queen depending on the side
  // Let's stick to a simple mapping for now.
  const blueRowOrder: PieceType[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
  placeRow(13, 3, 'blue', blueRowOrder);
  placeRow(12, 3, 'blue', pawnRowOrder);

  // Yellow (Left, moves right)
  const leftColOrder: PieceType[] = ['rook', 'knight', 'bishop', 'king', 'queen', 'bishop', 'knight', 'rook'];
  placeCol(3, 0, 'yellow', leftColOrder);
  placeCol(3, 1, 'yellow', pawnRowOrder);

  // Green (Right, moves left)
  const rightColOrder: PieceType[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
  placeCol(3, 13, 'green', rightColOrder);
  placeCol(3, 12, 'green', pawnRowOrder);

  return board;
};
