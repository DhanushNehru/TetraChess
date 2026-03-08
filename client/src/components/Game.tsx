import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { Cell, PlayerColor } from '../types';
import {
  COLOR_NAMES,
  COLOR_SIDES,
  applyMove,
  createInitialBoard,
  getValidMoves,
} from '../gameLogic';
import Board from './Board';
import '../styles/Game.css';

interface GameProps {
  roomId: string;
  socket: Socket;
  playerName: string;
  myColor: PlayerColor;
  initialPlayers: { name: string; color: PlayerColor }[];
  onLeave: () => void;
}

type Phase = 'waiting' | 'playing' | 'ended';

function Game({ roomId, socket, playerName, myColor, initialPlayers, onLeave }: GameProps) {
  const [phase, setPhase] = useState<Phase>('waiting');
  const [board, setBoard] = useState<Cell[][]>(() => createInitialBoard());
  const [selectedSquare, setSelectedSquare] = useState<[number, number] | null>(null);
  const [validMoves, setValidMoves] = useState<[number, number][]>([]);
  const [currentTurnColor, setCurrentTurnColor] = useState<PlayerColor>('white');
  const [players, setPlayers] = useState(initialPlayers);
  const [eliminated, setEliminated] = useState<Set<PlayerColor>>(new Set());
  const [lastMove, setLastMove] = useState<{ from: [number, number]; to: [number, number] } | null>(null);
  const [statusText, setStatusText] = useState('Waiting for players to join…');
  const [showRules, setShowRules] = useState(false);
  const [winner, setWinner] = useState<{ color: PlayerColor; name: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const myColorRef = useRef(myColor);
  const boardRef = useRef(board);
  boardRef.current = board;

  const isMyTurn = phase === 'playing' && currentTurnColor === myColor;

  /* ── Socket listeners ── */
  useEffect(() => {
    const onPlayerJoined = (data: { name: string; color: PlayerColor; players: { name: string; color: PlayerColor }[] }) => {
      setPlayers(data.players);
      setStatusText(`${data.name} joined as ${COLOR_NAMES[data.color]} (${COLOR_SIDES[data.color]})`);
    };

    const onGameStarted = (data: { players: { name: string; color: PlayerColor }[]; currentTurnColor: PlayerColor }) => {
      setPhase('playing');
      setPlayers(data.players);
      setCurrentTurnColor(data.currentTurnColor);
      setBoard(createInitialBoard());
      setSelectedSquare(null);
      setValidMoves([]);
      setLastMove(null);
      setEliminated(new Set());
      setStatusText(`Game started! ${COLOR_NAMES[data.currentTurnColor]}'s turn.`);
    };

    const onMoveMade = (data: { from: [number, number]; to: [number, number]; playerColor: PlayerColor; playerName: string; nextTurnColor: PlayerColor }) => {
      if (data.playerColor !== myColorRef.current) {
        setBoard((prev) => {
          const { newBoard } = applyMove(prev, data.from, data.to);
          return newBoard;
        });
      }
      setLastMove({ from: data.from, to: data.to });
      setCurrentTurnColor(data.nextTurnColor);
      setSelectedSquare(null);
      setValidMoves([]);

      const turnLabel = COLOR_NAMES[data.nextTurnColor];
      if (data.playerColor === myColorRef.current) {
        setStatusText(`Your move confirmed. ${turnLabel}'s turn.`);
      } else {
        setStatusText(`${data.playerName} (${COLOR_NAMES[data.playerColor]}) moved. ${turnLabel}'s turn.`);
      }
    };

    const onTurnChanged = (data: { currentTurnColor: PlayerColor }) => {
      setCurrentTurnColor(data.currentTurnColor);
    };

    const onPlayerEliminated = (data: { color: PlayerColor; name: string }) => {
      setEliminated((prev) => new Set([...prev, data.color]));
      setStatusText(`${data.name} (${COLOR_NAMES[data.color]}) eliminated!`);
    };

    const onPlayerDisconnected = (data: { color: PlayerColor; name: string }) => {
      setEliminated((prev) => new Set([...prev, data.color]));
      setStatusText(`${data.name} (${COLOR_NAMES[data.color]}) disconnected.`);
    };

    const onGameOver = (data: { winnerColor: PlayerColor | null; winnerName: string | null }) => {
      setPhase('ended');
      if (data.winnerColor && data.winnerName) {
        setWinner({ color: data.winnerColor, name: data.winnerName });
        setStatusText(`Game over! ${data.winnerName} (${COLOR_NAMES[data.winnerColor]}) wins!`);
      } else {
        setStatusText('Game over!');
      }
    };

    const onError = (msg: string) => setStatusText(msg);

    socket.on('player_joined', onPlayerJoined);
    socket.on('game_started', onGameStarted);
    socket.on('move_made', onMoveMade);
    socket.on('turn_changed', onTurnChanged);
    socket.on('player_eliminated', onPlayerEliminated);
    socket.on('player_disconnected', onPlayerDisconnected);
    socket.on('game_over', onGameOver);
    socket.on('error', onError);

    return () => {
      socket.off('player_joined', onPlayerJoined);
      socket.off('game_started', onGameStarted);
      socket.off('move_made', onMoveMade);
      socket.off('turn_changed', onTurnChanged);
      socket.off('player_eliminated', onPlayerEliminated);
      socket.off('player_disconnected', onPlayerDisconnected);
      socket.off('game_over', onGameOver);
      socket.off('error', onError);
    };
  }, [socket]);

  /* ── Click handler ── */
  const handleSquareClick = useCallback(
    (row: number, col: number) => {
      if (phase !== 'playing' || currentTurnColor !== myColorRef.current) return;

      const currentBoard = boardRef.current;
      const piece = currentBoard[row][col];

      // Move to highlighted square
      if (selectedSquare && validMoves.some(([r, c]) => r === row && c === col)) {
        const { newBoard, captured } = applyMove(currentBoard, selectedSquare, [row, col]);
        setBoard(newBoard);
        boardRef.current = newBoard;
        setLastMove({ from: selectedSquare, to: [row, col] });
        setSelectedSquare(null);
        setValidMoves([]);
        socket.emit('make_move', { roomId, from: selectedSquare, to: [row, col] });
        if (captured && captured.type === 'K') {
          socket.emit('king_captured', { roomId, color: captured.color });
        }
        return;
      }

      // Select own piece
      if (piece && piece.color === myColor) {
        setSelectedSquare([row, col]);
        setValidMoves(getValidMoves(currentBoard, row, col));
        return;
      }

      // Deselect
      setSelectedSquare(null);
      setValidMoves([]);
    },
    [phase, currentTurnColor, selectedSquare, validMoves, myColor, roomId, socket],
  );

  const startGame = () => socket.emit('start_game', roomId);

  const copyInviteLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(roomId)}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  /* ── Waiting room ── */
  if (phase === 'waiting') {
    return (
      <div className="game-container">
        <div className="waiting-room">
          <h1>Room: {roomId}</h1>
          <p className="your-info">
            You are <strong>{playerName}</strong> playing as{' '}
            <span className={`color-badge ${myColor}`}>{COLOR_NAMES[myColor]} ({COLOR_SIDES[myColor]})</span>
          </p>

          <div className="invite-section">
            <button className="btn btn-invite" onClick={copyInviteLink}>
              {copied ? '✓ Link Copied!' : '🔗 Copy Invite Link'}
            </button>
            <p className="invite-hint">Share this link with friends so they can join your room.</p>
          </div>

          <div className="players-list">
            <h2>Players ({players.length}/4)</h2>
            {players.map((p) => (
              <div key={p.color} className={`player-row ${p.color}`}>
                <span className={`color-dot ${p.color}`} />
                <span>{p.name}</span>
                <span className="color-label">{COLOR_NAMES[p.color]} ({COLOR_SIDES[p.color]})</span>
              </div>
            ))}
            {Array.from({ length: 4 - players.length }).map((_, i) => (
              <div key={`empty-${i}`} className="player-row empty">
                <span className="color-dot empty" />
                <span>Waiting for player…</span>
              </div>
            ))}
          </div>

          {players.length >= 2 && (
            <button className="btn btn-start" onClick={startGame}>
              Start Game ({players.length} players)
            </button>
          )}
          {players.length < 2 && (
            <p className="hint-text">Need at least 2 players to start. Share the invite link!</p>
          )}

          <button className="btn btn-secondary" onClick={() => setShowRules(!showRules)}>
            {showRules ? 'Hide Rules ▲' : 'How to Play ▼'}
          </button>
          {showRules && <RulesPanel />}

          <button className="btn btn-leave" onClick={onLeave}>Leave Room</button>
        </div>
        <p className="status-line">{statusText}</p>
      </div>
    );
  }

  /* ── Active game ── */
  return (
    <div className="game-container">
      <header className="game-header">
        <div className="header-top">
          <h2>Room: {roomId}</h2>
          <button className="btn btn-small" onClick={onLeave}>Leave</button>
        </div>
        <div className="header-info">
          <div className="turn-indicator">
            <span className={`color-dot ${currentTurnColor}`} />
            <span>{isMyTurn ? '✨ Your turn!' : `${COLOR_NAMES[currentTurnColor]}'s turn`}</span>
          </div>
          <div className="player-badges">
            {players.map((p) => (
              <span
                key={p.color}
                className={`badge ${p.color} ${eliminated.has(p.color) ? 'eliminated' : ''} ${p.color === currentTurnColor && phase === 'playing' ? 'active-turn' : ''}`}
              >
                {p.name}
              </span>
            ))}
          </div>
        </div>
        <p className="status-text">{statusText}</p>
        <div className="header-actions">
          <button className="btn btn-small" onClick={() => setShowRules(!showRules)}>
            {showRules ? 'Hide Rules' : '📖 Rules'}
          </button>
          <button className="btn btn-small" onClick={copyInviteLink}>
            {copied ? '✓ Copied' : '🔗 Invite'}
          </button>
        </div>
      </header>

      {showRules && <RulesPanel />}

      <div className="game-board">
        <Board
          board={board}
          onSquareClick={handleSquareClick}
          selectedSquare={selectedSquare}
          validMoves={validMoves}
          lastMove={lastMove}
          myColor={myColor}
          isMyTurn={isMyTurn}
        />
      </div>

      {phase === 'ended' && (
        <div className="game-over-overlay">
          <div className="game-over-card">
            <h2>Game Over!</h2>
            {winner ? (
              <p><span className={`color-badge ${winner.color}`}>{winner.name} ({COLOR_NAMES[winner.color]})</span> wins!</p>
            ) : (
              <p>No winner</p>
            )}
            <button className="btn btn-primary" onClick={onLeave}>Back to Lobby</button>
          </div>
        </div>
      )}
    </div>
  );
}

function RulesPanel() {
  return (
    <div className="rules-panel">
      <h3>How to Play TetraChess</h3>
      <div className="rules-grid">
        <div className="rule-section">
          <h4>Overview</h4>
          <ul>
            <li>4-player chess on a 14×14 cross-shaped board</li>
            <li>Each player controls an army on one side: South, West, North, or East</li>
            <li>Turn order: White → Red → Black → Blue (clockwise)</li>
            <li>Capture enemy Kings to eliminate players</li>
            <li>Last player standing wins!</li>
          </ul>
        </div>
        <div className="rule-section">
          <h4>How to Move</h4>
          <ul>
            <li>Click one of your pieces to select it</li>
            <li>Green dots show where you can move</li>
            <li>Click a highlighted square to move there</li>
            <li>Click elsewhere to deselect</li>
          </ul>
        </div>
        <div className="rule-section">
          <h4>Pieces</h4>
          <ul>
            <li><strong>♚ King</strong> — 1 square, any direction. Protect it!</li>
            <li><strong>♛ Queen</strong> — any distance, any direction</li>
            <li><strong>♜ Rook</strong> — straight lines only</li>
            <li><strong>♝ Bishop</strong> — diagonals only</li>
            <li><strong>♞ Knight</strong> — L-shape (2+1), jumps over pieces</li>
            <li><strong>♟ Pawn</strong> — forward 1 (2 from start), captures diagonally</li>
          </ul>
        </div>
        <div className="rule-section">
          <h4>Special Rules</h4>
          <ul>
            <li>Corner 3×3 zones are dead — no pieces allowed</li>
            <li>Pawns promote to Queens at the far edge</li>
            <li>When a King is captured, that player is eliminated</li>
            <li>Works with 2, 3, or 4 players</li>
            <li>Unoccupied armies remain as obstacles</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Game;