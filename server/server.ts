import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';

const app = express();

// CORS can be overridden in hosting env with:
// CORS_ORIGINS=https://tetrachess.vercel.app,https://your-custom-domain.com
const configuredOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = configuredOrigins.length > 0
  ? configuredOrigins
  : [
      'http://localhost:5173',
      'https://tetrachess.vercel.app',
    ];

const allowedOriginSet = new Set(allowedOrigins);
const vercelPreviewRegex = /^https:\/\/[a-z0-9-]+\.vercel\.app$/;

const isAllowedOrigin = (origin?: string) => {
  if (!origin) {
    // Allow non-browser requests (health checks, curl, etc.)
    return true;
  }

  if (allowedOriginSet.has(origin)) {
    return true;
  }

  return vercelPreviewRegex.test(origin);
};

const corsOrigin: cors.CorsOptions['origin'] = (origin, callback) => {
  if (isAllowedOrigin(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error(`CORS blocked for origin: ${origin}`));
};

app.use(cors({
  origin: corsOrigin,
  methods: ['GET', 'POST'],
  credentials: true
}));

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: corsOrigin,
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
    socket.emit('joined_game', { roomId });
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
