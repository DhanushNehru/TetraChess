import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // For development
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3001;

io.on('connection', (socket: Socket) => {
  console.log(`User connected: ${socket.id}`);

  // Basic Matchmaking Logic
  socket.on('join_game', (roomId: string) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
    // Optionally emit game state here
  });

  socket.on('make_move', (data: { roomId: string, move: any }) => {
    // Validate move using shared engine
    // If legal:
    console.log(`Move made in ${data.roomId}`, data.move);
    socket.to(data.roomId).emit('update_board', data.move);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`TetraChess Server running on port ${PORT}`);
});
