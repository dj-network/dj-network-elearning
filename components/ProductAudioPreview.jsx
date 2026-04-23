"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function formatTime(value) {
  const seconds = Math.max(0, Math.floor(Number(value || 0)));
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export default function ProductAudioPreview({ audioUrl }) {
  const audioRef = useRef(null);
  const progressRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    };
    const onTimeUpdate = () => {
      if (!isScrubbing) {
        setCurrentTime(audio.currentTime || 0);
      }
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("durationchange", onLoaded);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("durationchange", onLoaded);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, [isScrubbing]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      if (audio.paused) {
        await audio.play();
      } else {
        audio.pause();
      }
    } catch {}
  };

  const seekBy = (delta) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(
      0,
      Math.min(audio.duration || 0, (audio.currentTime || 0) + delta),
    );
  };

  const seekToClientX = useCallback(
    (clientX) => {
      const audio = audioRef.current;
      const progressEl = progressRef.current;
      if (!audio || !progressEl || !Number.isFinite(duration) || duration <= 0) return;

      const rect = progressEl.getBoundingClientRect();
      if (!rect.width) return;

      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const nextTime = ratio * duration;
      audio.currentTime = nextTime;
      setCurrentTime(nextTime);
    },
    [duration],
  );

  const handleScrubStart = (clientX) => {
    if (duration <= 0) return;
    setIsScrubbing(true);
    seekToClientX(clientX);
  };

  useEffect(() => {
    if (!isScrubbing) return undefined;

    const onPointerMove = (e) => {
      seekToClientX(e.clientX);
    };

    const onPointerUp = (e) => {
      seekToClientX(e.clientX);
      setIsScrubbing(false);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [isScrubbing, seekToClientX]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-[#162a31] p-6 rounded-xl border border-slate-800">
      <audio ref={audioRef} preload="metadata" src={audioUrl} />

      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
          <span className="material-symbols-outlined">graphic_eq</span>
        </div>
        <div>
          <p className="font-bold text-white">Démo Officielle</p>
          <p className="text-sm text-slate-400">Pré-écoute du produit</p>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div
          ref={progressRef}
          role="slider"
          tabIndex={0}
          aria-label="Position de lecture"
          aria-valuemin={0}
          aria-valuemax={Math.floor(duration || 0)}
          aria-valuenow={Math.floor(currentTime || 0)}
          onPointerDown={(e) => handleScrubStart(e.clientX)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") {
              e.preventDefault();
              seekBy(-5);
            }
            if (e.key === "ArrowRight") {
              e.preventDefault();
              seekBy(5);
            }
          }}
          className="relative h-3 w-full cursor-pointer touch-none rounded-full bg-slate-800"
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-primary"
            style={{ width: `${progress}%` }}
          />
          <div
            className="absolute top-1/2 size-5 -translate-y-1/2 rounded-full border-2 border-[#0f1e23] bg-white shadow"
            style={{ left: `calc(${progress}% - 10px)` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">
            {formatTime(currentTime)}
          </span>
          <span className="text-xs font-medium text-slate-400">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-8">
        <button
          type="button"
          onClick={() => seekBy(-10)}
          className="text-slate-400 hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-3xl">replay_10</span>
        </button>
        <button
          type="button"
          onClick={togglePlay}
          className="size-16 rounded-full bg-primary text-background-dark flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-primary/20"
        >
          <span className="material-symbols-outlined text-4xl leading-none pl-1">
            {isPlaying ? "pause" : "play_arrow"}
          </span>
        </button>
        <button
          type="button"
          onClick={() => seekBy(10)}
          className="text-slate-400 hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-3xl">forward_10</span>
        </button>
      </div>
    </div>
  );
}
