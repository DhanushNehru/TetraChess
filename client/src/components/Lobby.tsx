import React, { useState } from "react";
import { Socket } from "socket.io-client";

interface LobbyProps { onGameStart: (roomId: string, socket: Socket) => void; }

const Lobby: React.FC<LobbyProps> = () => {
  const [name, setName] = useState("");
  return <div className="lobby"><h1>TetraChess</h1><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" /></div>;
};

export default Lobby;