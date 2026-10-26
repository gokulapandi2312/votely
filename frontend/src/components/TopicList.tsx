import React, { useState } from 'react';
import { Search, ThumbsUp, Check, Users, Sparkles, Loader2 } from 'lucide-react';
import { Topic } from '../types';

interface TopicListProps {
  
  topics: Topic[];
  onVote: (topicId: number) => Promise<void>;
  loading: boolean;
}

export const TopicList: React.FC<TopicListProps> = ({
  topics,
  onVote,
  loading,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [votingTopicId, setVotingTopicId] = useState<number | null>(null);
  const [justVotedId, setJustVotedId] = useState<number | null>(null);

  // Filter topics by search query
  const filteredTopics = topics.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const handleVoteClick = async (topicId: number) => {
    setVotingTopicId(topicId);
    try {
      await onVote(topicId);
      setJustVotedId(topicId);
      setTimeout(() => {
        setJustVotedId((curr) => (curr === topicId ? null : curr));
      }, 2500);
    } finally {
      setVotingTopicId(null);
    }
  };

  return (
    <div className="votely-card p-6 sm:p-8">
      
      {/* Header & Search Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            Community Topics
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/10 font-mono">
              {filteredTopics.length} {filteredTopics.length === 1 ? 'topic' : 'topics'}
            </span>
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Ranked by community interest. Click <strong className="text-cyan-400 font-semibold">+1</strong> to express interest in learning any topic.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search topics by name..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-white/10 bg-[#0B1120] focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 focus:outline-hidden transition-all text-white placeholder-slate-500"
          />
        </div>
      </div>

      {/* Topics List */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-cyan-400 mb-2.5" />
          <p className="text-sm">Loading community topics...</p>
        </div>
      ) : filteredTopics.length === 0 ? (
        <div className="py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3 text-slate-500">
            <Sparkles className="w-6 h-6 text-violet-400" />
          </div>
          {searchQuery ? (
            <>
              <h4 className="text-base font-semibold text-white">No topics match "{searchQuery}"</h4>
              <p className="text-xs text-slate-400 mt-1">Try another search or propose it above!</p>
            </>
          ) : (
            <>
              <h4 className="text-base font-semibold text-white">No topics submitted yet</h4>
              <p className="text-xs text-slate-400 mt-1">Be the first to submit a topic above!</p>
            </>
          )}
        </div>
      ) : (
        <div className="divide-y divide-white/5 mt-1">
          {filteredTopics.map((topic, index) => {
            const isVotingThis = votingTopicId === topic.id;
            const hasJustVoted = justVotedId === topic.id;

            return (
              <div
                key={topic.id}
                className="py-4.5 sm:py-5 flex items-center justify-between gap-4 hover:bg-[#131B2E]/60 px-3.5 -mx-3 rounded-xl transition-all border border-transparent hover:border-violet-500/20 group"
              >
                
                {/* Topic Info with Name & Email */}
                <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-7 h-7 shrink-0 rounded-lg bg-white/5 text-slate-400 flex items-center justify-center text-xs font-bold group-hover:bg-violet-950/80 group-hover:text-cyan-300 transition-colors border border-white/10 group-hover:border-violet-500/30">
                    #{index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-base font-semibold text-white leading-snug break-words group-hover:text-cyan-300 transition-colors">
                      {topic.title}
                    </h4>
                    
                    {/* User Details: Name and Email ID */}
                    <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-1.5">
                      <span>Suggested by</span>
                      <strong className="text-slate-200 font-semibold">{topic.creator_name}</strong>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-white/5 text-slate-400 font-mono text-[11px] border border-white/10">
                        {topic.creator_email}
                      </span>
                      <span>•</span>
                      <span>{new Date(topic.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                </div>

                {/* Counter & Voting Buttons */}
                <div className="flex items-center gap-3 sm:gap-3.5 shrink-0">
                  
                  {/* Interested count pill */}
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold bg-cyan-950/50 text-cyan-300 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                    title={`${topic.interested_count} learners want to learn this`}
                  >
                    <Users className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{topic.interested_count}</span>
                    <span className="hidden md:inline font-normal text-xs opacity-80">interested</span>
                  </div>

                  {/* Cyberpunk +1 Action Button */}
                  <button
                    onClick={() => handleVoteClick(topic.id)}
                    disabled={isVotingThis}
                    title="Vote for this topic"
                    className={`inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold px-3.5 py-1.5 rounded-xl transition-all active:scale-95 disabled:opacity-60 cursor-pointer ${
                      hasJustVoted
                        ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white border border-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.5)]'
                        : 'bg-gradient-to-r from-violet-600/20 to-cyan-600/20 hover:from-violet-600 hover:to-cyan-600 text-violet-200 hover:text-white border border-violet-500/40 hover:border-cyan-400 shadow-[0_0_10px_rgba(139,92,246,0.15)] hover:shadow-[0_0_16px_rgba(6,182,212,0.4)]'
                    }`}
                  >
                    {isVotingThis ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : hasJustVoted ? (
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    ) : (
                      <ThumbsUp className="w-3.5 h-3.5 stroke-[2]" />
                    )}
                    <span>{hasJustVoted ? '✓ Interested' : '+1'}</span>
                  </button>

                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

