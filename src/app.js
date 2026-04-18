const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { query } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const profileRoutes = require('./routes/profileRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

function getAllowedOrigins() {
  const rawOrigins = process.env.CORS_ORIGIN;

  if (!rawOrigins) {
    return '*';
  }

  const origins = rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length ? origins : '*';
}

const allowedOrigins = getAllowedOrigins();

app.use(cors({
  origin(origin, callback) {
    if (allowedOrigins === '*' || !origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS origin is not allowed: ${origin}`));
  },
}));
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'Teacher Finder API works',
    version: '1.0.0',
  });
});

app.get('/health', async (req, res, next) => {
  try {
    await query('select 1 as ok');

    return res.json({
      status: 'ok',
      database: 'connected',
    });
  } catch (err) {
    return next(err);
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes);

app.use((err, req, res, next) => {
  if (!err) {
    return next();
  }

  if (err.code === 'ECONNREFUSED') {
    return res.status(503).json({
      message: 'Database connection failed. Check DATABASE_URL (or PGHOST/PGPORT) and ensure PostgreSQL is running.',
      details: err.message,
    });
  }

  return res.status(500).json({
    message: 'Internal server error',
    details: err.message,
  });
});

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

module.exports = app;