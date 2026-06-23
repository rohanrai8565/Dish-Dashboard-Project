require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { Pool } = require('pg');

const app  = express();
const PORT = process.env.PORT || 4000;

// ── PostgreSQL pool ───────────────────────────────────────────────────────────
const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 5432,
  database: process.env.DB_NAME     || 'dish_db',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

// ── Seed data ─────────────────────────────────────────────────────────────────
const DISHES = [
  { dishId: 'dish_001', dishName: 'Margherita Pizza',      imageUrl: 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=400&fit=crop', isPublished: true  },
  { dishId: 'dish_002', dishName: 'Spaghetti Carbonara',   imageUrl: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=400&fit=crop', isPublished: true  },
  { dishId: 'dish_003', dishName: 'Chicken Tikka Masala',  imageUrl: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&fit=crop', isPublished: false },
  { dishId: 'dish_004', dishName: 'Caesar Salad',          imageUrl: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400&fit=crop', isPublished: true  },
  { dishId: 'dish_005', dishName: 'Beef Tacos',            imageUrl: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400&fit=crop', isPublished: true  },
  { dishId: 'dish_006', dishName: 'Sushi Platter',         imageUrl: 'https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=400&fit=crop', isPublished: false },
  { dishId: 'dish_007', dishName: 'Butter Chicken',        imageUrl: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&fit=crop', isPublished: true  },
  { dishId: 'dish_008', dishName: 'Greek Salad',           imageUrl: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&fit=crop', isPublished: true  },
  { dishId: 'dish_009', dishName: 'Pad Thai',              imageUrl: 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=400&fit=crop', isPublished: false },
  { dishId: 'dish_010', dishName: 'Chocolate Lava Cake',   imageUrl: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&fit=crop', isPublished: true  },
  { dishId: 'dish_011', dishName: 'Veggie Burger',         imageUrl: 'https://images.unsplash.com/photo-1550317138-10000687a72b?w=400&fit=crop', isPublished: false },
  { dishId: 'dish_012', dishName: 'Tom Yum Soup',          imageUrl: 'https://images.unsplash.com/photo-1548943487-a2e4e43b4853?w=400&fit=crop', isPublished: true  },
];

// ── DB init + seed ────────────────────────────────────────────────────────────
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS dishes (
      "dishId"      VARCHAR(50) PRIMARY KEY,
      "dishName"    VARCHAR(255) NOT NULL,
      "imageUrl"    TEXT NOT NULL,
      "isPublished" BOOLEAN NOT NULL DEFAULT false,
      "updatedAt"   TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  const { rows } = await pool.query('SELECT COUNT(*) FROM dishes');
  if (parseInt(rows[0].count) === 0) {
    for (const d of DISHES) {
      await pool.query(
        `INSERT INTO dishes ("dishId","dishName","imageUrl","isPublished") VALUES ($1,$2,$3,$4)`,
        [d.dishId, d.dishName, d.imageUrl, d.isPublished]
      );
    }
    console.log(`✅ Seeded ${DISHES.length} dishes`);
  }
}

// ── SSE client registry ───────────────────────────────────────────────────────
const sseClients = new Set();

function broadcast(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(res => { try { res.write(msg); } catch { sseClients.delete(res); } });
}

// Heartbeat to keep connections alive through proxies
setInterval(() => {
  sseClients.forEach(res => { try { res.write(': ping\n\n'); } catch { sseClients.delete(res); } });
}, 25000);

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────

// Health
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// SSE stream
app.get('/events', (req, res) => {
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.flushHeaders();
  res.write(`event: connected\ndata: {"ok":true}\n\n`);
  sseClients.add(res);
  console.log(`[SSE] client connected (total: ${sseClients.size})`);
  req.on('close', () => { sseClients.delete(res); console.log(`[SSE] client left (total: ${sseClients.size})`); });
});

// GET all dishes
app.get('/dishes', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM dishes ORDER BY "dishName"');
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'DB error' });
  }
});

// GET single dish
app.get('/dishes/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM dishes WHERE "dishId"=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'DB error' });
  }
});

// PATCH toggle isPublished
app.patch('/dishes/:id/toggle', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE dishes SET "isPublished"=NOT "isPublished","updatedAt"=NOW()
       WHERE "dishId"=$1 RETURNING *`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    broadcast('dish_updated', rows[0]);          // 📡 real-time push
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'DB error' });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
initDB()
  .then(() => app.listen(PORT, () => console.log(`🚀  http://localhost:${PORT}`)))
  .catch(e => { console.error('DB init failed:', e.message); process.exit(1); });
