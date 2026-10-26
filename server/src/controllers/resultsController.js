const { getPool } = require('../config/db');

async function getResults(req, res) {
  try {
    const { electionId } = req.params;
    const db = await getPool();

    const [elections] = await db.query('SELECT * FROM elections WHERE id = ?', [electionId]);
    if (elections.length === 0) {
      return res.status(404).json({ error: 'Election not found' });
    }

    const election = elections[0];

    // Fetch candidates ordered by vote count descending
    const [candidates] = await db.query(
      'SELECT id, name, party, party_color as partyColor, avatar, tagline, votes FROM candidates WHERE election_id = ? ORDER BY votes DESC',
      [electionId]
    );

    const totalVotes = candidates.reduce((acc, c) => acc + (c.votes || 0), 0);

    const [voterCount] = await db.query('SELECT COUNT(*) as count FROM voters');
    const totalRegisteredVoters = voterCount[0].count;

    const turnoutRate = totalRegisteredVoters > 0 
      ? Math.min(100, Math.round((totalVotes / (totalRegisteredVoters * 150)) * 100))
      : 0;

    let leader = null;
    const candidatesWithStats = candidates.map((c, index) => {
      const votes = c.votes || 0;
      const percentage = totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(1) : '0.0';

      if (index === 0 && votes > 0) {
        leader = {
          id: c.id,
          name: c.name,
          party: c.party,
          avatar: c.avatar,
          votes,
          percentage
        };
      }

      return {
        id: c.id,
        name: c.name,
        party: c.party,
        partyColor: c.partyColor,
        avatar: c.avatar,
        tagline: c.tagline,
        votes,
        percentage: parseFloat(percentage)
      };
    });

    res.json({
      election: {
        id: election.id,
        title: election.title,
        category: election.category,
        status: election.status,
        startTime: election.start_time,
        endTime: election.end_time
      },
      totalVotes,
      turnoutRate,
      leader: leader || (candidatesWithStats.length > 0 ? candidatesWithStats[0] : null),
      candidates: candidatesWithStats
    });

  } catch (err) {
    console.error('Error in getResults:', err);
    res.status(500).json({ error: 'Database error fetching election results' });
  }
}

module.exports = {
  getResults
};
