import React from 'react';
import '../styles/Board.css';

interface BoardProps {
  board: string[][];
  selectedSquare: [number, number] | null;
  validMoves: [number, number][];
  onSquareClick: (row: number, col: number) => void;
}

const Board: React.FC<BoardProps> = ({ board, selectedSquare, validMoves, onSquareClick }) => {
  const colors = ['red-square', 'blue-square', 'yellow-square', 'green-square'];

  return (
    <div className="chess-board">
      {board.map((row, rowIdx) => (
        row.map((piece, colIdx) => {
          const isSelected = selectedSquare && selectedSquare[0] === rowIdx && selectedSquare[1] === colIdx;
          const isValidMove = validMoves.some(m => m[0] === rowIdx && m[1] === colIdx);
          const colorClass = colors[(rowIdx + colIdx) % 4];

          return (
            <div
              key={`${rowIdx}-${colIdx}`}
              className={`square ${colorClass} ${isSelected ? 'selected' : ''} ${isValidMove ? 'valid-move' : ''}`}
              onClick={() => onSquareClick(rowIdx, colIdx)}
            >
              {piece && <span className="piece">{piece}</span>}
            </div>
          );
        })
      ))}
    </div>
  );
};

export default Board;
