export type PieceType = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P';
export type PlayerColor = 'white' | 'red' | 'black' | 'blue';

export interface ChessPiece {
  type: PieceType;
  color: PlayerColor;
}

export type Cell = ChessPiece | null;
