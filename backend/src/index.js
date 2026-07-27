require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const db = require('./db/database');

const tokenRoutes = require('./routes/tokens');
const adminRoutes = require('./routes/admin');
const { startChartSimulator, seedCandlesForToken } = require('./services/chartSimulator');
const { startTxSimulator } = require('./services/txSimulator');
const { startBot } = require('./bot');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.set('io', io);
app.use(cors({ origin: '*' }));
app.use(express.json());

app.use('/api/tokens', tokenRoutes);
app.use('/api/admin', adminRoutes);
app.get('/health', (req, res) => res.json({ status: 'ok' }));

io.on('connection', (socket) => {
  socket.on('join-token', (tokenId) => socket.join(`token:${tokenId}`));
  socket.on('leave-token', (tokenId) => socket.leave(`token:${tokenId}`));
});

// Auto-seed if database is empty (safe on Railway restarts)
function autoSeedIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) as c FROM tokens').get().c;
  if (count === 0) {
    console.log('[Seed] Database empty — running auto-seed...');
    require('./db/seed');
  } else {
    console.log(`[DB] ${count} tokens loaded`);
  }
}

autoSeedIfEmpty();
startChartSimulator(io);
startTxSimulator(io);
startBot(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
});
