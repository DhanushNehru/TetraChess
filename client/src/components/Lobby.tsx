import { useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import '../styles/Lobby.css';

interface RoomSummary {
  id: string;
  count: number;
}

interface LobbyProps {
  onGameStart: (roomId: string, socket: Socket, playerName: string) => void;
}

interface JoinSuccessPayload {
  roomId: string;
}

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

const sanitizeRoomId = (value: string) => value.trim().replace(/\s+/g, '-').slice(0, 24);

function Lobby({ onGameStart }: LobbyProps) {
  const socketRef = useRef<Socket | null>(null);
  const joinedRoomRef = useRef(false);
  const pendingJoinRef = useRef('');
  const playerNameRef = useRef('');
  const [name, setName] = useState('');
  const [roomInput, setRoomInput] = useState('');
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [status, setStatus] = useState('Connecting...');
  const [error, setError] = useState('');
  const [joiningRoomId, setJoiningRoomId] = useState('');

  useEffect(() => {
    playerNameRef.current = name.trim();
  }, [name]);

  useEffect(() => {
    const socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });
    socketRef.current = socket;

    const handleConnect = () => {
      setStatus('Connected to multiplayer server');
      setError('');
    };

    const handleConnectError = () => {
      setStatus('Server unavailable');
      setError('Could not reach backend. Check VITE_SERVER_URL and CORS settings.');
    };

    const handleRoomList = (incomingRooms: RoomSummary[]) => {
      const sortedRooms = [...incomingRooms].sort((a, b) => b.count - a.count);
      setRooms(sortedRooms);
    };

    const handleJoinSuccess = (payload: JoinSuccessPayload) => {
      const activeName = playerNameRef.current;
      if (!activeName) {
        setError('Enter your name before joining a room.');
        return;
      }

      if (pendingJoinRef.current && payload.roomId !== pendingJoinRef.current) {
        return;
      }

      joinedRoomRef.current = true;
      pendingJoinRef.current = '';
      setJoiningRoomId('');
      onGameStart(payload.roomId, socket, activeName);
    };

    const handleServerError = (message: string) => {
      pendingJoinRef.current = '';
      setJoiningRoomId('');
      setError(message);
    };

    socket.on('connect', handleConnect);
    socket.on('connect_error', handleConnectError);
    socket.on('room_list', handleRoomList);
    socket.on('joined_game', handleJoinSuccess);
    socket.on('error', handleServerError);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('connect_error', handleConnectError);
      socket.off('room_list', handleRoomList);
      socket.off('joined_game', handleJoinSuccess);
      socket.off('error', handleServerError);
      if (!joinedRoomRef.current) {
        socket.disconnect();
      }
    };
  }, [onGameStart]);

  const playerName = useMemo(() => name.trim(), [name]);

  const joinRoom = (rawRoomId: string) => {
    const roomId = sanitizeRoomId(rawRoomId);
    if (!playerName) {
      setError('Enter your name before joining a room.');
      return;
    }

    if (!roomId) {
      setError('Enter a valid room id.');
      return;
    }

    const socket = socketRef.current;
    if (!socket) {
      setError('Socket not ready yet. Please wait.');
      return;
    }

    setError('');
    pendingJoinRef.current = roomId;
    setJoiningRoomId(roomId);
    socket.emit('join_game', roomId);
  };

  const createAndJoinRoom = () => {
    const roomId = sanitizeRoomId(roomInput);
    if (!roomId) {
      setError('Provide a room id to create.');
      return;
    }

    const socket = socketRef.current;
    if (!socket) {
      setError('Socket not ready yet. Please wait.');
      return;
    }

    socket.emit('create_room', roomId);
    joinRoom(roomId);
  };

  return (
    <div className="lobby-container">
      <div className="lobby-card">
        <h1>TetraChess</h1>
        <p className="subtitle">Create a room, share the room id, and play with up to 4 players.</p>
        <p className="status-line">{status}</p>

        <div className="form-row">
          <label htmlFor="name">Your name</label>
          <input
            id="name"
            className="text-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Example: Dhanush"
            maxLength={20}
          />
        </div>

        <div className="form-row">
          <label htmlFor="room">Room id</label>
          <div className="inline-row">
            <input
              id="room"
              className="text-input"
              value={roomInput}
              onChange={(event) => setRoomInput(event.target.value)}
              placeholder="example-room"
              maxLength={24}
            />
            <button className="btn btn-primary" onClick={createAndJoinRoom}>Create + Join</button>
          </div>
        </div>

        {error && <p className="error-line">{error}</p>}

        <div className="rooms-section">
          <h2>Live Rooms</h2>
          {rooms.length === 0 ? (
            <p className="empty-state">No rooms yet. Create one and invite friends.</p>
          ) : (
            <div className="rooms-grid">
              {rooms.map((room) => (
                <div className="room-card" key={room.id}>
                  <div>
                    <h3>{room.id}</h3>
                    <p>{room.count}/4 players</p>
                  </div>
                  <button
                    className="btn btn-secondary"
                    disabled={room.count >= 4}
                    onClick={() => joinRoom(room.id)}
                  >
                    {room.count >= 4 ? 'Full' : joiningRoomId === room.id ? 'Joining...' : 'Join'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Lobby;