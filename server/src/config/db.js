const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'voting_system_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool = null;

async function getPool() {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
}

async function initDb() {
  // 1. Ensure database exists
  const rootConn = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password
  });
  await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
  await rootConn.end();

  // 2. Connect to pool
  const db = await getPool();

  // Candidates Table (Stores candidate details and current total votes)
  await db.query(`
    CREATE TABLE IF NOT EXISTS candidates (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      party VARCHAR(150) NOT NULL,
      party_color VARCHAR(30) DEFAULT '#0ea5e9',
      avatar VARCHAR(255),
      tagline VARCHAR(255),
      votes INT DEFAULT 0
    ) ENGINE=InnoDB;
  `);

  // Public Votes Table (Stores who voted, for whom, and when)
  await db.query(`
    CREATE TABLE IF NOT EXISTS public_votes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      candidate_id VARCHAR(64) NOT NULL,
      voter_name VARCHAR(150) NOT NULL,
      voter_email VARCHAR(150) UNIQUE NOT NULL,
      voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);

  // Seed candidates if empty
  const [candidates] = await db.query('SELECT COUNT(*) as count FROM candidates');
  if (candidates[0].count === 0) {
    console.log('Seeding candidate list into MySQL...');
    const candidateList = [
      [
        'cand-1',
        'Dr. Aris Vance',
        'Forward Innovation Alliance',
        '#38bdf8',
        '/images/aris.jpg',
        'Pioneering Open AI Governance & Post-Quantum Security.',
        124
      ],
      [
        'cand-2',
        'Elena Rostova',
        'Sustainable Future Coalition',
        '#10b981',
        '/images/elena.jpg',
        'Eco-Centric Computing & Equitable Automation.',
        168
      ],
      [
        'cand-3',
        'Marcus Sterling',
        'Economic Sovereignty Alliance',
        '#fbbf24',
        '/images/marcus.jpg',
        'Decentralized Finance & Worker Protection in the AI Era.',
        95
      ],
      [
        'cand-4',
        'Dr. Amara Okafor',
        'Civic Tech & Universal Education',
        '#c084fc',
        '/images/amara.jpg',
        'Democratizing STEM Education & Universal Broadband.',
        142
      ]
    ];

    for (const c of candidateList) {
      await db.query(
        'INSERT INTO candidates (id, name, party, party_color, avatar, tagline, votes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        c
      );
    }
    console.log('Candidates seeded successfully into MySQL.');
  }
}

module.exports = {
  getPool,
  initDb
};
