const express = require('express');
const router = express.Router();

const publicVoting = require('../controllers/publicVotingController');

// Core Public Routes: Store Data & Get Data
router.get('/candidates', publicVoting.getCandidates);
router.post('/vote', publicVoting.storeVote);
router.get('/recent-votes', publicVoting.getRecentVotes);

// Alias /results to /candidates for easy client retrieval
router.get('/results', publicVoting.getCandidates);

module.exports = router;
