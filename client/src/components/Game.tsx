import { useEffect, useMemo, useState } from 'react';
import type { Socket } from 'socket.io-client';
import Board from './Board';
import '../styles/Game.css';

interface GameProps {
  roomId: string;
  socket: Socket;
  playerName: string;
}

interface RoomSummary {
  id: string;
  count: number;
}

interface MovePayload {
  row: number;
  col: number;
  symbol: string;
  playerName: string;
}

const BOARD_SIZE = 14;

const createEmptyBoard = () =>
  Array.from({ length: BOARD_SIZE }, () => Array.from({ length: BOARD_SIZE }, () => ''));

function Game({ roomId, socket, playerName }: GameProps) {
  const [board, setBoard] = useState<string[][]>(() => createEmptyBoard());
  const [playerCount, setPlayerCount] = useState(1);
  const [statusText, setStatusText] = useState('Tap a square to place your symbol. Moves sync live to all players.');
  const [lastMove, setLastMove] = useState<[number, number] | null>(null);

  const playerSymbol = useMemo(() => {
    const normalized = playerName.trim().toUpperCase();
    return normalized ? normalized[0] : 'P';
  }, [playerName]);

  useEffect(() => {
    const handleRoomList = (rooms: RoomSummary[]) => {
      const active = rooms.find((room) => room.id === roomId);
      setPlayerCount(active ? active.count : 0);
    };

    const handleUpdateBoard = (payload: MovePayload) => {
      setBoard((currentBoard) => {
        if (!currentBoard[payload.row] || currentBoard[payload.row][payload.col] === undefined) {
          return currentBoard;
        }
        const nextBoard = currentBoard.map((row) => [...row]);
        nextBoard[payload.row][payload.col] = payload.symbol;
        return nextBoard;
      });
      setLastMove([payload.row, payload.col]);
      setStatusText(`${payload.playerName} placed ${payload.symbol} at ${payload.row + 1},${payload.col + 1}`);
    };

    const handleServerError = (message: string) => {
      setStatusText(message);
    };

    socket.on('room_list', handleRoomList);
    socket.on('update_board', handleUpdateBoard);
    socket.on('error', handleServerError);

    return () => {
      socket.off('room_list', handleRoomList);
      socket.off('update_board', handleUpdateBoard);
      socket.off('error', handleServerError);
    };
  }, [roomId, socket]);

  const handleSquareClick = (row: number, col: number) => {
    if (board[row][col]) {
      setStatusText('Square already occupied. Choose another square.');
      return;
    }

    const movePayload: MovePayload = { row, col, symbol: playerSymbol, playerName };
    setBoard((currentBoard) => {
      const nextBoard = currentBoard.map((cells) => [...cells]);
      nextBoard[row][col] = playerSymbol;
      return nextBoard;
    });
    setLastMove([row, col]);
    setStatusText(`You placed ${playerSymbol} at ${row + 1},${col + 1}`);
    socket.emit('make_move', { roomId, move: movePayload });
  };

  const clearBoardForRoom = () => {
    setBoard(createEmptyBoard());
    setLastMove(null);
    setStatusText('Board cleared for this browser tab.');
  };

  return (
    <div className="game-container">
      <header className="game-header">
        <h2>TetraChess - Room {roomId}</h2>
        <p>Player: {playerName} ({playerSymbol})</p>
        <p>Players in room: {playerCount}/4</p>
        <p className="status-line">{statusText}</p>
        <button className="btn-clear" onClick={clearBoardForRoom}>Clear Board (local)</button>
      </header>
      <div className="game-board">
        <Board board={board} onSquareClick={handleSquareClick} lastMove={lastMove} />
      </div>
    </div>
  );
}

export default Game;