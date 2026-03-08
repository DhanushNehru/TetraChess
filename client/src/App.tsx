import { useState } from 'react';
import type { Socket } from 'socket.io-client';
import Lobby from './components/Lobby';
import Game from './components/Game';
import './App.css';

function App() {
  const [gameState, setGameState] = useState<'lobby' | 'game'>('lobby');
  const [roomId, setRoomId] = useState<string>('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [playerName, setPlayerName] = useState<string>('');

  const handleGameStart = (newRoomId: string, newSocket: Socket, newPlayerName: string) => {
    setRoomId(newRoomId);
    setSocket(newSocket);
    setPlayerName(newPlayerName);
    setGameState('game');
  };

  const handleReturnToLobby = () => {
    setGameState('lobby');
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    setRoomId('');
  };

  return (
    <div className="app">
      {gameState === 'lobby' ? (
        <Lobby onGameStart={handleGameStart} />
      ) : (
        <div>
          <button className="back-btn" onClick={handleReturnToLobby}>Back to Lobby</button>
          {socket && <Game roomId={roomId} socket={socket} playerName={playerName} />}
        </div>
      )}
    </div>
  );
}

export default App;
