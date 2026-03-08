import React from 'react';
import '../styles/Board.css';

interface BoardProps {
  board: any[][];
  selectedSquare: [number, number] | null;
  validMoves: [number, number][];
  onSquareClick: (row: number, col: number) => void;
}

const Board: React.FC<BoardProps> = ({ board, selectedSquare, validMoves, onSquareClick }) => {
  return <div className="chess-board">Game Board Loading...</div>;
};

export default Board;