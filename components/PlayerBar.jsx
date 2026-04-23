"use client";

import { usePlayer } from "./PlayerContext";

export default function PlayerBar() {
  const { isVisible, currentTrack } = usePlayer();

  if (!isVisible || !currentTrack) return null;

  return (
    <div className="fixed bottom-6 right-8 left-[calc(18rem+2rem)] h-20 rounded-2xl border border-primary/20 items-center px-6 shadow-2xl z-50 hidden lg:flex bg-[#162a31]/90 backdrop-blur-xl">
      {/* Track info */}
      <div className="flex items-center gap-4 w-1/4">
        <div className="w-12 h-12 rounded-lg bg-slate-800 overflow-hidden shrink-0 shadow-lg">
          <img
            alt={currentTrack.title}
            className="w-full h-full object-cover"
            src={currentTrack.image}
          />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-white truncate">
            {currentTrack.title}
          </p>
          <p className="text-[10px] text-primary uppercase font-bold tracking-tighter">
            Aperçu de la démo
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex-1 flex flex-col items-center justify-center gap-2">
        <div className="flex items-center gap-6">
          <button className="text-slate-400 hover:text-white transition-colors">
            <span className="material-symbols-outlined">skip_previous</span>
          </button>
          <button className="w-10 h-10 rounded-full bg-primary text-[#0f1e23] flex items-center justify-center neon-glow">
            <span className="material-symbols-outlined">pause</span>
          </button>
          <button className="text-slate-400 hover:text-white transition-colors">
            <span className="material-symbols-outlined">skip_next</span>
          </button>
        </div>
        <div className="w-full max-w-md flex items-center gap-3">
          <span className="text-[10px] text-slate-500 font-mono">01:42</span>
          <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden relative">
            <div className="absolute top-0 left-0 h-full bg-primary w-[40%] rounded-full shadow-[0_0_8px_#06bcf9]" />
          </div>
          <span className="text-[10px] text-slate-500 font-mono">03:50</span>
        </div>
      </div>

      {/* Volume */}
      <div className="w-1/4 flex items-center justify-end gap-4">
        <span className="material-symbols-outlined text-slate-400 text-sm">
          volume_up
        </span>
        <div className="w-24 h-1 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-primary w-[70%]" />
        </div>
        <button className="p-2 rounded-lg text-primary hover:bg-slate-800/50 transition-colors">
          <span className="material-symbols-outlined text-sm">queue_music</span>
        </button>
      </div>
    </div>
  );
}
