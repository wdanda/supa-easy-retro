// server.js
// Node.js + Express + Socket.io Scrum Retro backend (Supabase)

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const bcrypt = require('bcryptjs');
const PDFDocument = require('pdfkit');
const { createClient } = require('@supabase/supabase-js');

const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
const missingEnvVars = requiredEnvVars.filter((name) => !process.env[name]);
if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

app.use(cors());
app.use(express.json());

// Serve Angular production build (built via `npm run build`)
const FRONTEND_DIST = path.join(__dirname, 'retro-frontend', 'dist', 'retro-frontend', 'browser');
app.use(express.static(FRONTEND_DIST));

const MAX_BOARDS_PER_IP = 30;
const MAX_BOARDS_PER_USER = 10;
const BOARD_LIFESPAN_MS = 14 * 24 * 60 * 60 * 1000; // 2 weeks

let createUserLimiter = (req, res, next) => next();
let createBoardLimiter = (req, res, next) => next();
try {
  const rateLimit = require('express-rate-limit');
  createUserLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 50, standardHeaders: true, legacyHeaders: false });
  createBoardLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });
  console.log('express-rate-limit enabled');
} catch (e) {
  // express-rate-limit not installed; no-op middlewares used
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.ip || 'unknown';
}

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

function slugify(text) {
  return (text || '').toString().toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s\-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function defaultColumns() {
  return [
    { key: 'wentWell', name: 'Went well', cards: [] },
    { key: 'toImprove', name: 'To improve', cards: [] },
    { key: 'actionItems', name: 'Action items', cards: [] }
  ];
}

async function cleanupExpiredBoards() {
  await supabase.from('boards').delete().lt('expires_at', Date.now());
}

async function getBoard(boardId) {
  const { data } = await supabase.from('boards').select('*').eq('id', boardId).single();
  return data;
}

async function saveColumns(boardId, columns) {
  await supabase.from('boards').update({ columns }).eq('id', boardId);
}

// --- REST endpoints ---

app.post('/api/user', createUserLimiter, async (req, res) => {
  const { username } = req.body;
  if (!username || typeof username !== 'string' || !username.trim()) {
    return res.status(400).json({ error: 'Invalid username' });
  }
  const userId = generateId();
  const { error } = await supabase.from('users').insert({ id: userId, username: username.trim() });
  if (error) return res.status(500).json({ error: 'Failed to create user' });
  res.json({ userId, username: username.trim() });
});

app.post('/api/boards', createBoardLimiter, async (req, res) => {
  await cleanupExpiredBoards();
  const { userId, teamName, password } = req.body;
  const ip = getClientIp(req);

  if (!teamName) return res.status(400).json({ error: 'Missing teamName' });

  const { data: user } = await supabase.from('users').select('id').eq('id', userId).single();
  if (!user) return res.status(401).json({ error: 'Invalid user' });

  const { count: userBoardCount } = await supabase
    .from('boards').select('id', { count: 'exact', head: true }).eq('owner', userId);
  if (userBoardCount >= MAX_BOARDS_PER_USER) return res.status(403).json({ error: 'Board limit reached' });

  const { count: ipCount } = await supabase
    .from('boards').select('id', { count: 'exact', head: true })
    .eq('creator_ip', ip).gt('expires_at', Date.now());
  if (ipCount >= MAX_BOARDS_PER_IP) return res.status(403).json({ error: 'IP board quota exceeded' });

  const now = Date.now();
  let base = slugify(teamName);
  if (!base) base = generateId();
  let boardId = base;
  let tries = 0;
  while (tries < 6) {
    const { data: existing } = await supabase.from('boards').select('id').eq('id', boardId).single();
    if (!existing) break;
    boardId = `${base}-${generateId().slice(0, 4)}`;
    tries++;
  }
  if (tries >= 6) boardId = generateId();

  const passwordHash = (password && typeof password === 'string' && password.trim())
    ? bcrypt.hashSync(password, 8) : null;

  const { error } = await supabase.from('boards').insert({
    id: boardId,
    team_name: teamName,
    created_at: now,
    password_hash: passwordHash,
    owner: userId,
    columns: defaultColumns(),
    expires_at: now + BOARD_LIFESPAN_MS,
    creator_ip: ip
  });
  if (error) return res.status(500).json({ error: 'Failed to create board' });

  res.json({ boardId, teamName, createdAt: now, expiresAt: now + BOARD_LIFESPAN_MS });
});

app.get('/api/boards', async (req, res) => {
  await cleanupExpiredBoards();
  const { userId } = req.query;
  const { data: user } = await supabase.from('users').select('id').eq('id', userId).single();
  if (!user) return res.status(401).json({ error: 'Invalid user' });

  const { data: boards } = await supabase
    .from('boards').select('id, team_name, created_at, expires_at').eq('owner', userId);

  res.json((boards || []).map(b => ({
    id: b.id,
    teamName: b.team_name,
    createdAt: b.created_at,
    expiresAt: b.expires_at
  })));
});

app.post('/api/boards/join', async (req, res) => {
  await cleanupExpiredBoards();
  const { boardId, password } = req.body;
  const board = await getBoard(boardId);
  if (!board) return res.status(404).json({ error: 'Board not found' });
  if (board.password_hash) {
    if (!bcrypt.compareSync(password || '', board.password_hash)) return res.status(403).json({ error: 'Incorrect password' });
  }
  res.json({ boardId, teamName: board.team_name, createdAt: board.created_at, expiresAt: board.expires_at });
});

app.delete('/api/boards/:boardId', async (req, res) => {
  const { boardId } = req.params;
  const { userId } = req.query;
  const board = await getBoard(boardId);
  if (!board) return res.status(404).json({ error: 'Board not found' });
  if (board.owner !== userId) return res.status(403).json({ error: 'Not owner' });
  await supabase.from('boards').delete().eq('id', boardId);
  res.json({ success: true });
});

app.get('/api/boards/:boardId/pdf', async (req, res) => {
  const { boardId } = req.params;
  const board = await getBoard(boardId);
  if (!board) return res.status(404).json({ error: 'Board not found' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="retro-${board.id}.pdf"`);

  const doc = new PDFDocument({ margin: 48 });
  doc.info.Title = `Retro - ${board.team_name}`;
  doc.pipe(res);

  doc.fontSize(20).text(board.team_name, { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor('gray').text(`Created: ${new Date(board.created_at).toLocaleString()}`, { align: 'center' });
  doc.moveDown(0.8);

  for (const col of board.columns) {
    doc.fillColor('black').fontSize(14).text(col.name);
    doc.moveDown(0.2);
    if (!col.cards || col.cards.length === 0) {
      doc.fontSize(11).fillColor('gray').text('No items', { indent: 12 });
      doc.moveDown(0.4);
      continue;
    }
    for (const card of col.cards) {
      const safeText = (card.text || '').replace(/[\x00-\x1F\x7F]/g, '');
      doc.fontSize(12).fillColor('black').text(`• ${safeText}`, { indent: 12, paragraphGap: 2 });
      doc.fontSize(10).fillColor('gray').text(`  (${card.upvotes} upvotes)`, { indent: 20 });
      doc.moveDown(0.2);
    }
    doc.moveDown(0.8);
  }

  doc.end();
});

// --- Socket.io events (per board, all async) ---

io.on('connection', (socket) => {
  socket.on('joinBoard', async ({ boardId, password }) => {
    await cleanupExpiredBoards();
    const board = await getBoard(boardId);
    if (!board) return socket.emit('error', 'Board not found');
    if (board.password_hash) {
      if (!bcrypt.compareSync(password || '', board.password_hash)) return socket.emit('error', 'Incorrect password');
    }
    socket.join(boardId);
    socket.emit('boardState', board.columns);
  });

  socket.on('addCard', async ({ boardId, columnKey, text }) => {
    const board = await getBoard(boardId);
    if (!board) return;
    const col = board.columns.find(c => c.key === columnKey);
    if (col && text && text.trim()) {
      const card = { id: generateId(), text: text.trim(), upvotes: 0 };
      col.cards.unshift(card);
      await saveColumns(boardId, board.columns);
      io.to(boardId).emit('boardState', board.columns);
    }
  });

  socket.on('deleteCard', async ({ boardId, columnKey, cardId }) => {
    const board = await getBoard(boardId);
    if (!board) return;
    const col = board.columns.find(c => c.key === columnKey);
    if (col) {
      col.cards = col.cards.filter(c => c.id !== cardId);
      await saveColumns(boardId, board.columns);
      io.to(boardId).emit('boardState', board.columns);
    }
  });

  socket.on('upvoteCard', async ({ boardId, columnKey, cardId }) => {
    const board = await getBoard(boardId);
    if (!board) return;
    const col = board.columns.find(c => c.key === columnKey);
    if (col) {
      const card = col.cards.find(c => c.id === cardId);
      if (card) {
        card.upvotes++;
        await saveColumns(boardId, board.columns);
        io.to(boardId).emit('boardState', board.columns);
      }
    }
  });

  socket.on('reorderCards', async ({ boardId, columnKey, previousIndex, currentIndex }) => {
    const board = await getBoard(boardId);
    if (!board) return;
    const col = board.columns.find(c => c.key === columnKey);
    if (col && previousIndex !== currentIndex) {
      const [moved] = col.cards.splice(previousIndex, 1);
      col.cards.splice(currentIndex, 0, moved);
      await saveColumns(boardId, board.columns);
      io.to(boardId).emit('boardState', board.columns);
    }
  });
});

app.get('/healthz', async (req, res) => {
  const { error } = await supabase
    .from('boards')
    .select('id', { head: true, count: 'exact' })
    .limit(1);

  if (error) {
    return res.status(503).json({ status: 'unhealthy' });
  }

  return res.json({ status: 'ok' });
});

// SPA fallback — serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Scrum Retro server running on http://0.0.0.0:${PORT}`);
});
