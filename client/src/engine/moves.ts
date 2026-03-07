import { Board, Position, PieceColor, PieceType, Square, Piece } from './types';

export const isOutOfBounds = (board: Board, r: number, c: number): boolean => {
  if (r < 0 || r >= 14 || c < 0 || c >= 14) return true;
  return board[r][c] === 'out-of-bounds';
};

export const getPiece = (board: Board, r: number, c: number): Piece | null => {
  if (isOutOfBounds(board, r, c)) return null;
  const sq = board[r][c];
  return sq === 'out-of-bounds' ? null : sq;
};

// Returns theoretically valid moves (ignoring check for now)
export const getLegalMoves = (board: Board, r: number, c: number): Position[] => {
  const piece = getPiece(board, r, c);
  if (!piece) return [];

  const moves: Position[] = [];
  const { type, color } = piece;

  const addMove = (nr: number, nc: number, canCapture: boolean = true): boolean => {
    if (isOutOfBounds(board, nr, nc)) return false; // hit boundary / out of bounds
    const target = getPiece(board, nr, nc);

    if (!target) {
      moves.push({ r: nr, c: nc });
      return true; // continue sliding
    } else {
      if (canCapture && target.color !== color) {
        moves.push({ r: nr, c: nc });
      }
      return false; // stop sliding (hit a piece)
    }
  };

  const traverseDirection = (dr: number, dc: number) => {
    let nr = r + dr;
    let nc = c + dc;
    while (addMove(nr, nc)) {
      nr += dr;
      nc += dc;
    }
  };

  if (type === 'rook' || type === 'queen') {
    traverseDirection(-1, 0); // Up
    traverseDirection(1, 0);  // Down
    traverseDirection(0, -1); // Left
    traverseDirection(0, 1);  // Right
  }

  if (type === 'bishop' || type === 'queen') {
    traverseDirection(-1, -1); // Top Left
    traverseDirection(-1, 1);  // Top Right
    traverseDirection(1, -1);  // Bottom Left
    traverseDirection(1, 1);   // Bottom Right
  }

  if (type === 'knight') {
    const jumps = [
      { dr: -2, dc: -1 }, { dr: -2, dc: 1 },
      { dr: 2, dc: -1 }, { dr: 2, dc: 1 },
      { dr: -1, dc: -2 }, { dr: 1, dc: -2 },
      { dr: -1, dc: 2 }, { dr: 1, dc: 2 },
    ];
    for (const jump of jumps) {
      addMove(r + jump.dr, c + jump.dc);
    }
  }

  if (type === 'king') {
    const steps = [
      { dr: -1, dc: -1 }, { dr: -1, dc: 0 }, { dr: -1, dc: 1 },
      { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
      { dr: 1, dc: -1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 },
    ];
    for (const step of steps) {
      addMove(r + step.dr, c + step.dc);
    }
  }

  if (type === 'pawn') {
    // Pawns move "forward" based on their start side
    // Red moves down (+1 r)
    // Blue moves up (-1 r)
    // Yellow moves right (+1 c)
    // Green moves left (-1 c)

    let forwardR = 0;
    let forwardC = 0;

    if (color === 'red') forwardR = 1;
    if (color === 'blue') forwardR = -1;
    if (color === 'yellow') forwardC = 1;
    if (color === 'green') forwardC = -1;

    // Move forward 1
    const nr = r + forwardR;
    const nc = c + forwardC;
    if (!isOutOfBounds(board, nr, nc) && !getPiece(board, nr, nc)) {
       moves.push({ r: nr, c: nc });
       // Move forward 2 if on start rank
       const rStart = (color === 'red' && r === 1) || (color === 'blue' && r === 12);
       const cStart = (color === 'yellow' && c === 1) || (color === 'green' && c === 12);

       if (rStart || cStart) {
         const nnr = r + forwardR * 2;
         const nnc = c + forwardC * 2;
         if (!isOutOfBounds(board, nnr, nnc) && !getPiece(board, nnr, nnc)) {
             moves.push({ r: nnr, c: nnc });
         }
       }
    }

    // Pawn captures diagonally forward
    const addPawnCapture = (dr: number, dc: number) => {
      const cr = r + dr;
      const cc = c + dc;
      if (!isOutOfBounds(board, cr, cc)) {
        const target = getPiece(board, cr, cc);
        if (target && target.color !== color) {
          moves.push({ r: cr, c: cc });
        }
      }
    };

    if (color === 'red' || color === 'blue') {
      addPawnCapture(forwardR, -1);
      addPawnCapture(forwardR, 1);
    } else {
      addPawnCapture(-1, forwardC);
      addPawnCapture(1, forwardC);
    }
  }

  return moves;
};
