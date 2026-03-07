export type PieceColor = 'red' | 'blue' | 'yellow' | 'green';
export type PieceType = 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king';

export interface Piece {
  color: PieceColor;
  type: PieceType;
  hasMoved?: boolean; // important for pawns and castling
}

export type Square = Piece | null | 'out-of-bounds';

export type Board = Square[][]; // 14x14

export interface Position {
  r: number;
  c: number;
}
