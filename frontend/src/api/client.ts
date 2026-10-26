import { Topic, TopicVoteResponse, CreatorStats } from '../types';

export const api = {
  // GET DATA: Fetch all topics with interest counts and creator details
  async getTopics(query?: string, voterEmail?: string): Promise<Topic[]> {
    const params = new URLSearchParams();
    if (query && query.trim()) params.append('q', query.trim());
    if (voterEmail && voterEmail.trim()) params.append('voter_email', voterEmail.trim());

    const url = `/api/topics${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error('Failed to load topics.');
    }
    return res.json();
  },

  // GET DATA: Fetch topic creator leaderboard with vote counts
  async getCreatorStats(): Promise<CreatorStats[]> {
    const res = await fetch('/api/topics/creators');
    if (!res.ok) {
      throw new Error('Failed to load creator statistics.');
    }
    return res.json();
  },

  // STORE DATA: Create and submit a new topic (No login required)
  async createTopic(title: string, creatorName?: string, creatorEmail?: string): Promise<Topic> {
    const res = await fetch('/api/topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        creator_name: creatorName || undefined,
        creator_email: creatorEmail || undefined,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to create topic' }));
      throw new Error(err.detail || 'Failed to create topic');
    }

    return res.json();
  },

  // STORE DATA: Submit +1 vote for a topic (No login required)
  async voteTopic(topicId: number, voterEmail?: string, voterName?: string): Promise<TopicVoteResponse> {
    const res = await fetch(`/api/topics/${topicId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        voter_email: voterEmail || undefined,
        voter_name: voterName || undefined,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to record vote' }));
      throw new Error(err.detail || 'Failed to record vote');
    }

    return res.json();
  },
};

