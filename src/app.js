const express = require('express');
const cors = require('cors');
require('dotenv').config();
const authRoutes = require('./routes/authRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const profileRoutes = require('./routes/profileRoutes');

const app = express();

const corsOrigin = process.env.CORS_ORIGIN || '*';

app.use(cors({
  origin: corsOrigin,
}));
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'Teacher Finder API works',
    version: '1.0.0',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/profile', profileRoutes);

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