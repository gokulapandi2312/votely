const express = require('express');
const path = require('path');
const cors = require('cors');
const apiRoutes = require('./src/routes/api');
const { initDb } = require('./src/config/db');

const app = express();
const PORT = process.env.PORT || 3500;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets from /public
app.use(express.static(path.join(__dirname, '../public')));

// API routes
app.use('/api', apiRoutes);

// Catch-all: serve index.html for SPA routing (Express 5 compatible)
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  } else {
    next();
  }
});

// Initialize MySQL and start server
async function startServer() {
  try {
    console.log('Connecting to MySQL & verifying schema...');
    await initDb();
    console.log('MySQL database connected & initialized.');

    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(` 🗳️  VOTING SYSTEM SERVER RUNNING (MySQL ENGINE)`);
      console.log(` 🌐  Local URL: http://localhost:${PORT}`);
      console.log(` 🗄️  Database: MySQL (voting_system_db)`);
      console.log(` 🔒  Cryptographic Ledger & Audit Chain: Active`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('Failed to start server due to database error:', err);
    process.exit(1);
  }
}

startServer();
