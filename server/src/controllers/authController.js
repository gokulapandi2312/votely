const { getPool } = require('../config/db');
const { createAuditBlock } = require('../services/crypto');

async function getDemoAccounts(req, res) {
  try {
    const db = await getPool();
    const [voters] = await db.query(`
      SELECT v.id, v.name, v.voter_id as voterId, v.email,
             COUNT(vr.id) as hasVotedCount
      FROM voters v
      LEFT JOIN voter_records vr ON v.voter_id = vr.voter_id
      GROUP BY v.id, v.name, v.voter_id, v.email
    `);

    const [admin] = await db.query('SELECT username, name FROM admin_users LIMIT 1');

    res.json({
      voters,
      admin: admin[0] || { username: 'admin', name: 'Chief Election Supervisor' }
    });
  } catch (err) {
    console.error('Error in getDemoAccounts:', err);
    res.status(500).json({ error: 'Database error fetching demo accounts' });
  }
}

async function voterLogin(req, res) {
  try {
    const { voterId, pin } = req.body;
    if (!voterId) {
      return res.status(400).json({ error: 'Voter ID is required' });
    }

    const db = await getPool();
    const [rows] = await db.query(
      'SELECT id, name, voter_id as voterId, pin, email, role FROM voters WHERE UPPER(voter_id) = UPPER(?)',
      [voterId.trim()]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Voter ID not recognized in current voter registry.' });
    }

    const voter = rows[0];
    if (pin && voter.pin && voter.pin !== pin.trim()) {
      return res.status(401).json({ error: 'Invalid security PIN.' });
    }

    // Fetch elections voter participated in
    const [participations] = await db.query(
      'SELECT election_id FROM voter_records WHERE voter_id = ?',
      [voter.voterId]
    );

    res.json({
      success: true,
      user: {
        id: voter.id,
        name: voter.name,
        voterId: voter.voterId,
        email: voter.email,
        role: voter.role,
        hasVotedIn: participations.map(p => p.election_id)
      }
    });
  } catch (err) {
    console.error('Error in voterLogin:', err);
    res.status(500).json({ error: 'Database error during voter login' });
  }
}

async function registerVoter(req, res) {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required for voter registration.' });
    }

    const db = await getPool();

    // Check duplicate email
    const [existing] = await db.query('SELECT id FROM voters WHERE LOWER(email) = LOWER(?)', [email.trim()]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'A voter with this email address is already registered.' });
    }

    const randomDigits = Math.floor(10000 + Math.random() * 90000);
    const voterId = `VT-${randomDigits}`;
    const id = `voter-${Date.now()}`;
    const pin = '1234';

    await db.query(
      'INSERT INTO voters (id, name, voter_id, pin, email, role) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name.trim(), voterId, pin, email.trim(), 'voter']
    );

    // Audit log
    const [lastLogs] = await db.query('SELECT * FROM audit_logs ORDER BY block DESC LIMIT 1');
    const auditBlock = createAuditBlock(lastLogs[0], 'VOTER_REGISTERED', `New voter registered with ID ${voterId}`);
    
    await db.query(
      'INSERT INTO audit_logs (block, timestamp, action, details, previous_hash, hash) VALUES (?, ?, ?, ?, ?, ?)',
      [auditBlock.block, auditBlock.timestamp, auditBlock.action, auditBlock.details, auditBlock.previousHash, auditBlock.hash]
    );

    res.status(201).json({
      success: true,
      message: 'Voter successfully registered.',
      voter: {
        id,
        name: name.trim(),
        voterId,
        pin,
        email: email.trim(),
        role: 'voter',
        hasVotedIn: []
      }
    });
  } catch (err) {
    console.error('Error in registerVoter:', err);
    res.status(500).json({ error: 'Database error registering voter' });
  }
}

async function adminLogin(req, res) {
  try {
    const { username, password } = req.body;
    const db = await getPool();

    const [rows] = await db.query(
      'SELECT username, name, role FROM admin_users WHERE username = ? AND password = ?',
      [username, password]
    );

    if (rows.length > 0) {
      return res.json({
        success: true,
        user: {
          username: rows[0].username,
          name: rows[0].name,
          role: 'admin'
        }
      });
    }

    res.status(401).json({ error: 'Invalid admin credentials.' });
  } catch (err) {
    console.error('Error in adminLogin:', err);
    res.status(500).json({ error: 'Database error during admin login' });
  }
}

module.exports = {
  getDemoAccounts,
  voterLogin,
  registerVoter,
  adminLogin
};
