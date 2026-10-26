// Public Voting Application State
let selectedCandidateId = null;
let candidatesData = [];

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// GET DATA: Load Candidates and Live Results from MySQL
async function loadData() {
  try {
    const res = await api.getCandidates();
    if (!res.success) throw new Error(res.error);

    candidatesData = res.candidates;

    // Update hero stats
    document.getElementById('total-votes-count').textContent = res.totalVotes.toLocaleString();
    if (res.leading) {
      document.getElementById('leader-highlight-name').textContent = res.leading.name;
      document.getElementById('leader-highlight-votes').textContent = `${res.leading.votes} votes (${res.leading.percentage}%)`;
    }

    renderCandidates(candidatesData);
    renderResults(candidatesData, res.totalVotes);
    loadRecentActivity();

  } catch (err) {
    console.error('Failed to load candidate data from MySQL:', err);
    showToast('Failed to load candidate data', 'error');
  }
}

// Render Candidate Selection Cards
function renderCandidates(candidates) {
  const grid = document.getElementById('candidate-grid');
  grid.innerHTML = '';

  const hasVotedLocal = localStorage.getItem('civic_voted_email');

  candidates.forEach(c => {
    const card = document.createElement('div');
    card.className = `candidate-card ${selectedCandidateId === c.id ? 'selected' : ''}`;
    card.id = `candidate-${c.id}`;

    card.innerHTML = `
      <div class="candidate-card-header">
        <img class="candidate-img" src="${c.avatar}" alt="${c.name}" onerror="this.src='/images/aris.jpg'">
        <div class="candidate-select-indicator">
          <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
        </div>
      </div>
      <div class="candidate-card-body">
        <span class="party-badge" style="background:${c.partyColor}22; color:${c.partyColor}; border:1px solid ${c.partyColor}55;">
          ${c.party}
        </span>
        <h3 class="candidate-name">${c.name}</h3>
        <p class="candidate-tagline">${c.tagline}</p>
        
        <div class="card-footer">
          <button class="select-btn" type="button">
            ${selectedCandidateId === c.id ? '✓ Selected Choice' : 'Select to Vote'}
          </button>
        </div>
      </div>
    `;

    card.onclick = () => selectCandidate(c);
    grid.appendChild(card);
  });
}

// Candidate Selection Handler
function selectCandidate(candidate) {
  selectedCandidateId = candidate.id;

  document.querySelectorAll('.candidate-card').forEach(c => {
    const isSelected = c.id === `candidate-${candidate.id}`;
    c.classList.toggle('selected', isSelected);
    const btn = c.querySelector('.select-btn');
    if (btn) btn.textContent = isSelected ? '✓ Selected Choice' : 'Select to Vote';
  });

  // Update Voting Form
  const formSection = document.getElementById('voting-form-section');
  formSection.scrollIntoView({ behavior: 'smooth', block: 'center' });

  document.getElementById('form-selected-name').textContent = candidate.name;
  document.getElementById('form-selected-party').textContent = candidate.party;
  document.getElementById('form-selected-badge').style.display = 'flex';
  document.getElementById('submit-vote-btn').disabled = false;
}

// STORE DATA: Submit Vote to MySQL
async function handleVoteSubmit(e) {
  e.preventDefault();

  if (!selectedCandidateId) {
    showToast('Please click on a candidate to select them first.', 'error');
    return;
  }

  const nameInput = document.getElementById('voter-name');
  const emailInput = document.getElementById('voter-email');

  const voterName = nameInput.value.trim();
  const voterEmail = emailInput.value.trim();

  if (!voterName || !voterEmail) {
    showToast('Please enter both your name and email address.', 'error');
    return;
  }

  const btn = document.getElementById('submit-vote-btn');
  btn.disabled = true;
  btn.textContent = 'Saving Vote to MySQL...';

  try {
    const res = await api.submitVote(selectedCandidateId, voterName, voterEmail);

    if (res.success) {
      localStorage.setItem('civic_voted_email', voterEmail);
      showToast(res.message, 'success');

      // Show Thank You Banner
      document.getElementById('vote-form').style.display = 'none';
      const thankYouBox = document.getElementById('thank-you-box');
      thankYouBox.style.display = 'block';
      document.getElementById('confirmed-voter-name').textContent = voterName;

      // Reload fresh data from MySQL
      loadData();
    } else {
      showToast(res.error || 'Failed to record vote', 'error');
    }
  } catch (err) {
    console.error('Error submitting vote:', err);
    showToast('Network error saving your vote.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Submit Official Vote 🗳️';
  }
}

// Render Real-Time Results Bars
function renderResults(candidates, totalVotes) {
  const container = document.getElementById('results-bars-container');
  container.innerHTML = '';

  candidates.forEach(c => {
    const item = document.createElement('div');
    item.className = 'tally-item';
    item.innerHTML = `
      <div class="tally-item-meta">
        <div class="tally-candidate-name">
          <img class="tally-candidate-avatar" src="${c.avatar}" alt="${c.name}">
          <span>${c.name}</span>
          <span class="party-badge" style="background:${c.partyColor}22; color:${c.partyColor}; padding:2px 6px;">
            ${c.party}
          </span>
        </div>
        <div class="tally-score">
          ${c.votes.toLocaleString()} votes (${c.percentage}%)
        </div>
      </div>
      <div class="tally-bar-track">
        <div class="tally-bar-fill" style="width: ${c.percentage}%; background: linear-gradient(90deg, ${c.partyColor}, #6366f1);"></div>
      </div>
    `;
    container.appendChild(item);
  });
}

// GET DATA: Load Recent Public Voters Activity
async function loadRecentActivity() {
  try {
    const res = await api.getRecentVotes();
    const container = document.getElementById('recent-votes-list');
    if (!res.recent || res.recent.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem;">No public votes recorded yet today. Be the first to vote!</p>';
      return;
    }

    container.innerHTML = res.recent.map(r => `
      <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.05); font-size:0.85rem;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="width:8px; height:8px; border-radius:50%; background:var(--accent-cyan);"></span>
          <strong style="color:#fff;">${r.voterName}</strong>
          <span style="color:var(--text-muted);">voted for</span>
          <span style="color:${r.partyColor || 'var(--text-highlight)'}; font-weight:600;">${r.candidateName}</span>
        </div>
        <span style="color:var(--text-muted); font-size:0.75rem; font-family:var(--font-mono);">
          ${new Date(r.votedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    `).join('');

  } catch (err) {
    console.error('Error loading recent activity:', err);
  }
}

// Reset form for voting again with different person
function voteAnother() {
  document.getElementById('vote-form').style.display = 'block';
  document.getElementById('thank-you-box').style.display = 'none';
  document.getElementById('voter-name').value = '';
  document.getElementById('voter-email').value = '';
  selectedCandidateId = null;
  document.getElementById('form-selected-badge').style.display = 'none';
  document.getElementById('submit-vote-btn').disabled = true;
  document.querySelectorAll('.candidate-card').forEach(c => c.classList.remove('selected'));
}

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  loadData();

  // Attach submit handler
  document.getElementById('vote-form').addEventListener('submit', handleVoteSubmit);
  document.getElementById('btn-vote-another').addEventListener('click', voteAnother);

  // Auto-refresh data every 5 seconds to get live vote updates
  setInterval(loadData, 5000);
});
