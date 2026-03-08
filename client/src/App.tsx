import { useMemo, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { PlayerColor } from './types';
import Lobby from './components/Lobby';
import Game from './components/Game';
import './App.css';

function App() {
  const [gameState, setGameState] = useState<'lobby' | 'game'>('lobby');
  const [roomId, setRoomId] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [myColor, setMyColor] = useState<PlayerColor>('white');
  const [initialPlayers, setInitialPlayers] = useState<{ name: string; color: PlayerColor }[]>([]);

  const urlRoomId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room') || '';
  }, []);

  const handleGameStart = (
    newRoomId: string,
    newSocket: Socket,
    newPlayerName: string,
    color: PlayerColor,
    players: { name: string; color: PlayerColor }[],
  ) => {
    setRoomId(newRoomId);
    setSocket(newSocket);
    setPlayerName(newPlayerName);
    setMyColor(color);
    setInitialPlayers(players);
    setGameState('game');
  };

  const handleReturnToLobby = () => {
    if (socket) { socket.disconnect(); setSocket(null); }
    setRoomId('');
    setGameState('lobby');
    window.history.replaceState({}, '', window.location.pathname);
  };

  return (
    <div className="app">
      {gameState === 'lobby' ? (
        <Lobby onGameStart={handleGameStart} urlRoomId={urlRoomId} />
      ) : (
        socket && (
          <Game
            roomId={roomId}
            socket={socket}
            playerName={playerName}
            myColor={myColor}
            initialPlayers={initialPlayers}
            onLeave={handleReturnToLobby}
          />
        )
      )}
    </div>
  );
}

export default App;
