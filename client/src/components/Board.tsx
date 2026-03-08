import Piece from './Piece';
import '../styles/Board.css';

interface BoardProps {
  board: string[][];
  onSquareClick: (row: number, col: number) => void;
  lastMove: [number, number] | null;
}

function Board({ board, onSquareClick, lastMove }: BoardProps) {
  return (
    <div className="chess-board" role="grid" aria-label="TetraChess board">
      {board.map((row, rowIndex) =>
        row.map((cell, colIndex) => {
          const isLastMove = lastMove?.[0] === rowIndex && lastMove?.[1] === colIndex;
          return (
            <button
              type="button"
              key={`${rowIndex}-${colIndex}`}
              className={`square ${isLastMove ? 'last-move' : ''}`.trim()}
              onClick={() => onSquareClick(rowIndex, colIndex)}
              aria-label={`Row ${rowIndex + 1} column ${colIndex + 1}`}
            >
              <Piece symbol={cell} />
            </button>
          );
        }),
      )}
    </div>
  );
}

export default Board;