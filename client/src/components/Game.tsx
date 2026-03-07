cd /workspaces/TetraChess/client/src && python3 << 'EOF'
import os

# Create Game.tsx
game_tsx = '''import React, { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import Board from './Board';
import '../styles/Game.css';

interface GameProps {
  roomId: string;
  socket: Socket;
  playerName: string;
}

interface GameState {
  board: string[][];
  players: string[];
  currentPlayer: number;
  moves: Array<{from: [number, number], to: [number, number]}>;
}

const Game: React.FC<GameProps> = ({ roomId, socket, playerName }) => {
  const [gameState, setGameState] = useState<GameState>({
    board: Array(14).fill(null).map(() => Array(14).fill('')),
    players: [],
    currentPlayer: 0,
    moves: []
  });
  const [selectedSquare, setSelectedSquare] = useState<[number, number] | null>(null);
  const [validMoves, setValidMoves] = useState<[number, number][]>([]);

  useEffect(() => {
    socket.on('board_state', (state) => {
      setGameState(state);
    });

    socket.on('board_updated', (update) => {
      setGameState(prev => ({...prev, ...update}));
    });

    return () => {
      socket.off('board_state');
      socket.off('board_updated');
    };
  }, [socket]);

  const handleSquareClick = (row: number, col: number) => {
    if (!selectedSquare) {
      setSelectedSquare([row, col]);
      // Calculate valid moves for selected piece
      const moves = calculateValidMoves(row, col);
      setValidMoves(moves);
    } else {
      if (selectedSquare[0] === row && selectedSquare[1] === col) {
        setSelectedSquare(null);
        setValidMoves([]);
      } else {
        // Make move
        socket.emit('make_move', {
          from: selectedSquare,
          to: [row, col],
          roomId
        });
        setSelectedSquare(null);
        setValidMoves([]);
      }
    }
  };

  const calculateValidMoves = (row: number, col: number): [number, number][] => {
    // Placeholder - implement chess logic
    return [];
  };

  return (
    <div className="game-container">
      <header className="game-header">
        <h2>TetraChess Room: {roomId}</h2>
        <div className="game-info">
          <p>Players: {gameState.players.join(", ")}</p>
          <p>Current Turn: {gameState.players[gameState.currentPlayer]}</p>
        </div>
      </header>
      <div className="game-board">
        <Board
          board={gameState.board}
          selectedSquare={selectedSquare}
          validMoves={validMoves}
          onSquareClick={handleSquareClick}
        />
      </div>
    </div>
  );
};

export default Game;'''

with open('components/Game.tsx', 'w') as f:
    f.write(game_tsx)

print("✅ Created Game.tsx")
EOF
