import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';

const app = express();

const configuredOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = configuredOrigins.length > 0
  ? configuredOrigins
  : ['http://localhost:5173', 'https://tetrachess.vercel.app'];

const allowedOriginSet = new Set(allowedOrigins);
const vercelPreviewRegex = /^https:\/\/[a-z0-9-]+\.vercel\.app$/;

const isAllowedOrigin = (origin?: string) => {
  if (!origin) return true;
  if (allowedOriginSet.has(origin)) return true;
  return vercelPreviewRegex.test(origin);
};

const corsOrigin: cors.CorsOptions['origin'] = (origin, callback) => {
  if (isAllowedOrigin(origin)) { callback(null, true); return; }
  callback(new Error(`CORS blocked for origin: ${origin}`));
};

app.use(cors({ origin: corsOrigin, methods: ['GET', 'POST'], credentials: true }));

const server = createServer(app);
const io = new Server(server, {
  cors: { origin: corsOrigin, methods: ['GET', 'POST'], credentials: true },
});

const PORT = process.env.PORT || 3001;

/* ── Types ── */
type PlayerColor = 'white' | 'red' | 'black' | 'blue';
const PLAYER_COLORS: PlayerColor[] = ['white', 'red', 'black', 'blue'];

interface Player {
  socketId: string;
  name: string;
  color: PlayerColor;
  alive: boolean;
}

interface GameRoom {
  id: string;
  players: Player[];
  started: boolean;
  currentTurnColor: PlayerColor;
}

const rooms: Record<string, GameRoom> = {};

/* ── Helpers ── */
const sanitize = (v: string) => v.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24);

function nextTurn(room: GameRoom): PlayerColor {
  const cur = PLAYER_COLORS.indexOf(room.currentTurnColor);
  for (let i = 1; i <= 4; i++) {
    const color = PLAYER_COLORS[(cur + i) % 4];
    if (room.players.some((p) => p.color === color && p.alive)) return color;
  }
  return room.currentTurnColor;
}

function roomSummary(room: GameRoom) {
  return {
    id: room.id,
    count: room.players.length,
    started: room.started,
    players: room.players.map((p) => ({ name: p.name, color: p.color, alive: p.alive })),
  };
}

function broadcastRooms() {
  io.emit('room_list', Object.values(rooms).map(roomSummary));
}

function cleanupRoom(roomId: string) {
  const room = rooms[roomId];
  if (!room) return;
  if (room.players.length === 0 || (room.started && !room.players.some((p) => p.alive))) {
    delete rooms[roomId];
  }
}

/* ── Socket events ── */
io.on('connection', (socket: Socket) => {
  console.log(`Connected: ${socket.id}`);
  socket.emit('room_list', Object.values(rooms).map(roomSummary));

  /* Create room */
  socket.on('create_room', (rawId: unknown) => {
    if (typeof rawId !== 'string') return;
    const id = sanitize(rawId);
    if (!id) return;
    if (!rooms[id]) {
      rooms[id] = { id, players: [], started: false, currentTurnColor: 'white' };
    }
    broadcastRooms();
  });

  /* Join game */
  socket.on('join_game', (data: unknown) => {
    if (!data || typeof data !== 'object') return;
    const { roomId: rawId, playerName: rawName } = data as Record<string, unknown>;
    if (typeof rawId !== 'string' || typeof rawName !== 'string') return;

    const roomId = sanitize(rawId);
    const playerName = rawName.trim().slice(0, 20);
    if (!roomId || !playerName) { socket.emit('error', 'Invalid room ID or name.'); return; }

    if (!rooms[roomId]) {
      rooms[roomId] = { id: roomId, players: [], started: false, currentTurnColor: 'white' };
    }

    const room = rooms[roomId];
    if (room.started) { socket.emit('error', 'Game already in progress.'); return; }
    if (room.players.length >= 4) { socket.emit('error', 'Room is full (4/4).'); return; }
    if (room.players.some((p) => p.socketId === socket.id)) { socket.emit('error', 'Already in this room.'); return; }

    const color = PLAYER_COLORS[room.players.length];
    room.players.push({ socketId: socket.id, name: playerName, color, alive: true });
    socket.join(roomId);

    const playerList = room.players.map((p) => ({ name: p.name, color: p.color }));
    socket.emit('joined_game', { roomId, color, players: playerList });
    socket.to(roomId).emit('player_joined', { name: playerName, color, players: playerList });
    broadcastRooms();
  });

  /* Start game */
  socket.on('start_game', (rawId: unknown) => {
    if (typeof rawId !== 'string') return;
    const room = rooms[sanitize(rawId)];
    if (!room) return;
    if (!room.players.some((p) => p.socketId === socket.id)) return;
    if (room.started) return;
    if (room.players.length < 2) { socket.emit('error', 'Need at least 2 players.'); return; }

    room.started = true;
    room.currentTurnColor = room.players[0].color;

    io.to(room.id).emit('game_started', {
      players: room.players.map((p) => ({ name: p.name, color: p.color })),
      currentTurnColor: room.currentTurnColor,
      activeColors: room.players.map((p) => p.color),
    });
    broadcastRooms();
  });

  /* Make move */
  socket.on('make_move', (data: unknown) => {
    if (!data || typeof data !== 'object') return;
    const { roomId: rawId, from, to } = data as Record<string, unknown>;
    if (typeof rawId !== 'string' || !Array.isArray(from) || !Array.isArray(to)) return;

    const room = rooms[sanitize(rawId)];
    if (!room?.started) return;

    const player = room.players.find((p) => p.socketId === socket.id);
    if (!player || player.color !== room.currentTurnColor) {
      socket.emit('error', 'Not your turn.');
      return;
    }

    room.currentTurnColor = nextTurn(room);

    io.to(room.id).emit('move_made', {
      from,
      to,
      playerColor: player.color,
      playerName: player.name,
      nextTurnColor: room.currentTurnColor,
    });
  });

  /* King captured */
  socket.on('king_captured', (data: unknown) => {
    if (!data || typeof data !== 'object') return;
    const { roomId: rawId, color } = data as Record<string, unknown>;
    if (typeof rawId !== 'string' || typeof color !== 'string') return;

    const room = rooms[sanitize(rawId)];
    if (!room) return;

    const victim = room.players.find((p) => p.color === color);
    if (victim) victim.alive = false;

    const alive = room.players.filter((p) => p.alive);
    if (alive.length <= 1) {
      io.to(room.id).emit('game_over', {
        winnerColor: alive[0]?.color ?? null,
        winnerName: alive[0]?.name ?? null,
      });
    } else {
      io.to(room.id).emit('player_eliminated', { color, name: victim?.name });
      if (room.currentTurnColor === color) {
        room.currentTurnColor = nextTurn(room);
        io.to(room.id).emit('turn_changed', { currentTurnColor: room.currentTurnColor });
      }
    }
  });

  /* Disconnect */
  socket.on('disconnect', () => {
    console.log(`Disconnected: ${socket.id}`);
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const idx = room.players.findIndex((p) => p.socketId === socket.id);
      if (idx === -1) continue;

      const player = room.players[idx];
      if (room.started) {
        player.alive = false;
        io.to(roomId).emit('player_disconnected', { color: player.color, name: player.name });

        const alive = room.players.filter((p) => p.alive);
        if (alive.length <= 1) {
          io.to(roomId).emit('game_over', {
            winnerColor: alive[0]?.color ?? null,
            winnerName: alive[0]?.name ?? null,
          });
        } else if (room.currentTurnColor === player.color) {
          room.currentTurnColor = nextTurn(room);
          io.to(roomId).emit('turn_changed', { currentTurnColor: room.currentTurnColor });
        }
      } else {
        room.players.splice(idx, 1);
      }
      cleanupRoom(roomId);
    }
    broadcastRooms();
  });
});

app.get('/health', (_req, res) => {
  res.status(200).send('TetraChess healthy');
});

server.listen(PORT, () => {
  console.log(`TetraChess Server running on port ${PORT}`);
});
