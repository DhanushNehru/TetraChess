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
        <p className="subtitle">4-player chess. Create a room, share the link, and battle!</p>
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
    </div>
  );
}

export default Lobby;