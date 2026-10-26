const { getPool } = require('../config/db');
const { createAuditBlock } = require('../services/crypto');

async function getAllElections(req, res) {
  try {
    const voterId = req.query.voterId;
    const db = await getPool();

    const [elections] = await db.query('SELECT * FROM elections ORDER BY created_at DESC');

    const result = [];
    for (const election of elections) {
      // Get candidates for this election
      const [candidates] = await db.query(
        'SELECT id, name, party, party_color as partyColor, avatar, tagline, bio, agenda, votes FROM candidates WHERE election_id = ? ORDER BY votes DESC',
        [election.id]
      );

      const parsedCandidates = candidates.map(c => ({
        ...c,
        agenda: typeof c.agenda === 'string' ? JSON.parse(c.agenda) : c.agenda
      }));

      const totalVotes = candidates.reduce((sum, c) => sum + (c.votes || 0), 0);

      // Check if current voter has voted
      let hasVoted = false;
      let receipt = null;
      if (voterId) {
        const [records] = await db.query(
          'SELECT receipt_code FROM voter_records WHERE voter_id = ? AND election_id = ?',
          [voterId, election.id]
        );
        if (records.length > 0) {
          hasVoted = true;
          receipt = records[0].receipt_code;
        }
      }

      result.push({
        id: election.id,
        title: election.title,
        category: election.category,
        description: election.description,
        status: election.status,
        startTime: election.start_time,
        endTime: election.end_time,
        candidates: parsedCandidates,
        totalVotes,
        hasVoted,
        receipt
      });
    }

    res.json({ elections: result });
  } catch (err) {
    console.error('Error in getAllElections:', err);
    res.status(500).json({ error: 'Database error fetching elections' });
  }
}

async function getElectionById(req, res) {
  try {
    const { id } = req.params;
    const voterId = req.query.voterId;
    const db = await getPool();

    const [elections] = await db.query('SELECT * FROM elections WHERE id = ?', [id]);
    if (elections.length === 0) {
      return res.status(404).json({ error: 'Election not found' });
    }

    const election = elections[0];
    const [candidates] = await db.query(
      'SELECT id, name, party, party_color as partyColor, avatar, tagline, bio, agenda, votes FROM candidates WHERE election_id = ? ORDER BY votes DESC',
      [election.id]
    );

    const parsedCandidates = candidates.map(c => ({
      ...c,
      agenda: typeof c.agenda === 'string' ? JSON.parse(c.agenda) : c.agenda
    }));

    const totalVotes = candidates.reduce((sum, c) => sum + (c.votes || 0), 0);

    let hasVoted = false;
    let receipt = null;
    if (voterId) {
      const [records] = await db.query(
        'SELECT receipt_code FROM voter_records WHERE voter_id = ? AND election_id = ?',
        [voterId, election.id]
      );
      if (records.length > 0) {
        hasVoted = true;
        receipt = records[0].receipt_code;
      }
    }

    res.json({
      election: {
        id: election.id,
        title: election.title,
        category: election.category,
        description: election.description,
        status: election.status,
        startTime: election.start_time,
        endTime: election.end_time,
        candidates: parsedCandidates,
        totalVotes,
        hasVoted,
        receipt
      }
    });
  } catch (err) {
    console.error('Error in getElectionById:', err);
    res.status(500).json({ error: 'Database error fetching election details' });
  }
}

async function createElection(req, res) {
  try {
    const { title, category, description, candidates, endTime } = req.body;
    if (!title || !candidates || candidates.length < 2) {
      return res.status(400).json({ error: 'Title and at least 2 candidates are required' });
    }

    const db = await getPool();
    const id = `election-${Date.now()}`;
    const startTime = new Date();
    const calculatedEndTime = endTime ? new Date(endTime) : new Date(Date.now() + 7 * 24 * 3600 * 1000);

    // Insert election
    await db.query(
      `INSERT INTO elections (id, title, category, description, status, start_time, end_time)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, title.trim(), category || 'General Election', description || '', 'active', startTime, calculatedEndTime]
    );

    // Insert candidates
    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      const candId = `cand-${id}-${i + 1}`;
      await db.query(
        `INSERT INTO candidates (id, election_id, name, party, party_color, avatar, tagline, bio, agenda, votes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          candId,
          id,
          c.name.trim(),
          c.party ? c.party.trim() : 'Independent',
          c.partyColor || '#38bdf8',
          c.avatar || '/images/aris.jpg',
          c.tagline || 'Committed to transparent public governance.',
          c.bio || 'Public servant and community representative.',
          JSON.stringify(c.agenda || ['Public Integrity', 'Civic Empowerment']),
          0
        ]
      );
    }

    // Add audit block
    const [lastLogs] = await db.query('SELECT * FROM audit_logs ORDER BY block DESC LIMIT 1');
    const auditBlock = createAuditBlock(lastLogs[0], 'ELECTION_CREATED', `Election "${title}" created with ${candidates.length} candidates.`);
    await db.query(
      'INSERT INTO audit_logs (block, timestamp, action, details, previous_hash, hash) VALUES (?, ?, ?, ?, ?, ?)',
      [auditBlock.block, auditBlock.timestamp, auditBlock.action, auditBlock.details, auditBlock.previousHash, auditBlock.hash]
    );

    res.status(201).json({
      success: true,
      message: 'Election created successfully in MySQL',
      electionId: id
    });
  } catch (err) {
    console.error('Error in createElection:', err);
    res.status(500).json({ error: 'Database error creating election' });
  }
}

async function updateStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const db = await getPool();

    const [elections] = await db.query('SELECT title FROM elections WHERE id = ?', [id]);
    if (elections.length === 0) {
      return res.status(404).json({ error: 'Election not found' });
    }

    await db.query('UPDATE elections SET status = ? WHERE id = ?', [status, id]);

    // Audit log
    const [lastLogs] = await db.query('SELECT * FROM audit_logs ORDER BY block DESC LIMIT 1');
    const auditBlock = createAuditBlock(lastLogs[0], 'ELECTION_STATUS_CHANGED', `Election "${elections[0].title}" status updated to ${status.toUpperCase()}.`);
    await db.query(
      'INSERT INTO audit_logs (block, timestamp, action, details, previous_hash, hash) VALUES (?, ?, ?, ?, ?, ?)',
      [auditBlock.block, auditBlock.timestamp, auditBlock.action, auditBlock.details, auditBlock.previousHash, auditBlock.hash]
    );

    res.json({ success: true, message: `Election status updated to ${status}` });
  } catch (err) {
    console.error('Error in updateStatus:', err);
    res.status(500).json({ error: 'Database error updating election status' });
  }
}

module.exports = {
  getAllElections,
  getElectionById,
  createElection,
  updateStatus
};
