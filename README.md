# LearnTogether – Topic Sharing Web Application

A modern, responsive, single-page web application where users share what they want to learn and support community-suggested topics with **+1 votes**.

Built with **Python FastAPI**, **SQLAlchemy ORM**, **Alembic**, **OAuth 2.0 / OpenID Connect SSO**, **React with TypeScript**, and **Tailwind CSS**.

---

## 🌟 Key Features

1. **Strict Single-Page Design**:
   - One main page containing the topic submission form ("What do you want to learn?") at the top, and the ranked community topic list with **+1 buttons** directly below.
2. **Public Access (No Login Required)**:
   - Anyone can view the board, search topics, and get real-time interest counts.
   - When submitting a topic, users simply enter the **Topic Title**, their **Full Name**, and **Email ID**.
   - No authentication, passwords, or SSO barriers required to view or vote.
3. **Voting Behavior & Duplicate Prevention**:
   - Enforces unique voting per topic (`UniqueConstraint('user_id', 'topic_id')`).
   - Normalizes titles to prevent duplicate topics, ignoring case and whitespace differences (`UniqueConstraint('normalized_title')`).
   - Instant optimistic UI update with live counter synchronization.
4. **Search & Sorting**:
   - Default sorting: Highest number of interested users first.
   - Real-time instant search by topic name.

---

## 📂 Project Structure

```text
voting_system/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI application, CORS, static SPA mount
│   │   ├── config.py            # Pydantic Settings & SSO environment configs
│   │   ├── database.py          # SQLAlchemy engine, SessionLocal, get_db
│   │   ├── models.py            # User, Topic, and TopicVote SQLAlchemy models
│   │   ├── schemas.py           # Pydantic models & request validators
│   │   ├── auth.py              # JWT token generation & get_current_user dependencies
│   │   └── routes/
│   │       ├── auth.py          # /api/auth/me, /logout, /sso/login, /dev-login
│   │       └── topics.py        # /api/topics (GET, POST), /{id}/vote, /search
│   ├── alembic/
│   │   ├── env.py               # Alembic database migration environment
│   │   ├── script.py.mako
│   │   └── versions/
│   │       └── 001_initial_schema.py # Initial database migration
│   ├── tests/
│   │   ├── conftest.py          # In-memory SQLite fixtures & authenticated clients
│   │   └── test_topics.py       # 9 comprehensive automated tests
│   ├── alembic.ini
│   ├── requirements.txt
│   ├── .env.example
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts        # Fetch client, JWT storage & API methods
│   │   ├── components/
│   │   │   ├── Header.tsx       # Brand title, SSO user profile badge & logout
│   │   │   ├── TopicForm.tsx    # "What do you want to learn?" input & submission
│   │   │   ├── TopicList.tsx    # Ranked topics, +1 buttons, and search filter
│   │   │   └── LoginModal.tsx   # Google, Microsoft Entra ID & 1-Click Dev SSO
│   │   ├── types/
│   │   │   └── index.ts         # TypeScript interfaces (User, Topic, VoteResponse)
│   │   ├── App.tsx              # Single-page application coordinator & toast alerts
│   │   ├── main.tsx             # React DOM entry point
│   │   └── index.css            # Tailwind CSS directives & typography
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts           # Vite config with API proxy to localhost:8000
│
├── .gitignore
└── README.md
```

---

## 🗄️ Database Design

```sql
-- Users Table
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sso_user_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    avatar_url VARCHAR(512),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Topics Table
CREATE TABLE topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(255) NOT NULL,
    normalized_title VARCHAR(255) UNIQUE NOT NULL, -- Lowercase trimmed, enforces uniqueness
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    creator_name VARCHAR(255) NOT NULL,           -- Direct creator name
    creator_email VARCHAR(255) NOT NULL,          -- Direct creator email
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Topic Votes Table (Enforces single vote per user)
CREATE TABLE topic_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_topic_vote UNIQUE (user_id, topic_id)
);
```

---

## 🚀 Quick Start (Running Locally)

### 1. Run the Backend (FastAPI)

```bash
cd backend

# Install dependencies (if not already installed)
pip install -r requirements.txt

# Run migrations (optional, tables also auto-create on startup)
alembic upgrade head

# Start the FastAPI server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The server is available at **http://localhost:8000**.
* **Interactive Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **ReDoc Documentation**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

### 2. Run the Frontend (React + Vite)

```bash
cd frontend

# Install npm dependencies
npm install

# Start Vite development server
npm run dev
```

The frontend will open at **http://localhost:5173**.
*(Note: In production, the FastAPI server also directly serves the compiled frontend bundle at `http://localhost:8000/`)*.

---

## 🔐 SSO Authentication Setup

### A. Fast Dev SSO (Enabled by Default)
For local development and testing, `DEV_SSO_ENABLED=true` in `backend/.env`. Click **"Sign In with SSO"** on the web page to select instant pre-configured mock profiles (**Alice Chen**, **Bob Martinez**, **Charlie Patel**) or enter any custom name/email.

### B. Google OAuth 2.0 Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create an **OAuth 2.0 Client ID** (Web application).
3. Set Authorized Redirect URI: `http://localhost:8000/api/auth/sso/callback/google`
4. Copy Client ID and Client Secret into `backend/.env`:
   ```env
   GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   ```

### C. Microsoft Entra ID (Azure AD) Setup
1. Go to [Microsoft Entra Admin Center](https://entra.microsoft.com/) / Azure Portal.
2. Under **App registrations**, register a new application.
3. Add a Web redirect URI: `http://localhost:8000/api/auth/sso/callback/microsoft`
4. Copy Client ID, Client Secret, and Tenant ID into `backend/.env`:
   ```env
   AZURE_CLIENT_ID=your-azure-app-client-id
   AZURE_CLIENT_SECRET=your-azure-client-secret
   AZURE_TENANT_ID=common
   ```

---

## 🧪 Automated Testing

The backend includes a comprehensive test suite using **pytest** covering all acceptance criteria:

```bash
# Run tests from project root
python -m pytest backend/tests -v
```

### Verified Test Cases:
1. `test_1_create_new_topic`: Creating a new topic returns `201 Created` with initial count.
2. `test_2_reject_empty_topic`: Empty or whitespace-only topics return `422 Unprocessable Entity`.
3. `test_3_prevent_duplicate_topics`: Duplicate titles (case-insensitive) return `409 Conflict`.
4. `test_4_successfully_vote_for_topic`: Voting returns `200 OK` and increments counter by 1.
5. `test_5_prevent_same_user_voting_twice`: Duplicate vote attempts return `409 Conflict`.
6. `test_6_allow_different_users_to_vote`: Different users can vote for the same topic.
7. `test_7_correctly_calculate_interest_counts`: Verifies aggregate counters across topics.
8. `test_8_searching_and_sorting_topics`: Verifies query search and default sort by highest interest count.
9. `test_9_reject_unauthenticated_requests`: Rejects unauthenticated creation and voting with `401 Unauthorized`.
