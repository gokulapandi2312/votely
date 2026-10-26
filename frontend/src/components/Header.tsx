import { Sparkles } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-40 bg-[#0A0E17]/85 backdrop-blur-md border-b border-white/10 shadow-lg shadow-black/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-white/5 border border-violet-400/30 shadow-[0_0_20px_rgba(139,92,246,0.35)] flex items-center justify-center p-1 overflow-hidden">
            <img
              src="/votely-logo.png"
              alt="Votely Logo"
              className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]"
            />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                Votely
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-violet-950/60 text-violet-300 border border-violet-500/30 shadow-[0_0_10px_rgba(139,92,246,0.2)]">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                Vote for what you want to learn
              </span>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300 bg-cyan-950/50 px-3.5 py-1.5 rounded-full border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.2)]">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]"></span>
          <span className="hidden sm:inline">Open Community Board</span>
          <span className="sm:hidden">Public</span>
        </div>

      </div>
    </header>
  );
};

export default Header;

