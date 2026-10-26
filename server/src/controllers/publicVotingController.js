const { getPool } = require('../config/db');

/**
 * GET: Retrieve all candidates and live vote tallies from MySQL
 */
async function getCandidates(req, res) {
  try {
    const db = await getPool();
    const [candidates] = await db.query(
      'SELECT id, name, party, party_color as partyColor, avatar, tagline, votes FROM candidates ORDER BY votes DESC'
    );

    const totalVotes = candidates.reduce((sum, c) => sum + (c.votes || 0), 0);

    const formatted = candidates.map(c => ({
      ...c,
      percentage: totalVotes > 0 ? parseFloat(((c.votes / totalVotes) * 100).toFixed(1)) : 0
    }));

    res.json({
      success: true,
      totalVotes,
      candidates: formatted,
      leading: formatted.length > 0 ? formatted[0] : null
    });
  } catch (err) {
    console.error('Error fetching candidates:', err);
    res.status(500).json({ error: 'Database error fetching candidate data' });
  }
}

/**
 * POST: Store a public vote in MySQL
 */
async function storeVote(req, res) {
  const { candidateId, voterName, voterEmail } = req.body;

  if (!candidateId || !voterName || !voterEmail) {
    return res.status(400).json({
      error: 'Please select a candidate and provide your name and email address.'
    });
  }

  const cleanEmail = voterEmail.trim().toLowerCase();
  const cleanName = voterName.trim();

  const pool = await getPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Verify candidate exists
    const [candidates] = await conn.query('SELECT name FROM candidates WHERE id = ?', [candidateId]);
    if (candidates.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Selected candidate does not exist.' });
    }

    // 2. Prevent duplicate vote with same email
    const [existing] = await conn.query('SELECT id FROM public_votes WHERE voter_email = ?', [cleanEmail]);
    if (existing.length > 0) {
      await conn.rollback();
      return res.status(409).json({
        error: `A vote has already been submitted with email: ${cleanEmail}`
      });
    }

    // 3. Store vote record in MySQL
    await conn.query(
      'INSERT INTO public_votes (candidate_id, voter_name, voter_email) VALUES (?, ?, ?)',
      [candidateId, cleanName, cleanEmail]
    );

    // 4. Increment candidate vote tally
    await conn.query('UPDATE candidates SET votes = votes + 1 WHERE id = ?', [candidateId]);

    await conn.commit();

    res.status(201).json({
      success: true,
      message: `Thank you, ${cleanName}! Your vote for ${candidates[0].name} has been saved to the database.`,
      voter: { name: cleanName, email: cleanEmail }
    });

  } catch (err) {
    await conn.rollback();
    console.error('Error storing vote:', err);
    res.status(500).json({ error: 'Database error storing your vote.' });
  } finally {
    conn.release();
  }
}

/**
 * GET: Retrieve recent public voting activity from MySQL
 */
async function getRecentVotes(req, res) {
  try {
    const db = await getPool();
    const [recent] = await db.query(`
      SELECT pv.voter_name as voterName, pv.voted_at as votedAt, c.name as candidateName, c.party_color as partyColor
      FROM public_votes pv
      JOIN candidates c ON pv.candidate_id = c.id
      ORDER BY pv.voted_at DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      recent
    });
  } catch (err) {
    console.error('Error fetching recent votes:', err);
    res.status(500).json({ error: 'Database error fetching recent votes' });
  }
}

module.exports = {
  getCandidates,
  storeVote,
  getRecentVotes
};
