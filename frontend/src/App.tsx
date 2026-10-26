import React, { useState, useEffect } from 'react';
import { Topic, CreatorStats } from './types';
import { api } from './api/client';
import { Header } from './components/Header';
import { TopicForm } from './components/TopicForm';
import { TopicList } from './components/TopicList';
import { CreatorLeaderboard } from './components/CreatorLeaderboard';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

export const App: React.FC = () => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [creators, setCreators] = useState<CreatorStats[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [loadingCreators, setLoadingCreators] = useState(true);
  
  // Toast notification state
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // 1. Initial Load: Fetch all topics and creator statistics from MySQL backend
  useEffect(() => {
    loadTopics();
    loadCreatorStats();
  }, []);

  const loadTopics = async () => {
    try {
      setLoadingTopics(true);
      const data = await api.getTopics();
      setTopics(data);
    } catch (err: any) {
      showNotification('Failed to load community topics from MySQL.', 'error');
    } finally {
      setLoadingTopics(false);
    }
  };

  const loadCreatorStats = async () => {
    try {
      setLoadingCreators(true);
      const data = await api.getCreatorStats();
      setCreators(data);
    } catch (err: any) {
      console.error('Failed to load creator stats:', err);
    } finally {
      setLoadingCreators(false);
    }
  };

  // 2. Handle Topic Created (immediate update without page refresh)
  const handleTopicCreated = (newTopic: Topic) => {
    setTopics((prev) => [newTopic, ...prev]);
    // Refresh creator leaderboard
    loadCreatorStats();
  };

  // 3. Handle Voting (+1): Anyone can vote on any topic!
  const handleVote = async (topicId: number) => {
    const savedEmail = localStorage.getItem('learntogether_user_email') || undefined;
    const savedName = localStorage.getItem('learntogether_user_name') || undefined;

    // Optimistic Update: Increment interest count immediately
    setTopics((prev) =>
      prev.map((t) =>
        t.id === topicId
          ? { ...t, interested_count: t.interested_count + 1 }
          : t
      )
    );

    try {
      const res = await api.voteTopic(topicId, savedEmail, savedName);
      // Sync with server count from MySQL & re-sort
      setTopics((prev) =>
        prev
          .map((t) =>
            t.id === topicId
              ? { ...t, interested_count: res.new_count }
              : t
          )
          .sort((a, b) => b.interested_count - a.interested_count)
      );
      // Refresh creator vote counts on the leaderboard
      loadCreatorStats();
      showNotification(res.message, 'success');
    } catch (err: any) {
      // Revert on error
      const refreshed = await api.getTopics();
      setTopics(refreshed);
      loadCreatorStats();
      showNotification(err.message || 'Failed to submit vote.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0E17] votely-bg-gradient flex flex-col text-slate-100 selection:bg-violet-600 selection:text-white">
      
      {/* Header */}
      <Header />

      {/* Main Page Layout (Strictly 1 Main Page with Responsive Grid) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT SIDE: Topic Added Users & Their Total Votes Got */}
          <aside className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
            <CreatorLeaderboard creators={creators} loading={loadingCreators} />
          </aside>

          {/* RIGHT SIDE: What do you want to learn? (Topic Form) & Community Topics List */}
          <section className="lg:col-span-8 space-y-8">
            {/* Section A: What do you want to learn? (Topic Submission Form) */}
            <TopicForm
              existingTopics={topics}
              onTopicCreated={handleTopicCreated}
              onError={(msg) => showNotification(msg, 'error')}
              onSuccess={(msg) => showNotification(msg, 'success')}
            />

            {/* Section B & C: Community Topics List & Public +1 Voting */}
            <TopicList
              topics={topics}
              onVote={handleVote}
              loading={loadingTopics}
            />
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#070A12] py-8 text-center text-xs text-slate-400">
        <p>Votely &copy; 2026. Vote for what you want to learn.</p>
      </footer>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4.5 py-3 rounded-xl shadow-2xl border text-sm font-medium animate-fadeIn backdrop-blur-md ${
            toast.type === 'success'
              ? 'bg-[#0B1120]/95 text-white border-violet-500/40 shadow-[0_0_20px_rgba(139,92,246,0.3)]'
              : 'bg-red-950/95 text-white border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

    </div>
  );
};

export default App;

