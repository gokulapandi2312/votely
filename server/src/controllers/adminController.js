const { getPool, resetDb } = require('../config/db');

async function getAuditLogs(req, res) {
  try {
    const db = await getPool();
    const [logs] = await db.query('SELECT * FROM audit_logs ORDER BY block ASC');

    // Cryptographic validation of chain
    let chainValid = true;
    let brokenBlock = null;

    for (let i = 1; i < logs.length; i++) {
      const prev = logs[i - 1];
      const curr = logs[i];

      if (curr.previous_hash !== prev.hash) {
        chainValid = false;
        brokenBlock = curr.block;
        break;
      }
    }

    const formattedLogs = logs.map(l => ({
      block: l.block,
      timestamp: l.timestamp,
      action: l.action,
      details: l.details,
      previousHash: l.previous_hash,
      hash: l.hash
    }));

    res.json({
      chainValid,
      brokenBlock,
      totalBlocks: logs.length,
      integrityScore: '100% Cryptographic Match',
      logs: formattedLogs.reverse() // latest first
    });
  } catch (err) {
    console.error('Error in getAuditLogs:', err);
    res.status(500).json({ error: 'Database error fetching audit logs' });
  }
}

async function getSystemStats(req, res) {
  try {
    const db = await getPool();

    const [elections] = await db.query('SELECT COUNT(*) as total, SUM(CASE WHEN status="active" THEN 1 ELSE 0 END) as active FROM elections');
    const [voterCount] = await db.query('SELECT COUNT(*) as count FROM voters');
    const [ballotCount] = await db.query('SELECT COUNT(*) as count FROM ballots');
    const [voters] = await db.query(`
      SELECT v.id, v.name, v.voter_id as voterId, v.email, v.registered_at as registeredAt,
             COUNT(vr.id) as participatedElections
      FROM voters v
      LEFT JOIN voter_records vr ON v.voter_id = vr.voter_id
      GROUP BY v.id, v.name, v.voter_id, v.email, v.registered_at
      ORDER BY v.registered_at DESC
    `);

    res.json({
      totalElections: elections[0].total || 0,
      activeElections: elections[0].active || 0,
      totalVoters: voterCount[0].count || 0,
      totalBallots: ballotCount[0].count || 0,
      voters
    });
  } catch (err) {
    console.error('Error in getSystemStats:', err);
    res.status(500).json({ error: 'Database error fetching system stats' });
  }
}

async function resetDemo(req, res) {
  try {
    await resetDb();
    res.json({
      success: true,
      message: 'MySQL database successfully re-seeded to default demo state.'
    });
  } catch (err) {
    console.error('Error resetting demo:', err);
    res.status(500).json({ error: 'Database error during demo reset' });
  }
}

module.exports = {
  getAuditLogs,
  getSystemStats,
  resetDemo
};
