import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { EVENTS } from './shared/events.js';

import { registerMatchingHandlers } from './modules/matching/index.js';
import { registerSignalingHandlers } from './modules/signaling/index.js';
import { registerChatHandlers } from './modules/chat/index.js';
import { registerReportHandlers, registerAdminReportRoutes } from './modules/report/index.js';
import { registerGuardHandlers } from './modules/guard/index.js';
import { generateTurnCredentials } from './shared/turn.js';
import { createRealtimeHub } from './shared/realtime.js';

const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || true;

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: '2mb' }));

// Health check, TURN dynamic credentials (F10), & Admin Report API endpoints (F7)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'camelgle-server' });
});

app.get('/api/turn-credentials', (_req, res) => {
  const credentials = generateTurnCredentials();
  res.json(credentials);
});

// HTTP Polling Realtime Fallback (untuk Vercel Serverless tanpa WebSocket)
const realtimeHub = createRealtimeHub((hubIo, hubSocket) => {
  registerGuardHandlers(hubIo, hubSocket);
  registerMatchingHandlers(hubIo, hubSocket);
  registerSignalingHandlers(hubIo, hubSocket);
  registerChatHandlers(hubIo, hubSocket);
  registerReportHandlers(hubIo, hubSocket);
});

app.post('/api/realtime/poll', (req, res) => {
  const forwarded = req.headers['x-forwarded-for'];
  const ip =
    (typeof forwarded === 'string' && forwarded.split(',')[0].trim()) ||
    req.socket?.remoteAddress ||
    '127.0.0.1';
  const { clientId, events, leave } = req.body || {};
  const result = realtimeHub.handlePoll({ clientId, ip, events, leave });
  res.json(result);
});

registerAdminReportRoutes(app);

const httpServer = http.createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ['GET', 'POST'],
  },
});

function broadcastOnlineCount() {
  const count = io.engine.clientsCount;
  io.emit(EVENTS.STATS_ONLINE, { count });
}

io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);
  broadcastOnlineCount();

  // Register modular feature handlers
  registerGuardHandlers(io, socket);
  registerMatchingHandlers(io, socket);
  registerSignalingHandlers(io, socket);
  registerChatHandlers(io, socket);
  registerReportHandlers(io, socket);

  socket.on('disconnect', (reason) => {
    console.log(`[Socket] Client disconnected: ${socket.id} (${reason})`);
    broadcastOnlineCount();
  });
});

if (!process.env.VERCEL) {
  httpServer.listen(PORT, () => {
    console.log(`🐪 Camelgle Server running on http://localhost:${PORT}`);
  });
}

export { app, httpServer, io };
export default app;
