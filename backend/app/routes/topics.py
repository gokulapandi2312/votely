import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.database import get_db
from app.models import User, Topic, TopicVote
from app.schemas import TopicCreate, TopicResponse, TopicVoteResponse, VoteRequest, CreatorStatsResponse, CreatorTopicItem

router = APIRouter(prefix="/api/topics", tags=["Topics"])

def build_topic_response(topic: Topic, vote_count: int, user_has_voted: bool = False) -> TopicResponse:
    return TopicResponse(
        id=topic.id,
        title=topic.title,
        created_by=topic.created_by,
        creator_name=topic.creator_name,
        creator_email=topic.creator_email,
        interested_count=vote_count,
        has_voted=user_has_voted,
        created_at=topic.created_at
    )

@router.get("", response_model=List[TopicResponse])
def get_topics(
    q: Optional[str] = Query(None, description="Optional search query by topic title"),
    voter_email: Optional[str] = Query(None, description="Optional email to check voted status"),
    db: Session = Depends(get_db)
):
    """
    Retrieve all topics with interest counts and contributor details (Name & Email).
    Public endpoint - anyone can view all topics.
    Default sort: Highest number of interested users first.
    """
    vote_subquery = (
        db.query(
            TopicVote.topic_id,
            func.count(TopicVote.id).label("vote_count")
        )
        .group_by(TopicVote.topic_id)
        .subquery()
    )

    query = (
        db.query(
            Topic,
            func.coalesce(vote_subquery.c.vote_count, 0).label("vote_count")
        )
        .outerjoin(vote_subquery, Topic.id == vote_subquery.c.topic_id)
    )

    if q and q.strip():
        search_term = f"%{q.strip().lower()}%"
        query = query.filter(Topic.normalized_title.like(search_term))

    query = query.order_by(desc("vote_count"), desc(Topic.created_at))
    results = query.all()

    user_voted_topic_ids = set()
    if voter_email and voter_email.strip():
        clean_email = voter_email.strip().lower()
        voted_ids = (
            db.query(TopicVote.topic_id)
            .filter(TopicVote.voter_email == clean_email)
            .all()
        )
        user_voted_topic_ids = {v[0] for v in voted_ids}

    response_list = []
    for topic, count in results:
        has_voted = topic.id in user_voted_topic_ids
        response_list.append(build_topic_response(topic, count, has_voted))

    return response_list


@router.get("/search", response_model=List[TopicResponse])
def search_topics(
    q: str = Query(..., min_length=1, description="Search term for topics"),
    db: Session = Depends(get_db)
):
    """Search topics by title."""
    return get_topics(q=q, db=db)


@router.get("/creators", response_model=List[CreatorStatsResponse])
def get_creator_stats(db: Session = Depends(get_db)):
    """
    Get all users who added topics, how many total votes they have received,
    and the list of topic names they created with individual vote counts.
    Ranked by total votes received in descending order.
    """
    vote_subquery = (
        db.query(
            TopicVote.topic_id,
            func.count(TopicVote.id).label("vote_count")
        )
        .group_by(TopicVote.topic_id)
        .subquery()
    )

    creator_aggregates = (
        db.query(
            Topic.creator_name,
            Topic.creator_email,
            func.count(Topic.id).label("topics_count"),
            func.coalesce(func.sum(vote_subquery.c.vote_count), 0).label("total_votes")
        )
        .outerjoin(vote_subquery, Topic.id == vote_subquery.c.topic_id)
        .group_by(Topic.creator_email, Topic.creator_name)
        .order_by(desc("total_votes"), desc("topics_count"))
        .all()
    )

    # Fetch all individual topics with their vote counts
    topics_with_votes = (
        db.query(
            Topic.id,
            Topic.title,
            Topic.creator_email,
            func.coalesce(vote_subquery.c.vote_count, 0).label("vote_count")
        )
        .outerjoin(vote_subquery, Topic.id == vote_subquery.c.topic_id)
        .order_by(desc("vote_count"))
        .all()
    )

    creator_topics_map = {}
    for tid, title, c_email, v_count in topics_with_votes:
        if c_email not in creator_topics_map:
            creator_topics_map[c_email] = []
        creator_topics_map[c_email].append(
            CreatorTopicItem(id=tid, title=title, votes_count=int(v_count))
        )

    return [
        CreatorStatsResponse(
            creator_name=r[0],
            creator_email=r[1],
            topics_count=r[2],
            total_votes=int(r[3]),
            topics=creator_topics_map.get(r[1], [])
        )
        for r in creator_aggregates
    ]


@router.post("", response_model=TopicResponse, status_code=status.HTTP_201_CREATED)
def create_topic(
    payload: TopicCreate,
    db: Session = Depends(get_db)
):
    """
    Anyone can create a topic!
    Takes topic title, and optional creator name and email.
    Saves topic in MySQL and records initial vote.
    """
    clean_title = payload.title.strip()
    norm_title = clean_title.lower()
    clean_name = (payload.creator_name.strip() if payload.creator_name and payload.creator_name.strip() else "Community Member")
    clean_email = (payload.creator_email.strip().lower() if payload.creator_email and payload.creator_email.strip() else "community@learntogether.org")

    # Check duplicate topic title
    existing = db.query(Topic).filter(Topic.normalized_title == norm_title).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A topic '{existing.title}' already exists. Anyone can vote for it below with +1!"
        )

    # Find or create user
    user = db.query(User).filter(User.email == clean_email).first()
    if not user:
        user = User(
            sso_user_id=f"public-{uuid.uuid4()}",
            name=clean_name,
            email=clean_email,
            avatar_url=f"https://api.dicebear.com/7.x/initials/svg?seed={clean_name}"
        )
        db.add(user)
        db.flush()

    new_topic = Topic(
        title=clean_title,
        normalized_title=norm_title,
        created_by=user.id,
        creator_name=clean_name,
        creator_email=clean_email
    )
    db.add(new_topic)
    db.flush()

    # Add creator's initial vote
    creator_vote = TopicVote(user_id=user.id, topic_id=new_topic.id, voter_email=clean_email)
    db.add(creator_vote)
    db.commit()
    db.refresh(new_topic)

    return build_topic_response(new_topic, vote_count=1, user_has_voted=False)


@router.post("/{topic_id}/vote", response_model=TopicVoteResponse, status_code=status.HTTP_200_OK)
def vote_topic(
    topic_id: int,
    payload: Optional[VoteRequest] = Body(default=None),
    db: Session = Depends(get_db)
):
    """
    Anyone can vote on any topic!
    Increments topic vote count and records the vote in MySQL.
    """
    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Topic not found."
        )

    voter_email = (payload.voter_email.strip().lower() if payload and payload.voter_email else None)
    voter_name = (payload.voter_name.strip() if payload and payload.voter_name else "Community Learner")

    # If voter email provided, associate with user
    user_id = None
    if voter_email:
        user = db.query(User).filter(User.email == voter_email).first()
        if not user:
            user = User(
                sso_user_id=f"public-{uuid.uuid4()}",
                name=voter_name,
                email=voter_email,
                avatar_url=f"https://api.dicebear.com/7.x/initials/svg?seed={voter_name}"
            )
            db.add(user)
            db.flush()
        user_id = user.id

    # Record the vote
    new_vote = TopicVote(user_id=user_id, topic_id=topic_id, voter_email=voter_email)
    db.add(new_vote)
    db.commit()

    total_votes = db.query(func.count(TopicVote.id)).filter(TopicVote.topic_id == topic_id).scalar()

    return TopicVoteResponse(
        success=True,
        message=f"Vote recorded! Interest count increased for '{topic.title}'.",
        topic_id=topic_id,
        new_count=total_votes,
        has_voted=True
    )
