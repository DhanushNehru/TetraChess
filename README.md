# TetraChess

<div align="center">
  <h3>A modern, open-source 4-Player Chess variant built for the web.</h3>
  <img src="https://img.shields.io/github/license/DhanushNehru/TetraChess" alt="License" />
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square" alt="PRs Welcome" />
</div>

<br />

**TetraChess** is a real-time multiplayer chess engine and web application that supports 4 players simultaneously on a custom `14x14` grid. This repository includes everything you need to run both the frontend React client and the backend Node WebSocket server.

## ✨ Features

- **Custom 4-Player Game Engine**: Ground-up TypeScript engine that calculates moves for Red, Blue, Yellow, and Green players simultaneously across 160 active squares.
- **Real-Time Multiplayer**: Instantaneous, bidirectional board state synchronization powered by WebSockets (`Socket.IO`).
- **Dynamic Lobby System**: Create private rooms to play with friends, or browse a live updating list of active public rooms to join.
- **Memory Optimized**: The backend server auto-collects garbage and cleans up empty rooms to ensure performance at scale limit (capped strictly at 4 peers per room).
- **Modern UI**: Polished drag-and-drop React interface utilizing `tailwindcss` principles, glassmorphism aesthetics, and clean minimal chess typography.

## 🛠️ Tech Stack

**Frontend:**
- [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- TypeScript
- CSS Variables + CSS Grid

**Backend:**
- [Node.js](https://nodejs.org/) (v20+)
- [Express](https://expressjs.com/)
- [Socket.io](https://socket.io/) (Real-time synchronization)

## 🚀 Quick Start (Local Development)

To run this project locally, you will need two terminals running simultaneously (one for the `client` and one for the `server`).

### 1. Clone the repository
```bash
git clone https://github.com/DhanushNehru/TetraChess.git
cd TetraChess
```

### 2. Start the Backend Server
```bash
cd server
npm install
npm run dev
# OR: npx tsx server.ts
```
*The WebSocket server will start on `http://localhost:3001`.*

### 3. Start the Frontend Client
Open a new terminal session in the project root:
```bash
cd client
npm install
npm run dev
```
*The Vite development server will start. Navigate to `http://localhost:5173` in your browser to see the app.*

## 🌐 Deployment (Vercel & Render/Railway)

This codebase is pre-configured for modern hosting providers.

### Frontend
The `client` directory includes a `vercel.json` file ensuring React Router paths correctly redirect to `index.html`. You can deploy the `/client` folder directly to **Vercel**.
> **Important**: Ensure you set the `VITE_SERVER_URL` environment variable in Vercel to point to your deployed backend URL.

### Backend
Deploy the `/server` directory to a Node.js hosting provider (such as Render, Heroku, or Railway). A `/health` GET endpoint is already provided in the Express app for load-balancer health checks.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
If you want to add checkmate logic, timers, spectator modes, or custom variant rules, feel free to fork the repository and open a Pull Request.

---
Built with ❤️ by [@DhanushNehru](https://github.com/DhanushNehru).
