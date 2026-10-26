const API_BASE = '/api';

const api = {
  // GET DATA: Fetch all candidates and live vote tallies
  async getCandidates() {
    const res = await fetch(`${API_BASE}/candidates`);
    return res.json();
  },

  // STORE DATA: Store a new vote in MySQL
  async submitVote(candidateId, voterName, voterEmail) {
    const res = await fetch(`${API_BASE}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateId, voterName, voterEmail })
    });
    return res.json();
  },

  // GET DATA: Fetch recent public voting activity
  async getRecentVotes() {
    const res = await fetch(`${API_BASE}/recent-votes`);
    return res.json();
  }
};

window.api = api;
