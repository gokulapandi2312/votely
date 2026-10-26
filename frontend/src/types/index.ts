export interface User {
  id: number;
  sso_user_id: string;
  name: string;
  email: string;
  avatar_url?: string;
  created_at: string;
}

export interface Topic {
  id: number;
  title: string;
  created_by: number;
  creator_name: string;
  creator_email: string;
  interested_count: number;
  has_voted: boolean;
  created_at: string;
}

export interface TopicVoteResponse {
  success: boolean;
  message: string;
  topic_id: number;
  new_count: number;
  has_voted: boolean;
}

export interface CreatorTopicItem {
  id: number;
  title: string;
  votes_count: number;
}

export interface CreatorStats {
  creator_name: string;
  creator_email: string;
  topics_count: number;
  total_votes: number;
  topics: CreatorTopicItem[];
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface ApiError {
  detail: string;
}
