require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const tokenRoutes = require('./routes/tokens');
const adminRoutes = require('./routes/admin');
const { startChartSimulator } = require('./services/chartSimulator');
const { startTxSimulator } = require('./services/txSimulator');
const { startBot } = require('./bot');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.set('io', io);

app.use(cors());
app.use(express.json());

app.use('/api/tokens', tokenRoutes);
app.use('/api/admin', adminRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

io.on('connection', (socket) => {
  socket.on('join-token', (tokenId) => socket.join(`token:${tokenId}`));
  socket.on('leave-token', (tokenId) => socket.leave(`token:${tokenId}`));
  socket.on('disconnect', () => {});
});

startChartSimulator(io);
startTxSimulator(io);
startBot();

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
});
