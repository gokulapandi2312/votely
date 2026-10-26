import pytest

def test_1_create_new_topic(client):
    """Test 1: Creating a new topic without login returns 201 with user details and initial count."""
    response = client.post(
        "/api/topics",
        json={
            "title": "Rust Systems Programming",
            "creator_name": "Alice Tester",
            "creator_email": "alice@test.org"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Rust Systems Programming"
    assert data["creator_name"] == "Alice Tester"
    assert data["creator_email"] == "alice@test.org"
    assert data["interested_count"] == 1
    assert "id" in data


def test_2_reject_empty_topic(client):
    """Test 2: Rejecting an empty topic or whitespace-only input."""
    # Completely empty
    res_empty = client.post(
        "/api/topics",
        json={"title": "", "creator_name": "Alice", "creator_email": "alice@test.org"}
    )
    assert res_empty.status_code == 422

    # Whitespace only
    res_spaces = client.post(
        "/api/topics",
        json={"title": "     ", "creator_name": "Alice", "creator_email": "alice@test.org"}
    )
    assert res_spaces.status_code == 422


def test_3_prevent_duplicate_topics(client):
    """Test 3: Preventing duplicate topics ignoring case differences (409 Conflict)."""
    # Create initial topic
    res1 = client.post(
        "/api/topics",
        json={
            "title": "Golang Microservices",
            "creator_name": "Bob",
            "creator_email": "bob@test.org"
        }
    )
    assert res1.status_code == 201

    # Attempt duplicate with different casing and whitespace
    res2 = client.post(
        "/api/topics",
        json={
            "title": "  golang microservices  ",
            "creator_name": "Charlie",
            "creator_email": "charlie@test.org"
        }
    )
    assert res2.status_code == 409
    assert "already exists" in res2.json()["detail"].lower()


def test_4_successfully_vote_for_topic(client):
    """Test 4: Successfully voting (+1) for an existing topic without login."""
    create_res = client.post(
        "/api/topics",
        json={
            "title": "Kubernetes in Production",
            "creator_name": "Alice",
            "creator_email": "alice@test.org"
        }
    )
    topic_id = create_res.json()["id"]

    vote_res = client.post(
        f"/api/topics/{topic_id}/vote",
        json={"voter_name": "Bob", "voter_email": "bob@test.org"}
    )
    assert vote_res.status_code == 200
    data = vote_res.json()
    assert data["success"] is True
    assert data["new_count"] == 2
    assert data["has_voted"] is True


def test_5_open_voting_increments_count(client):
    """Test 5: Open voting allows anyone to vote on any topic and increments count."""
    create_res = client.post(
        "/api/topics",
        json={
            "title": "GraphQL APIs",
            "creator_name": "Alice",
            "creator_email": "alice@test.org"
        }
    )
    topic_id = create_res.json()["id"]

    # First vote
    res1 = client.post(
        f"/api/topics/{topic_id}/vote",
        json={"voter_name": "Bob", "voter_email": "bob@test.org"}
    )
    assert res1.status_code == 200
    assert res1.json()["new_count"] >= 2

    # Another vote
    res2 = client.post(
        f"/api/topics/{topic_id}/vote",
        json={"voter_name": "Bob", "voter_email": "bob@test.org"}
    )
    assert res2.status_code == 200
    assert res2.json()["new_count"] >= 3


def test_6_allow_different_users_to_vote(client):
    """Test 6: Allowing different users to vote for the same topic."""
    create_res = client.post(
        "/api/topics",
        json={
            "title": "Docker Essentials",
            "creator_name": "Alice",
            "creator_email": "alice@test.org"
        }
    )
    topic_id = create_res.json()["id"]

    # Voter 1
    res1 = client.post(f"/api/topics/{topic_id}/vote", json={"voter_name": "Bob", "voter_email": "bob@test.org"})
    assert res1.status_code == 200
    assert res1.json()["new_count"] == 2

    # Voter 2
    res2 = client.post(f"/api/topics/{topic_id}/vote", json={"voter_name": "Charlie", "voter_email": "charlie@test.org"})
    assert res2.status_code == 200
    assert res2.json()["new_count"] == 3


def test_7_correctly_calculate_interest_counts(client):
    """Test 7: Correctly calculating interest counts across topics."""
    t1 = client.post(
        "/api/topics",
        json={"title": "Topic One", "creator_name": "Alice", "creator_email": "alice@test.org"}
    ).json()["id"]

    t2 = client.post(
        "/api/topics",
        json={"title": "Topic Two", "creator_name": "Bob", "creator_email": "bob@test.org"}
    ).json()["id"]

    # Add second vote to Topic One
    client.post(f"/api/topics/{t1}/vote", json={"voter_name": "Charlie", "voter_email": "charlie@test.org"})

    # Fetch list
    topics = client.get("/api/topics").json()

    topic1 = next(t for t in topics if t["id"] == t1)
    topic2 = next(t for t in topics if t["id"] == t2)

    assert topic1["interested_count"] == 2
    assert topic2["interested_count"] == 1


def test_8_searching_and_sorting_topics(client):
    """Test 8: Searching topics by name and sorting by highest interest count first."""
    t_ml = client.post("/api/topics", json={"title": "Machine Learning", "creator_name": "Alice", "creator_email": "alice@test.org"}).json()["id"]
    t_web = client.post("/api/topics", json={"title": "Web Development", "creator_name": "Bob", "creator_email": "bob@test.org"}).json()["id"]
    t_algo = client.post("/api/topics", json={"title": "Algorithms & Data Structures", "creator_name": "Charlie", "creator_email": "charlie@test.org"}).json()["id"]

    # Give Web Development an extra vote
    client.post(f"/api/topics/{t_web}/vote", json={"voter_name": "Dan", "voter_email": "dan@test.org"})

    # Fetch all - Web Development should be at the top with 2 votes
    all_topics = client.get("/api/topics").json()
    assert all_topics[0]["id"] == t_web
    assert all_topics[0]["interested_count"] == 2

    # Search with ?q=
    search_res = client.get("/api/topics?q=machine").json()
    assert len(search_res) == 1
    assert search_res[0]["title"] == "Machine Learning"


def test_9_public_get_data_without_login(client):
    """Test 9: Verifying public data retrieval requires no login or token."""
    response = client.get("/api/topics")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_10_creator_leaderboard_vote_counts(client):
    """Test 10: Verifying topic added users and how many votes they got."""
    # Alice adds a topic and gets extra vote
    t1 = client.post("/api/topics", json={"title": "Rust Programming", "creator_name": "Alice Leader", "creator_email": "alice.leader@test.org"}).json()["id"]
    client.post(f"/api/topics/{t1}/vote", json={"voter_name": "Fan", "voter_email": "fan@test.org"})

    # Check creator leaderboard
    res = client.get("/api/topics/creators")
    assert res.status_code == 200
    creators = res.json()
    assert isinstance(creators, list)
    alice = next((c for c in creators if c["creator_email"] == "alice.leader@test.org"), None)
    assert alice is not None
    assert alice["topics_count"] >= 1
    assert alice["total_votes"] >= 2
    assert len(alice["topics"]) >= 1
    assert alice["topics"][0]["title"] == "Rust Programming"
    assert alice["topics"][0]["votes_count"] >= 2

