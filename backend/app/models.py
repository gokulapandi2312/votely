from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Index,
    func
)
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    sso_user_id = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    avatar_url = Column(String(512), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, server_default=func.now(), nullable=False)

    # Relationships
    topics = relationship("Topic", back_populates="creator")
    votes = relationship("TopicVote", back_populates="user")


class Topic(Base):
    __tablename__ = "topics"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    normalized_title = Column(String(255), unique=True, index=True, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    creator_name = Column(String(255), nullable=False)
    creator_email = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, server_default=func.now(), nullable=False)

    # Relationships
    creator = relationship("User", back_populates="topics")
    votes = relationship("TopicVote", back_populates="topic", cascade="all, delete-orphan")


class TopicVote(Base):
    __tablename__ = "topic_votes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    topic_id = Column(Integer, ForeignKey("topics.id", ondelete="CASCADE"), nullable=False)
    voter_email = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, server_default=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="votes")
    topic = relationship("Topic", back_populates="votes")

    # Indexes
    __table_args__ = (
        Index("idx_topic_votes_topic_id", "topic_id"),
        Index("idx_topic_votes_user_id", "user_id"),
    )
