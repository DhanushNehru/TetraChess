import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';

interface Room {
    id: string;
    name: string;
    players: string[];
    maxPlayers: number;
}

interface LobbyProps {
    socket: Socket;
    onJoinRoom: (roomId: string, playerName: string) => void;
}

export const Lobby: React.FC<LobbyProps> = ({ socket, onJoinRoom }) => {
    const [playerName, setPlayerName] = useState('');
    const [rooms, setRooms] = useState<Room[]>([]);
    const [newRoomName, setNewRoomName] = useState('');
    const [isCreatingRoom, setIsCreatingRoom] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // Request initial room list
        socket.emit('get_rooms');

        // Listen for room list updates
        socket.on('rooms_list', (updatedRooms: Room[]) => {
            setRooms(updatedRooms);
        });

        // Listen for room created event
        socket.on('room_created', (room: Room) => {
            setRooms((prev) => [...prev, room]);
            setNewRoomName('');
            setIsCreatingRoom(false);
        });

        // Listen for room joined event
        socket.on('room_joined', (roomId: string) => {
            onJoinRoom(roomId, playerName);
        });

        // Listen for errors
        socket.on('error', (message: string) => {
            setError(message);
            setTimeout(() => setError(''), 3000);
        });

        return () => {
            socket.off('rooms_list');
            socket.off('room_created');
            socket.off('room_joined');
            socket.off('error');
        };
    }, [socket, onJoinRoom, playerName]);

    const handleCreateRoom = (e: React.FormEvent) => {
        e.preventDefault();
        if (!playerName.trim()) {
            setError('Please enter your name first');
            return;
        }
        if (!newRoomName.trim()) {
            setError('Please enter a room name');
            return;
        }
        socket.emit('create_room', { roomName: newRoomName, playerName });
    };

    const handleJoinRoom = (roomId: string) => {
        if (!playerName.trim()) {
            setError('Please enter your name first');
            return;
        }
        socket.emit('join_room', { roomId, playerName });
    };

    return (
        <div className="lobby-container" style={styles.container}>
            <h1 style={styles.title}>TetraChess Lobby</h1>

            {error && <div style={styles.error}>{error}</div>}

            <div style={styles.playerSection}>
                <input
                    type="text"
                    placeholder="Enter your name"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    style={styles.input}
                    maxLength={20}
                />
            </div>

            <div style={styles.createRoomSection}>
                <h2 style={styles.subtitle}>Create a New Room</h2>
                <form onSubmit={handleCreateRoom} style={styles.form}>
                    <input
                        type="text"
                        placeholder="Room name"
                        value={newRoomName}
                        onChange={(e) => setNewRoomName(e.target.value)}
                        style={styles.input}
                        maxLength={30}
                        disabled={isCreatingRoom}
                    />
                    <button
                        type="submit"
                        style={styles.button}
                        disabled={!playerName.trim() || isCreatingRoom}
                    >
                        {isCreatingRoom ? 'Creating...' : 'Create Room'}
                    </button>
                </form>
            </div>

            <div style={styles.roomsSection}>
                <h2 style={styles.subtitle}>Available Rooms ({rooms.length})</h2>
                {rooms.length === 0 ? (
                    <p style={styles.noRooms}>No active rooms. Create one to get started!</p>
                ) : (
                    <div style={styles.roomsList}>
                        {rooms.map((room) => (
                            <div key={room.id} style={styles.roomCard}>
                                <div style={styles.roomInfo}>
                                    <h3 style={styles.roomName}>{room.name}</h3>
                                    <p style={styles.roomPlayers}>
                                        Players: {room.players.length}/{room.maxPlayers}
                                    </p>
                                    <p style={styles.playerList}>
                                        {room.players.length > 0
                                            ? room.players.join(', ')
                                            : 'No players yet'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleJoinRoom(room.id)}
                                    style={{
                                        ...styles.joinButton,
                                        ...(room.players.length >= room.maxPlayers
                                            ? styles.disabledButton
                                            : {}),
                                    }}
                                    disabled={
                                        room.players.length >= room.maxPlayers ||
                                        !playerName.trim()
                                    }
                                >
                                    {room.players.length >= room.maxPlayers
                                        ? 'Room Full'
                                        : 'Join'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const styles = {
    container: {
        maxWidth: '1000px',
        margin: '0 auto',
        padding: '20px',
        fontFamily: 'Arial, sans-serif',
    },
    title: {
        textAlign: 'center' as const,
        color: '#333',
        marginBottom: '30px',
    },
    subtitle: {
        color: '#555',
        marginBottom: '15px',
        fontSize: '18px',
    },
    error: {
        backgroundColor: '#ffebee',
        color: '#c62828',
        padding: '12px',
        borderRadius: '4px',
        marginBottom: '20px',
        textAlign: 'center' as const,
    },
    playerSection: {
        marginBottom: '30px',
    },
    input: {
        width: '100%',
        padding: '10px',
        fontSize: '16px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        boxSizing: 'border-box' as const,
    },
    createRoomSection: {
        backgroundColor: '#f5f5f5',
        padding: '20px',
        borderRadius: '6px',
        marginBottom: '30px',
    },
    form: {
        display: 'flex' as const,
        gap: '10px',
    },
    button: {
        padding: '10px 20px',
        backgroundColor: '#4CAF50',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '16px',
        minWidth: '140px',
    },
    roomsSection: {
        marginTop: '30px',
    },
    noRooms: {
        textAlign: 'center' as const,
        color: '#999',
        fontSize: '16px',
        padding: '40px 20px',
    },
    roomsList: {
        display: 'grid' as const,
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '15px',
    },
    roomCard: {
        backgroundColor: '#fff',
        border: '1px solid #ddd',
        borderRadius: '6px',
        padding: '15px',
        display: 'flex' as const,
        flexDirection: 'column' as const,
        justifyContent: 'space-between',
    },
    roomInfo: {
        marginBottom: '15px',
    },
    roomName: {
        margin: '0 0 8px 0',
        color: '#333',
    },
    roomPlayers: {
        margin: '0 0 8px 0',
        color: '#666',
        fontSize: '14px',
    },
    playerList: {
        margin: '0',
        color: '#999',
        fontSize: '13px',
        fontStyle: 'italic' as const,
    },
    joinButton: {
        padding: '10px',
        backgroundColor: '#2196F3',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
    },
    disabledButton: {
        backgroundColor: '#ccc',
        cursor: 'not-allowed',
    },
};