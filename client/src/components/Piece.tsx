import type { ChessPiece } from '../types';

interface PieceProps {
  piece: ChessPiece | null;
}

const PIECE_UNICODE: Record<string, string> = {
  K: '♚',
  Q: '♛',
  R: '♜',
  B: '♝',
  N: '♞',
  P: '♟',
};

function Piece({ piece }: PieceProps) {
  if (!piece) return null;

  return (
    <span className={`piece ${piece.color}`}>
      {PIECE_UNICODE[piece.type] || piece.type}
    </span>
  );
}

export default Piece;