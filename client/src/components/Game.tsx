import React from 'react';
import { Socket } from 'socket.io-client';
import Board from './Board';
import '../styles/Game.css';

interface GameProps {
  roomId: string;
  socket: Socket;
  playerName: string;
}

const Game: React.FC<GameProps> = ({ roomId, socket, playerName }) => {
  return (
    <div className="game-container">
      <header className="game-header">
        <h2>TetraChess - Room: {roomId}</h2>
        <p>Player: {playerName}</p>
      </header>
      <div className="game-board">
        <Board board={[]} selectedSquare={null} validMoves={[]} onSquareClick={() => {}} />
      </div>
    </div>
  );
};

export default Game;