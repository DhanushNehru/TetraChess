import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';

const app = express();

// Important for deployment (e.g. Vercel frontend talking to Render backend)
const allowedOrigins = [
  'http://localhost:5173', // Dev frontend
  'https://tetrachess.vercel.app', // Example production Vercel frontend URL
  /\.vercel\.app$/ // Allow any vercel preview deployments
];

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST'],
  credentials: true
}));

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
});

const PORT = process.env.PORT || 3001;

// In-memory state for rooms (Note: For high production load, migrate this to Redis)
interface Room {
  id: string;
  players: string[];
}

const rooms: Record<string, Room> = {};

io.on('connection', (socket: Socket) => {
  console.log(`User connected: ${socket.id}`);

  // Send current rooms to the newly connected user
  socket.emit('room_list', Object.values(rooms).map(r => ({ id: r.id, count: r.players.length })));

  socket.on('create_room', (roomId: string) => {
     if (!rooms[roomId]) {
       rooms[roomId] = { id: roomId, players: [] };
     }
     io.emit('room_list', Object.values(rooms).map(r => ({ id: r.id, count: r.players.length })));
  });

  socket.on('join_game', (roomId: string) => {
    if (!rooms[roomId]) {
      rooms[roomId] = { id: roomId, players: [] };
    }

    if (rooms[roomId].players.length >= 4) {
      socket.emit('error', 'Room is full (max 4 players).');
      return;
    }

    socket.join(roomId);
    if (!rooms[roomId].players.includes(socket.id)) {
      rooms[roomId].players.push(socket.id);
    }

    console.log(`User ${socket.id} joined room ${roomId}`);
    io.emit('room_list', Object.values(rooms).map(r => ({ id: r.id, count: r.players.length })));
  });

  socket.on('make_move', (data: { roomId: string, move: any }) => {
    socket.to(data.roomId).emit('update_board', data.move);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);

    // Remove user
    for (const roomId in rooms) {
      rooms[roomId].players = rooms[roomId].players.filter(id => id !== socket.id);
      if (rooms[roomId].players.length === 0) {
        delete rooms[roomId];
      }
    }
    io.emit('room_list', Object.values(rooms).map(r => ({ id: r.id, count: r.players.length })));
  });
});

// Basic health check endpoint for hosting platforms
app.get('/health', (req, res) => {
  res.status(200).send('TetraChess Multiplayer Server is healthy and running.');
});

server.listen(PORT, () => {
  console.log(`TetraChess Server running on port ${PORT}`);
});
