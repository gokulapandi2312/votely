import React, { useState } from 'react';
import { PlusCircle, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { Topic } from '../types';
import { api } from '../api/client';

interface TopicFormProps {
  existingTopics: Topic[];
  onTopicCreated: (topic: Topic) => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}

export const TopicForm: React.FC<TopicFormProps> = ({
  existingTopics,
  onTopicCreated,
  onError,
  onSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmedTitle = title.trim();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    // 1. Validation: Topic
    if (!trimmedTitle) {
      setValidationError('Please enter a topic name.');
      return;
    }
    if (trimmedTitle.length < 2) {
      setValidationError('Topic name must be at least 2 characters long.');
      return;
    }

    // 2. Validation: Email (if provided)
    if (trimmedEmail && !trimmedEmail.includes('@')) {
      setValidationError('Please enter a valid email address, or leave it blank.');
      return;
    }

    // 3. Prevent duplicate topics ignoring case differences
    const lowerTrimmed = trimmedTitle.toLowerCase();
    const duplicate = existingTopics.find(
      (t) => t.title.trim().toLowerCase() === lowerTrimmed
    );
    if (duplicate) {
      setValidationError(
        `"${duplicate.title}" already exists! You can support it with a +1 below.`
      );
      return;
    }

    setLoading(true);
    try {
      const creatorName = trimmedName || 'Community Member';
      const creatorEmail = trimmedEmail || 'community@learntogether.org';

      const newTopic = await api.createTopic(trimmedTitle, creatorName, creatorEmail);
      setTitle('');

      // Save to localStorage if provided
      if (trimmedName) localStorage.setItem('learntogether_user_name', trimmedName);
      if (trimmedEmail) localStorage.setItem('learntogether_user_email', trimmedEmail);

      onTopicCreated(newTopic);
      onSuccess(`"${newTopic.title}" added to the community board!`);
    } catch (err: any) {
      onError(err.message || 'Failed to submit topic.');
    } finally {
      setLoading(false);
    }
  };

  // Pre-fill previously used name/email if available
  React.useEffect(() => {
    const savedName = localStorage.getItem('learntogether_user_name');
    const savedEmail = localStorage.getItem('learntogether_user_email');
    if (savedName) setName(savedName);
    if (savedEmail) setEmail(savedEmail);
  }, []);

  return (
    <div className="votely-card p-6 sm:p-8 mb-8">
      <div className="max-w-2xl mx-auto text-center mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-950/60 text-violet-300 text-xs font-semibold mb-2.5 border border-violet-500/30 shadow-[0_0_10px_rgba(139,92,246,0.2)]">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Suggest a Topic</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          What do you want to learn?
        </h2>
        <p className="text-sm text-slate-400 mt-1.5">
          Submit a topic you'd like to explore. Others in the community can vote with <strong className="text-cyan-400">+1</strong> to show their interest!
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-4">
        {/* Topic Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Topic Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (validationError) setValidationError(null);
            }}
            placeholder="e.g., Python, Artificial Intelligence, React..."
            disabled={loading}
            className={`w-full px-4 py-3 rounded-xl border ${
              validationError && !title.trim()
                ? 'border-red-500 focus:ring-red-500/30'
                : 'border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25'
            } text-white placeholder-slate-500 text-sm sm:text-base focus:outline-hidden transition-all bg-[#0B1120]/90`}
          />
        </div>

        {/* User Details: Name & Email (Optional for anyone) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Your Name</span>
              <span className="text-slate-500 font-normal text-[11px]">Optional</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="e.g., Alice Chen"
              disabled={loading}
              className="w-full px-4 py-2.5 rounded-xl border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25 text-white placeholder-slate-500 text-sm focus:outline-hidden transition-all bg-[#0B1120]/90"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Your Email</span>
              <span className="text-slate-500 font-normal text-[11px]">Optional</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="e.g., alice@example.com"
              disabled={loading}
              className="w-full px-4 py-2.5 rounded-xl border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25 text-white placeholder-slate-500 text-sm focus:outline-hidden transition-all bg-[#0B1120]/90"
            />
          </div>
        </div>

        {/* Validation Warning */}
        {validationError && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs sm:text-sm animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Submit Topic Button */}
        <button
          type="submit"
          disabled={loading || !title.trim()}
          className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#8B5CF6] via-[#7C3AED] to-[#06B6D4] hover:from-[#7C3AED] hover:to-[#0891B2] disabled:from-slate-800 disabled:to-slate-850 disabled:text-slate-500 disabled:border-white/5 disabled:cursor-not-allowed text-white font-bold text-sm sm:text-base px-6 py-3.5 rounded-xl shadow-[0_0_20px_rgba(139,92,246,0.35)] hover:shadow-[0_0_25px_rgba(6,182,212,0.45)] transition-all active:scale-[0.98] cursor-pointer border border-violet-400/30"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Submitting Topic...</span>
            </>
          ) : (
            <>
              <PlusCircle className="w-5 h-5" />
              <span>Submit Topic</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

