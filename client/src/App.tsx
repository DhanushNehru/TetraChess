import React, { useState } from 'react';
import { Socket } from 'socket.io-client';
import Lobby from './components/Lobby';
import Game from './components/Game';
import './App.css';

function App() {
  const [gameState, setGameState] = useState<'lobby' | 'game'>('lobby');
  const [roomId, setRoomId] = useState<string>('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [playerName, setPlayerName] = useState<string>('');

  const handleGameStart = (newRoomId: string, newSocket: Socket) => {
    setRoomId(newRoomId);
    setSocket(newSocket);
    setGameState('game');
  };

  const handleReturnToLobby = () => {
    setGameState('lobby');
    if (socket) socket.disconnect();
  };

  return (
    <div className="app">
      {gameState === 'lobby' ? (
        <Lobby onGameStart={handleGameStart} />
      ) : (
        <div>
          <button className="back-btn" onClick={handleReturnToLobby}>← Back to Lobby</button>
          {socket && <Game roomId={roomId} socket={socket} playerName={playerName} />}
        </div>
      )}
    </div>
  );
}

export default App;
