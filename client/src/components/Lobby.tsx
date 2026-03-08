import { useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { PlayerColor } from '../types';
import '../styles/Lobby.css';

interface RoomSummary {
  id: string;
  count: number;
  started: boolean;
}

interface LobbyProps {
  onGameStart: (
    roomId: string,
    socket: Socket,
    playerName: string,
    color: PlayerColor,
    players: { name: string; color: PlayerColor }[],
  ) => void;
  urlRoomId: string;
}

const DEFAULT_SERVER_URL =
  window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://tetrachess.onrender.com';
const SERVER_URL = import.meta.env.VITE_SERVER_URL || DEFAULT_SERVER_URL;

const sanitizeRoomId = (v: string) => v.trim().replace(/\s+/g, '-').slice(0, 24);

function Lobby({ onGameStart, urlRoomId }: LobbyProps) {
  const socketRef = useRef<Socket | null>(null);
  const joinedRoomRef = useRef(false);
  const pendingJoinRef = useRef('');
  const playerNameRef = useRef('');

  const [name, setName] = useState('');
  const [roomInput, setRoomInput] = useState(urlRoomId || '');
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [status, setStatus] = useState('Connecting...');
  const [error, setError] = useState('');
  const [joiningRoomId, setJoiningRoomId] = useState('');
  const [showRules, setShowRules] = useState(false);

  useEffect(() => { playerNameRef.current = name.trim(); }, [name]);

  useEffect(() => {
    const socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => { setStatus('Connected'); setError(''); });
    socket.on('connect_error', () => {
      setStatus('Server unavailable');
      setError('Cannot reach server. Try again later.');
    });

    socket.on('room_list', (incoming: RoomSummary[]) => {
      setRooms([...incoming].sort((a, b) => b.count - a.count));
    });

    socket.on('joined_game', (payload: { roomId: string; color: PlayerColor; players: { name: string; color: PlayerColor }[] }) => {
      if (!playerNameRef.current) { setError('Enter your name first.'); return; }
      if (pendingJoinRef.current && payload.roomId !== pendingJoinRef.current) return;
      joinedRoomRef.current = true;
      pendingJoinRef.current = '';
      setJoiningRoomId('');
      onGameStart(payload.roomId, socket, playerNameRef.current, payload.color, payload.players);
    });

    socket.on('error', (msg: string) => {
      pendingJoinRef.current = '';
      setJoiningRoomId('');
      setError(msg);
    });

    return () => {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('room_list');
      socket.off('joined_game');
      socket.off('error');
      if (!joinedRoomRef.current) socket.disconnect();
    };
  }, [onGameStart]);

  const playerName = useMemo(() => name.trim(), [name]);

  const joinRoom = (rawId: string) => {
    const roomId = sanitizeRoomId(rawId);
    if (!playerName) { setError('Enter your name first.'); return; }
    if (!roomId) { setError('Enter a room ID.'); return; }
    const socket = socketRef.current;
    if (!socket) { setError('Connecting...'); return; }
    setError('');
    pendingJoinRef.current = roomId;
    setJoiningRoomId(roomId);
    socket.emit('join_game', { roomId, playerName });
  };

  const createAndJoin = () => {
    const roomId = sanitizeRoomId(roomInput);
    if (!roomId) { setError('Enter a room ID.'); return; }
    const socket = socketRef.current;
    if (!socket) { setError('Connecting...'); return; }
    socket.emit('create_room', roomId);
    joinRoom(roomId);
  };

  return (
    <div className="lobby-container">
      <div className="lobby-card">
        <h1>♚ TetraChess</h1>
        <div className="header-row">
          <p className="subtitle">4-player chess. Create a room, share the link, and battle!</p>
          <a
            className="btn btn-github"
            href="https://github.com/DhanushNehru/TetraChess"
            target="_blank"
            rel="noopener noreferrer"
          >
            ⭐ Star on GitHub
          </a>
        </div>
        <p className={`status-line ${status === 'Connected' ? 'connected' : 'disconnected'}`}>{status}</p>

        {urlRoomId && (
          <div className="invite-banner">
            You've been invited to room <strong>{urlRoomId}</strong>. Enter your name and click Join!
          </div>
        )}

        <div className="form-row">
          <label htmlFor="name">Your Name</label>
          <input
            id="name"
            className="text-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Dhanush"
            maxLength={20}
          />
        </div>

        <div className="form-row">
          <label htmlFor="room">Room ID</label>
          <div className="inline-row">
            <input
              id="room"
              className="text-input"
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
              placeholder="my-chess-room"
              maxLength={24}
            />
            <button className="btn btn-primary" onClick={createAndJoin}>Create &amp; Join</button>
          </div>
        </div>

        {error && <p className="error-line">{error}</p>}

        <div className="rooms-section">
          <h2>Live Rooms</h2>
          {rooms.length === 0 ? (
            <p className="empty-state">No rooms yet. Create one and invite friends!</p>
          ) : (
            <div className="rooms-grid">
              {rooms.map((room) => (
                <div className="room-card" key={room.id}>
                  <div>
                    <h3>{room.id}</h3>
                    <p>{room.count}/4 players{room.started ? ' · In Game' : ''}</p>
                  </div>
                  <button
                    className="btn btn-secondary"
                    disabled={room.count >= 4 || room.started}
                    onClick={() => joinRoom(room.id)}
                  >
                    {room.started ? 'In Game' : room.count >= 4 ? 'Full' : joiningRoomId === room.id ? 'Joining…' : 'Join'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rules-toggle">
          <button className="btn btn-rules" onClick={() => setShowRules(!showRules)}>
            {showRules ? 'Hide Rules ▲' : 'How to Play ▼'}
          </button>
        </div>

        {showRules && (
          <div className="rules-content">
            <h3>How to Play TetraChess</h3>
            <div className="rules-list">
              <div>
                <h4>🎯 Goal</h4>
                <p>Capture enemy Kings to eliminate opponents. Last player standing wins!</p>
              </div>
              <div>
                <h4>🎮 Getting Started</h4>
                <ol>
                  <li>Enter your name and create a room (or join an existing one)</li>
                  <li>Share the invite link with up to 3 friends</li>
                  <li>Click &quot;Start Game&quot; when at least 2 players have joined</li>
                </ol>
              </div>
              <div>
                <h4>🏁 Gameplay</h4>
                <ul>
                  <li>4 armies on a 14×14 cross-shaped board (corners are dead zones)</li>
                  <li>Turn order: White (South) → Red (West) → Black (North) → Blue (East)</li>
                  <li>Click a piece to see valid moves, then click where to move</li>
                  <li>Standard chess piece movement rules apply</li>
                  <li>Pawns automatically promote to Queens at the far edge</li>
                </ul>
              </div>
              <div>
                <h4>♟ Pieces</h4>
                <ul>
                  <li><strong>King ♚</strong> — 1 square, any direction</li>
                  <li><strong>Queen ♛</strong> — any distance, any direction</li>
                  <li><strong>Rook ♜</strong> — straight lines (horizontal / vertical)</li>
                  <li><strong>Bishop ♝</strong> — diagonals only</li>
                  <li><strong>Knight ♞</strong> — L-shape jumps (can leap over pieces)</li>
                  <li><strong>Pawn ♟</strong> — forward 1 (or 2 from start), captures diagonally</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      <footer className="site-footer">
        <p>Made with ♟ by <strong>Dhanush Nehru</strong></p>
        <div className="social-links">
          <a href="https://github.com/DhanushNehru" target="_blank" rel="noopener noreferrer" title="GitHub">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57L9 21.07c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .1-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6.02 0c2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.25 2.88.12 3.18a4.65 4.65 0 0 1 1.24 3.22c0 4.61-2.81 5.63-5.48 5.92.42.36.81 1.1.81 2.22l-.01 3.29c0 .31.21.69.82.57A12 12 0 0 0 12 .3"/></svg>
          </a>
          <a href="https://x.com/Dhanush_Nehru" target="_blank" rel="noopener noreferrer" title="X (Twitter)">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </a>
          <a href="https://instagram.com/dhanush_nehru" target="_blank" rel="noopener noreferrer" title="Instagram">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8A3.6 3.6 0 0 0 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6A3.6 3.6 0 0 0 16.4 4zm9.65 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10m0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6"/></svg>
          </a>
          <a href="https://www.youtube.com/@dhanushnehru" target="_blank" rel="noopener noreferrer" title="YouTube">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.55A3.02 3.02 0 0 0 .5 6.19 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14c1.88.55 9.38.55 9.38.55s7.5 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.81zM9.75 15.02V8.98L15.5 12z"/></svg>
          </a>
        </div>
      </footer>
    </div>
  );
}

export default Lobby;