import React from 'react';
import { Trophy, Award, ThumbsUp, BookOpen, Sparkles, Loader2 } from 'lucide-react';
import { CreatorStats } from '../types';

interface CreatorLeaderboardProps {
  creators: CreatorStats[];
  loading: boolean;
}

export const CreatorLeaderboard: React.FC<CreatorLeaderboardProps> = ({ creators, loading }) => {
  return (
    <div className="votely-card p-5 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-400 to-amber-600 text-black flex items-center justify-center shadow-[0_0_14px_rgba(245,158,11,0.45)]">
            <Trophy className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
              Topic Creators
            </h3>
            <p className="text-[11px] text-slate-400">
              Votes received by users for their topics
            </p>
          </div>
        </div>

        {creators.length > 0 && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-violet-950/60 text-violet-300 border border-violet-500/30 shadow-[0_0_10px_rgba(139,92,246,0.2)]">
            {creators.length} {creators.length === 1 ? 'creator' : 'creators'}
          </span>
        )}
      </div>

      {/* Creators List */}
      <div className="mt-4">
        {loading ? (
          <div className="py-10 text-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-400 mb-2" />
            <p className="text-xs">Loading creators...</p>
          </div>
        ) : creators.length === 0 ? (
          <div className="py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-2.5 text-slate-500">
              <Sparkles className="w-5 h-5 text-violet-400" />
            </div>
            <h4 className="text-sm font-semibold text-white">No creators yet</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-[220px] mx-auto">
              Propose a topic to appear on the creator board and collect votes!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {creators.map((creator, index) => {
              const rank = index + 1;
              const initials = creator.creator_name
                .split(' ')
                .map((n) => n[0])
                .filter(Boolean)
                .slice(0, 2)
                .join('')
                .toUpperCase() || 'U';

              return (
                <div
                  key={`${creator.creator_email}-${index}`}
                  className="p-3.5 rounded-xl bg-[#0B1120]/80 hover:bg-[#0E172B] border border-white/10 hover:border-violet-500/40 transition-all hover:shadow-[0_0_15px_rgba(139,92,246,0.15)] group flex flex-col gap-2.5"
                >
                  {/* Top Row: User Header & Total Votes */}
                  <div className="flex items-center justify-between gap-3">
                    {/* Left: Rank & Avatar & User Info */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* Rank Badge */}
                      <div
                        className={`w-6 h-6 shrink-0 rounded-lg flex items-center justify-center text-[11px] font-bold ${
                          rank === 1
                            ? 'bg-gradient-to-tr from-amber-400 to-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                            : rank === 2
                            ? 'bg-slate-700 text-cyan-300 border border-cyan-500/30'
                            : rank === 3
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-600/40'
                            : 'bg-white/5 text-slate-400 border border-white/10'
                        }`}
                        title={`Rank #${rank}`}
                      >
                        {rank === 1 ? '1' : rank}
                      </div>

                      {/* Avatar Initials */}
                      <div className="w-8 h-8 shrink-0 rounded-full bg-violet-950/80 text-violet-300 flex items-center justify-center text-xs font-bold border border-violet-500/30 shadow-[0_0_8px_rgba(139,92,246,0.25)]">
                        {initials}
                      </div>

                      {/* Name & Email & Topic Count */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs sm:text-sm text-white truncate group-hover:text-cyan-300 transition-colors">
                            {creator.creator_name}
                          </span>
                          {rank === 1 && (
                            <span title="Top Topic Creator" className="inline-flex items-center">
                              <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-[11px] text-slate-400 truncate mt-0.5">
                          <span className="truncate max-w-[130px] font-mono" title={creator.creator_email}>
                            {creator.creator_email}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5 text-slate-300 font-medium shrink-0">
                            <BookOpen className="w-3 h-3 text-slate-400" />
                            {creator.topics_count} {creator.topics_count === 1 ? 'topic' : 'topics'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Total Votes Pill */}
                    <div className="shrink-0 text-right">
                      <div
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-950/60 text-violet-300 border border-violet-500/40 font-bold text-xs shadow-[0_0_12px_rgba(139,92,246,0.25)]"
                        title={`${creator.total_votes} total votes received across all submitted topics`}
                      >
                        <ThumbsUp className="w-3 h-3 stroke-[2.5] text-cyan-400" />
                        <span>{creator.total_votes}</span>
                        <span className="hidden sm:inline font-medium text-[11px]">
                          {creator.total_votes === 1 ? 'vote' : 'votes'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Topic Names Section */}
                  {creator.topics && creator.topics.length > 0 && (
                    <div className="pt-2 border-t border-white/10 space-y-1.5">
                      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                        <span>Topics Added:</span>
                      </div>
                      <div className="space-y-1">
                        {creator.topics.map((topic) => (
                          <div
                            key={topic.id}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#070A12] border border-white/5 hover:border-cyan-500/30 transition-colors"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)] shrink-0" />
                            <span className="text-xs font-medium text-slate-200 truncate" title={topic.title}>
                              {topic.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Helpful footnote */}
      <div className="mt-4 pt-3 border-t border-white/10 text-center">
        <p className="text-[11px] text-slate-400">
          Votes increase each time a community member clicks <strong className="text-cyan-400 font-semibold">+1</strong> on any topic created by that user.
        </p>
      </div>
    </div>
  );
};

