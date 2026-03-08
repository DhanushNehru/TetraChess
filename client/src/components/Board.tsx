import type { Cell, PlayerColor } from '../types';
import { isDeadZone } from '../gameLogic';
import Piece from './Piece';
import '../styles/Board.css';

interface BoardProps {
  board: Cell[][];
  onSquareClick: (row: number, col: number) => void;
  selectedSquare: [number, number] | null;
  validMoves: [number, number][];
  lastMove: { from: [number, number]; to: [number, number] } | null;
  myColor: PlayerColor;
  isMyTurn: boolean;
}

function Board({ board, onSquareClick, selectedSquare, validMoves, lastMove, myColor, isMyTurn }: BoardProps) {
  const isSelected = (r: number, c: number) =>
    selectedSquare?.[0] === r && selectedSquare?.[1] === c;

  const isValidMove = (r: number, c: number) =>
    validMoves.some(([vr, vc]) => vr === r && vc === c);

  const isLastMoveSquare = (r: number, c: number) =>
    (lastMove?.from[0] === r && lastMove?.from[1] === c) ||
    (lastMove?.to[0] === r && lastMove?.to[1] === c);

  return (
    <div className="chess-board" role="grid" aria-label="TetraChess board">
      {board.map((row, ri) =>
        row.map((cell, ci) => {
          if (isDeadZone(ri, ci)) {
            return <div key={`${ri}-${ci}`} className="square dead" />;
          }

          const selected = isSelected(ri, ci);
          const valid = isValidMove(ri, ci);
          const last = isLastMoveSquare(ri, ci);
          const isLight = (ri + ci) % 2 === 0;
          const canClick = isMyTurn && (valid || (cell !== null && cell.color === myColor));

          const classes = [
            'square',
            isLight ? 'light' : 'dark',
            selected ? 'selected' : '',
            valid ? 'valid-move' : '',
            last ? 'last-move' : '',
            canClick ? 'clickable' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              type="button"
              key={`${ri}-${ci}`}
              className={classes}
              onClick={() => onSquareClick(ri, ci)}
              aria-label={`Row ${ri + 1} column ${ci + 1}${cell ? ` ${cell.color} ${cell.type}` : ''}`}
            >
              {valid && !cell && <span className="move-dot" />}
              {valid && cell && <span className="capture-ring" />}
              <Piece piece={cell} />
            </button>
          );
        }),
      )}
    </div>
  );
}

export default Board;