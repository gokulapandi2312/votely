from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator, EmailStr

class UserResponse(BaseModel):
    id: int
    sso_user_id: str
    name: str
    email: str
    avatar_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TopicCreate(BaseModel):
    title: str = Field(..., description="The name of the topic to learn")
    creator_name: Optional[str] = Field("Community Member", description="Name of the person proposing the topic")
    creator_email: Optional[str] = Field("community@learntogether.org", description="Email address of the person proposing the topic")

    @field_validator("title")
    def validate_title(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Topic title cannot be empty.")
        if len(trimmed) < 2:
            raise ValueError("Topic title must be at least 2 characters long.")
        if len(trimmed) > 150:
            raise ValueError("Topic title cannot exceed 150 characters.")
        return trimmed

    @field_validator("creator_name")
    def validate_name(cls, v: Optional[str]) -> str:
        if not v or not v.strip():
            return "Community Member"
        return v.strip()

    @field_validator("creator_email")
    def validate_email(cls, v: Optional[str]) -> str:
        if not v or not v.strip() or "@" not in v:
            return "community@learntogether.org"
        return v.strip().lower()


class TopicResponse(BaseModel):
    id: int
    title: str
    created_by: Optional[int] = None
    creator_name: str
    creator_email: str
    interested_count: int
    has_voted: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class CreatorTopicItem(BaseModel):
    id: int
    title: str
    votes_count: int

    class Config:
        from_attributes = True


class CreatorStatsResponse(BaseModel):
    creator_name: str
    creator_email: str
    topics_count: int
    total_votes: int
    topics: List[CreatorTopicItem] = []

    class Config:
        from_attributes = True



class VoteRequest(BaseModel):
    voter_email: Optional[str] = None
    voter_name: Optional[str] = None


class TopicVoteResponse(BaseModel):
    success: bool
    message: str
    topic_id: int
    new_count: int
    has_voted: bool = True


class DevLoginRequest(BaseModel):
    name: str
    email: str
    sso_user_id: Optional[str] = None
    avatar_url: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
