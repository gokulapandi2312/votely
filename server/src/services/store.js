const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_FILE = path.join(__dirname, '../data/db.json');

function getDefaultData() {
  const electionId = 'election-2026-tech-council';
  const startTime = new Date(Date.now() - 3600 * 4 * 1000).toISOString();
  const endTime = new Date(Date.now() + 3600 * 48 * 1000).toISOString();

  return {
    elections: [
      {
        id: electionId,
        title: '2026 Global Tech & Innovation Council Election',
        category: 'Executive Policy Council',
        description: 'Electing the Chief Technology Commissioner for Digital Rights, AI Safety & Next-Gen Infrastructure.',
        status: 'active', // active, closed, draft
        startTime,
        endTime,
        allowWriteIn: false,
        candidates: [
          {
            id: 'cand-1',
            name: 'Dr. Aris Vance',
            party: 'Forward Innovation Alliance',
            partyColor: '#38bdf8', // Cyan
            avatar: '/images/aris.jpg',
            tagline: 'Pioneering Open AI Governance & Post-Quantum Security.',
            bio: 'Former Director of Distributed Systems at CERN. Author of the Open Source Civic Infrastructure Charter with 18 years in computational cryptography.',
            agenda: [
              'Mandatory Open Source standards for public algorithms',
              'Zero-Trust sovereign voter privacy frameworks',
              'Decentralized citizen-owned compute clusters'
            ],
            votes: 412
          },
          {
            id: 'cand-2',
            name: 'Elena Rostova',
            party: 'Sustainable Future Coalition',
            partyColor: '#10b981', // Emerald
            avatar: '/images/elena.jpg',
            tagline: 'Eco-Centric Computing & Equitable Automation.',
            bio: 'Environmental systems engineer and founder of the Carbon-Neutral Compute Initiative. 15 years advising national energy and smart grid councils.',
            agenda: [
              '100% Clean Energy mandate for public AI data centers',
              'Algorithmic bias auditing & public impact reports',
              'Equitable green technology grants for schools'
            ],
            votes: 485
          },
          {
            id: 'cand-3',
            name: 'Marcus Sterling',
            party: 'Economic Sovereignty Alliance',
            partyColor: '#fbbf24', // Amber
            avatar: '/images/marcus.jpg',
            tagline: 'Decentralized Finance & Worker Protection in the AI Era.',
            bio: 'Senior Economic Policy Analyst and former FinTech Regulatory Commissioner. Architect of universal digital worker dividend proposals.',
            agenda: [
              'Automation transition dividend fund for displaced labor',
              'Privacy-first public digital currency protocols',
              'Stricter anti-monopoly enforcement on big tech'
            ],
            votes: 326
          },
          {
            id: 'cand-4',
            name: 'Dr. Amara Okafor',
            party: 'Civic Tech & Universal Education',
            partyColor: '#c084fc', // Purple
            avatar: '/images/amara.jpg',
            tagline: 'Democratizing STEM Education & Universal Broadband.',
            bio: 'Pioneer in low-latency mesh networks for underserved schools and founder of the Global Youth Coding Initiative, impacting 2M+ students.',
            agenda: [
              'Universal high-speed civic fiber & satellite access',
              'Open-source STEM curriculum for global K-12',
              'Public civic innovation laboratories in every city'
            ],
            votes: 440
          }
        ]
      }
    ],
    voters: [
      {
        id: 'voter-1',
        name: 'Sarah Connor',
        voterId: 'VT-89421',
        pin: '1234',
        email: 'sarah.c@civic.org',
        registeredAt: '2026-09-12T10:00:00Z',
        hasVotedIn: []
      },
      {
        id: 'voter-2',
        name: 'David Kim',
        voterId: 'VT-67104',
        pin: '1234',
        email: 'david.k@civic.org',
        registeredAt: '2026-09-14T11:30:00Z',
        hasVotedIn: []
      },
      {
        id: 'voter-3',
        name: 'Priya Patel',
        voterId: 'VT-33981',
        pin: '1234',
        email: 'priya.p@civic.org',
        registeredAt: '2026-09-15T09:15:00Z',
        hasVotedIn: []
      },
      {
        id: 'voter-4',
        name: 'Alex Rivera',
        voterId: 'VT-51209',
        pin: '1234',
        email: 'alex.r@civic.org',
        registeredAt: '2026-09-18T14:45:00Z',
        hasVotedIn: []
      }
    ],
    admin: {
      username: 'admin',
      password: 'admin123',
      name: 'Commissioner Helena Cross',
      role: 'Chief Election Supervisor'
    },
    // Anonymous Ballots: Never contains voter ID or voter info!
    ballots: [],
    // Voter Records: Tracks that voter cast a ballot, records receipt token for personal verification
    voterRecords: [],
    // Tamper-evident cryptographic audit log
    auditLogs: [
      {
        block: 1,
        timestamp: startTime,
        action: 'ELECTION_GENESIS_INITIALIZED',
        details: '2026 Global Tech & Innovation Council Election initialized with 4 validated candidates.',
        previousHash: '0000000000000000000000000000000000000000000000000000000000000000',
        hash: 'b1a8d052d9a6c9cf1dfa6f02fa62121e7d8d2b2746be7a0be0945cb69f9c7e39'
      },
      {
        block: 2,
        timestamp: new Date(Date.now() - 3600 * 3 * 1000).toISOString(),
        action: 'SYSTEM_AUDIT_VERIFIED',
        details: 'Cryptographic baseline verification completed. Zero tamper flags detected.',
        previousHash: 'b1a8d052d9a6c9cf1dfa6f02fa62121e7d8d2b2746be7a0be0945cb69f9c7e39',
        hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
      }
    ]
  };
}

class Store {
  constructor() {
    this.data = null;
    this.init();
  }

  init() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      } else {
        this.data = getDefaultData();
        this.save();
      }
    } catch (e) {
      console.error('Error loading DB, resetting to defaults:', e);
      this.data = getDefaultData();
      this.save();
    }
  }

  save() {
    try {
      fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save DB file:', err);
    }
  }

  reset() {
    this.data = getDefaultData();
    this.save();
    return this.data;
  }
}

const storeInstance = new Store();
module.exports = storeInstance;
