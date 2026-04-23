"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const YT_API_URL = "https://www.youtube.com/iframe_api";

// The Youtube ID must be extracted from the URL (e.g., v=XXXXX) or passed directly
export default function VideoPlayer({
  youtubeId: initialYoutubeId,
  videoUrl,
  title = "Vidéo du cours",
  chapters = [],
}) {
  const [hasStarted, setHasStarted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [qualities, setQualities] = useState([]);
  const [selectedQuality, setSelectedQuality] = useState("auto");
  const [isQualityOpen, setIsQualityOpen] = useState(false);
  const [isChaptersOpen, setIsChaptersOpen] = useState(false);
  const [isPseudoFs, setIsPseudoFs] = useState(false);
  const containerRef = useRef(null);
  const playerHostRef = useRef(null);
  const playerRef = useRef(null);
  const timePollRef = useRef(null);
  const scrubValueRef = useRef(null);
  const isScrubbingRef = useRef(false);

  const isIOS = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    // iPadOS 13+ can report as Mac; we keep this conservative (iPhone/iPod/iPad).
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }, []);

  const getFullscreenElement = () => {
    // Fullscreen the container to keep our custom UI and avoid YouTube branding UI.
    return containerRef.current;
  };

  const fitPlayerToHost = useCallback(() => {
    const host = playerHostRef.current;
    const player = playerRef.current;
    if (!host || !player) return;

    try {
      const iframe = player.getIframe?.();
      if (iframe) {
        // YouTube sometimes sets a fixed width/height. Force it to fill the host.
        iframe.style.position = "absolute";
        iframe.style.inset = "0";
        iframe.style.width = "100%";
        iframe.style.height = "100%";
        iframe.style.maxWidth = "none";
        iframe.style.maxHeight = "none";
        iframe.style.display = "block";
      }
    } catch {}

    try {
      const r = host.getBoundingClientRect();
      if (player.setSize && r.width > 0 && r.height > 0) {
        player.setSize(Math.round(r.width), Math.round(r.height));
      }
    } catch {}
  }, []);

  function extractYoutubeId(url) {
    if (!url) return null;
    const match = url.match(
      /(?:youtu\.be\/|(?:www\.)?(?:m\.)?youtube\.com\/(?:watch\?v=|embed\/|live\/|shorts\/|v\/))([a-zA-Z0-9_-]{11})/,
    );
    return match ? match[1] : null;
  }

  const youtubeId = useMemo(() => {
    return initialYoutubeId || extractYoutubeId(videoUrl);
  }, [initialYoutubeId, videoUrl]);

  useEffect(() => {
    isScrubbingRef.current = isScrubbing;
  }, [isScrubbing]);

  useEffect(() => {
    function onFsChange() {
      const el = getFullscreenElement();
      setIsFullscreen(!!el && (document.fullscreenElement === el || document.webkitFullscreenElement === el));
    }
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsPseudoFs(false);
      }
    };
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    if (isPseudoFs) {
      document.body.style.overflow = "hidden";
      document.body.classList.add("player-pseudo-fs");
      // Best-effort: nudge Safari to hide URL bar a bit.
      try {
        window.scrollTo(0, 1);
      } catch {}
    } else {
      document.body.style.overflow = "";
      document.body.classList.remove("player-pseudo-fs");
    }
    return () => {
      document.body.style.overflow = "";
      document.body.classList.remove("player-pseudo-fs");
    };
  }, [isPseudoFs]);

  useEffect(() => {
    // On mobile Safari especially, the iframe can keep an old size after toggling
    // pseudo-fullscreen or rotating the device. Keep it fitted to the host.
    let timeouts = [];
    const kick = () => {
      fitPlayerToHost();
      // Run a few times to catch late layout/visualViewport changes.
      timeouts.push(setTimeout(fitPlayerToHost, 0));
      timeouts.push(setTimeout(fitPlayerToHost, 60));
      timeouts.push(setTimeout(fitPlayerToHost, 180));
      timeouts.push(setTimeout(fitPlayerToHost, 450));
    };

    const onResize = () => fitPlayerToHost();
    kick();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    window.visualViewport?.addEventListener?.("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      window.visualViewport?.removeEventListener?.("resize", onResize);
      for (const t of timeouts) clearTimeout(t);
      timeouts = [];
    };
  }, [isPseudoFs, isFullscreen, youtubeId, fitPlayerToHost]);

  useEffect(() => {
    let cancelled = false;
    if (!youtubeId) return () => {};

    const ensureApi = () => {
      if (window.YT?.Player) return Promise.resolve();
      if (window.__ytIframeApiPromise) return window.__ytIframeApiPromise;

      window.__ytIframeApiPromise = new Promise((resolve) => {
        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          if (typeof prev === "function") prev();
          resolve();
        };
        const script = document.createElement("script");
        script.src = YT_API_URL;
        script.async = true;
        document.head.appendChild(script);
      });
      return window.__ytIframeApiPromise;
    };

    const startPolling = () => {
      if (timePollRef.current) return;
      timePollRef.current = window.setInterval(() => {
        const player = playerRef.current;
        if (!player) return;
        if (isScrubbingRef.current && scrubValueRef.current != null) {
          setCurrentTime(scrubValueRef.current);
          return;
        }
        try {
          const t = player.getCurrentTime?.();
          const d = player.getDuration?.();
          if (typeof d === "number" && Number.isFinite(d) && d > 0) {
            setDuration(d);
          }
          if (typeof t === "number" && Number.isFinite(t) && t >= 0) {
            setCurrentTime(t);
          }
        } catch {}
      }, 250);
    };

    const stopPolling = () => {
      if (!timePollRef.current) return;
      clearInterval(timePollRef.current);
      timePollRef.current = null;
    };

    (async () => {
      await ensureApi();
      if (cancelled) return;
      if (!playerHostRef.current) return;

      // Clean host between mounts.
      playerHostRef.current.innerHTML = "";

      const player = new window.YT.Player(playerHostRef.current, {
        videoId: youtubeId,
        playerVars: {
          controls: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          iv_load_policy: 3,
          disablekb: 1,
          // Keep YouTube fullscreen disabled; we handle fullscreen ourselves.
          fs: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            if (cancelled) return;
            playerRef.current = player;
            setIsReady(true);
            try {
              const d = player.getDuration?.();
              if (typeof d === "number" && Number.isFinite(d) && d > 0) {
                setDuration(d);
              }
            } catch {}
            // Populate available quality levels (best-effort).
            try {
              const qs = player.getAvailableQualityLevels?.() || [];
              if (Array.isArray(qs)) {
                setQualities(qs.filter((x) => x && x !== "unknown"));
              }
              const q = player.getPlaybackQuality?.();
              if (q && q !== "unknown") setSelectedQuality(q);
            } catch {}
            startPolling();
          },
          onStateChange: (e) => {
            if (cancelled) return;
            // 1 = playing, 2 = paused, 0 = ended
            const playing = e?.data === 1;
            setIsPlaying(playing);
            if (e?.data === 0) {
              setIsPlaying(false);
            }

            if (e?.data === 1) {
              // Refresh qualities once playback starts (YouTube may not expose them before).
              try {
                const qs = player.getAvailableQualityLevels?.() || [];
                if (Array.isArray(qs)) {
                  setQualities(qs.filter((x) => x && x !== "unknown"));
                }
                const q = player.getPlaybackQuality?.();
                if (q && q !== "unknown") setSelectedQuality(q);
              } catch {}
            }
          },
        },
      });
    })();

    return () => {
      cancelled = true;
      stopPolling();
      try {
        playerRef.current?.destroy?.();
      } catch {}
      playerRef.current = null;
      setIsReady(false);
      setIsPlaying(false);
      setDuration(0);
      setCurrentTime(0);
      setIsScrubbing(false);
      scrubValueRef.current = null;
    };
  }, [youtubeId]);

  const togglePlay = () => {
    const player = playerRef.current;
    if (!player || !isReady) return;
    try {
      if (isPlaying) player.pauseVideo();
      else player.playVideo();
      setHasStarted(true);
    } catch {}
  };

  const seekTo = (timeSeconds, autoPlay = false) => {
    const player = playerRef.current;
    if (!player || !isReady) return;
    const t = Math.max(0, Math.min(duration || 0, timeSeconds || 0));
    try {
      player.seekTo(t, true);
      setCurrentTime(t);
      if (autoPlay) {
        player.playVideo();
        setHasStarted(true);
      }
    } catch {}
  };

  const toggleFullscreen = async () => {
    const el = getFullscreenElement();
    if (!el) return;

    // iOS Safari: fullscreen APIs on non-video elements are unreliable; keep pseudo-fullscreen.
    if (isIOS) {
      setIsPseudoFs((v) => !v);
      return;
    }

    try {
      const isFs = document.fullscreenElement === el || document.webkitFullscreenElement === el;
      
      if (isFs) {
        if (typeof screen !== "undefined" && screen.orientation?.unlock) {
          try {
            screen.orientation.unlock();
          } catch {}
        }
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        }
        setIsPseudoFs(false);
      } else {
        let success = false;
        // Prefer vendor-prefixed API on Safari.
        if (el.webkitRequestFullscreen) {
          await el.webkitRequestFullscreen();
          success = true;
        } else if (el.requestFullscreen) {
          await el.requestFullscreen();
          success = true;
        }

        if (success) {
          // iOS Safari doesn't support orientation lock; Android/desktop may.
          if (typeof screen !== "undefined" && screen.orientation?.lock) {
            try {
              screen.orientation.lock("landscape").catch(() => {});
            } catch {}
          }
        } else {
          // Fallback when Fullscreen API is unavailable/refused.
          setIsPseudoFs((v) => !v);
        }
      }
    } catch (e) {
      setIsPseudoFs((v) => !v);
    }
  };

  const formatTime = (s) => {
    const n = Math.max(0, Math.floor(s || 0));
    const hh = Math.floor(n / 3600);
    const mm = Math.floor((n % 3600) / 60);
    const ss = n % 60;
    if (hh > 0) return `${hh}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
    return `${mm}:${String(ss).padStart(2, "0")}`;
  };

  const percent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const normalizedChapters = useMemo(() => {
    if (!Array.isArray(chapters)) return [];
    const list = chapters
      .map((c) => ({
        title: String(c?.title || c?.label || "").trim(),
        start: Number(c?.start ?? c?.time ?? 0),
      }))
      .filter((c) => c.title && Number.isFinite(c.start) && c.start >= 0)
      .sort((a, b) => a.start - b.start);

    // De-dupe by start time (keep first title).
    const out = [];
    const seen = new Set();
    for (const c of list) {
      const key = Math.round(c.start * 1000);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(c);
    }
    return out;
  }, [chapters]);

  const activeChapter = useMemo(() => {
    if (normalizedChapters.length === 0) return null;
    let current = normalizedChapters[0];
    for (const c of normalizedChapters) {
      if (c.start <= currentTime + 0.25) current = c;
      else break;
    }
    return current;
  }, [normalizedChapters, currentTime]);

  const qualityLabel = (q) => {
    if (!q || q === "auto" || q === "unknown") return "Auto";
    const map = {
      highres: "4K+",
      hd2160: "2160p",
      hd1440: "1440p",
      hd1080: "1080p",
      hd720: "720p",
      large: "480p",
      medium: "360p",
      small: "240p",
      tiny: "144p",
    };
    return map[q] || q;
  };

  const getTimeFromEvent = (e) => {
    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const clientX =
      "touches" in e && e.touches?.[0] ? e.touches[0].clientX : e.clientX;
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const p = rect.width > 0 ? x / rect.width : 0;
    return p * (duration || 0);
  };

  const thumbStyle =
    percent <= 0
      ? { left: "0%", transform: "translate(0, -50%)" }
      : percent >= 100
        ? { left: "100%", transform: "translate(-100%, -50%)" }
        : { left: `${percent}%`, transform: "translate(-50%, -50%)" };

  if (!youtubeId) {
    return (
      <div className="w-full h-full bg-slate-900 rounded-xl flex flex-col items-center justify-center border border-slate-800 p-8">
        <span className="material-symbols-outlined text-4xl text-slate-700 mb-2">
          videocam_off
        </span>
        <p className="text-slate-500 font-medium italic text-center">
          Vidéo indisponible
        </p>
        {videoUrl && (
          <p className="text-slate-600 text-[10px] mt-2 font-mono truncate max-w-full">
            {videoUrl}
          </p>
        )}
      </div>
    );
  }

	   const playerMarkup = (
	    <div
	      ref={containerRef}
	      className={`bg-black overflow-hidden group transition-all duration-300 ${
	        isPseudoFs 
	          ? "fixed inset-0 z-[110] rounded-none border-none w-[100vw] h-[100svh] !transition-none !p-0 !m-0" 
	          : "relative w-full aspect-video rounded-xl border border-slate-800 shadow-2xl"
	      }`}
	    >
      <div className="absolute inset-0 w-full h-full">
        <div ref={playerHostRef} className="w-full h-full" />
      </div>

      {/* 
        Overlay for UI masking + custom controls.
        Not content protection.
      */}
       <div
        className={`absolute inset-0 z-10 flex items-center justify-center transition-all duration-300 ${
          !isPlaying ? "bg-black/40 backdrop-blur-[2px] pointer-events-auto" : "bg-transparent pointer-events-none"
        }`}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Big play when paused */}
        {!isPlaying && (
          <>
            <button
              type="button"
              onClick={togglePlay}
              disabled={!isReady}
              className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center text-[#0f1e23] shadow-[0_0_50px_rgba(6,188,249,0.4)] hover:scale-110 active:scale-95 transition-all disabled:opacity-50 pointer-events-auto"
              aria-label="Lecture"
            >
              <span className="material-symbols-outlined text-5xl ml-1">
                play_arrow
              </span>
            </button>

            {!hasStarted && (
              <div className="absolute bottom-28 sm:bottom-32 left-0 right-0 text-center pointer-events-none px-4">
                <div className="inline-block px-4 py-1.5 sm:px-6 sm:py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold tracking-wide text-[10px] sm:text-sm animate-pulse">
                  DÉMARRER LA MASTERCLASS
                </div>
              </div>
            )}
          </>
        )}

	        <div
	          className={`absolute bottom-0 left-0 right-0 p-1 sm:p-4 bg-gradient-to-t from-black/95 via-black/40 to-transparent z-20 pointer-events-none ${
	            isPseudoFs ? "pb-[calc(env(safe-area-inset-bottom)+10px)]" : ""
	          }`}
	        >
	          <div className="flex items-center gap-1 sm:gap-2 px-0.5 sm:px-0 pointer-events-auto">
             <button
              type="button"
              onClick={togglePlay}
              disabled={!isReady}
              className="bg-black/60 hover:bg-black/80 border border-white/10 text-white rounded-xl px-3 py-3 sm:px-3 sm:py-2 flex items-center gap-2 text-xs font-bold backdrop-blur disabled:opacity-50 pointer-events-auto"
            >
              <span className="material-symbols-outlined text-base">
                {isPlaying ? "pause" : "play_arrow"}
              </span>
              <span className="hidden xl:inline">
                {isPlaying ? "Pause" : "Lecture"}
              </span>
            </button>

             <div className="hidden sm:flex text-[10px] font-mono text-slate-200/90 min-w-[70px] justify-center pointer-events-none shrink-0">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>

             <div
              className="flex-1 relative h-3 sm:h-2 rounded-full bg-white/15 border border-white/10 overflow-hidden cursor-pointer pointer-events-auto"
              role="slider"
              aria-label="Progression"
              aria-valuemin={0}
              aria-valuemax={Math.max(0, Math.floor(duration))}
              aria-valuenow={Math.max(0, Math.floor(currentTime))}
              tabIndex={0}
              onMouseDown={(e) => {
                setIsScrubbing(true);
                const t = getTimeFromEvent(e);
                scrubValueRef.current = t;
                setCurrentTime(t);
              }}
              onMouseMove={(e) => {
                if (!isScrubbing) return;
                const t = getTimeFromEvent(e);
                scrubValueRef.current = t;
                setCurrentTime(t);
              }}
              onMouseUp={(e) => {
                if (!isScrubbing) return;
                setIsScrubbing(false);
                const t = getTimeFromEvent(e);
                scrubValueRef.current = null;
                seekTo(t);
              }}
              onMouseLeave={() => {
                if (!isScrubbing) return;
                setIsScrubbing(false);
                const t = scrubValueRef.current ?? currentTime;
                scrubValueRef.current = null;
                seekTo(t);
              }}
              onTouchStart={(e) => {
                setIsScrubbing(true);
                const t = getTimeFromEvent(e);
                scrubValueRef.current = t;
                setCurrentTime(t);
              }}
              onTouchMove={(e) => {
                if (!isScrubbing) return;
                const t = getTimeFromEvent(e);
                scrubValueRef.current = t;
                setCurrentTime(t);
              }}
              onTouchEnd={() => {
                if (!isScrubbing) return;
                setIsScrubbing(false);
                const t = scrubValueRef.current ?? currentTime;
                scrubValueRef.current = null;
                seekTo(t);
              }}
              onKeyDown={(e) => {
                if (!isReady) return;
                if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  seekTo(currentTime - 5);
                }
                if (e.key === "ArrowRight") {
                  e.preventDefault();
                  seekTo(currentTime + 5);
                }
              }}
            >
              <div
                className="h-full bg-primary/90"
                style={{ width: `${percent}%` }}
              />
              {duration > 0 &&
                normalizedChapters
                  .filter((c) => c.start > 0 && c.start < duration)
                  .map((c) => (
                    <div
                      key={`ch-${c.start}`}
                      title={c.title}
                      className="absolute top-0 bottom-0 w-[2px] bg-white/30"
                      style={{ left: `${(c.start / duration) * 100}%` }}
                    />
                  ))}
              <div
                className="absolute top-1/2 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white shadow-lg border-2 border-primary"
                style={thumbStyle}
              />
            </div>

            {normalizedChapters.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsChaptersOpen((v) => !v);
                    setIsQualityOpen(false);
                  }}
                   className="bg-black/60 hover:bg-black/80 border border-white/10 text-white rounded-xl px-3 py-3 sm:px-3 sm:py-2 flex items-center gap-1 sm:gap-2 text-xs font-bold backdrop-blur pointer-events-auto"
                >
                  <span className="material-symbols-outlined text-base">
                    list
                  </span>
                  {activeChapter?.title ? (
                    <span className="hidden 2xl:inline max-w-[140px] truncate">
                      {activeChapter.title}
                    </span>
                  ) : (
                    <span className="hidden xl:inline font-medium">Chapitres</span>
                  )}
                  <span className="material-symbols-outlined text-base opacity-80">
                    expand_more
                  </span>
                </button>

                {isChaptersOpen && (
                  <div className="absolute bottom-14 left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-0 w-[calc(100vw-32px)] sm:w-80 max-h-[60vh] sm:max-h-72 overflow-auto bg-[#0f1e23]/95 border border-slate-700/60 rounded-2xl shadow-2xl backdrop-blur-xl p-2 z-[60]">
                    <div className="sticky top-0 bg-[#0f1e23]/95 backdrop-blur-xl px-3 py-2 border-b border-slate-700/40 mb-1 flex items-center justify-between sm:hidden">
                      <span className="text-xs font-bold text-primary tracking-wider">CHAPITRES</span>
                      <button onClick={() => setIsChaptersOpen(false)} className="material-symbols-outlined text-lg text-slate-400">close</button>
                    </div>
                    {normalizedChapters.map((c) => (
                      <button
                        key={`chap-${c.start}`}
                        type="button"
                        onClick={() => {
                          seekTo(c.start, true);
                          setIsChaptersOpen(false);
                        }}
                        className={`w-full text-left px-3 py-3 sm:py-2 rounded-xl hover:bg-slate-800/60 transition-colors flex items-center gap-3 ${activeChapter?.start === c.start ? "bg-primary/10 border border-primary/20" : ""}`}
                      >
                        <span className={`text-[11px] font-mono shrink-0 ${activeChapter?.start === c.start ? "text-primary" : "text-slate-400"}`}>
                          {formatTime(c.start)}
                        </span>
                        <span className={`text-sm truncate ${activeChapter?.start === c.start ? "text-primary font-bold" : "text-slate-100"}`}>
                          {c.title}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsQualityOpen((v) => !v);
                  setIsChaptersOpen(false);
                }}
                className="bg-black/60 hover:bg-black/80 border border-white/10 text-white rounded-xl px-3 py-3 sm:px-3 sm:py-2 flex items-center gap-1 sm:gap-2 text-xs font-bold backdrop-blur pointer-events-auto"
              >
                <span className="material-symbols-outlined text-base">
                  hd
                </span>
                <span className="hidden xl:inline">
                  {qualityLabel(selectedQuality)}
                </span>
                <span className="material-symbols-outlined text-base opacity-80">
                  expand_more
                </span>
              </button>

              {isQualityOpen && (
                <div className="absolute bottom-14 right-0 w-48 sm:w-44 bg-[#0f1e23]/95 border border-slate-700/60 rounded-2xl shadow-2xl backdrop-blur-xl p-2 z-[60]">
                  {Array.from(
                    new Set([
                      "auto",
                      ...qualities.filter((x) => x && x !== "unknown"),
                    ]),
                  ).map((q) => (
                    <button
                      key={`q-${q}`}
                      type="button"
                      onClick={() => {
                        const player = playerRef.current;
                        try {
                          if (q === "auto") {
                            // YouTube doesn't expose a true "auto" setter; best-effort: pick the current.
                            setSelectedQuality("auto");
                          } else {
                            player?.setPlaybackQuality?.(q);
                            setSelectedQuality(q);
                          }
                        } catch {}
                        setIsQualityOpen(false);
                      }}
                      className={`w-full text-left px-3 py-3 sm:py-2 rounded-xl hover:bg-slate-800/60 transition-colors text-sm ${
                        selectedQuality === q ? "text-primary font-bold" : "text-slate-100"
                      }`}
                    >
                      {qualityLabel(q)}
                    </button>
                  ))}
                </div>
              )}
            </div>

             <button
              type="button"
              onClick={toggleFullscreen}
              className="bg-black/60 hover:bg-black/80 border border-white/10 text-white rounded-xl px-3 py-3 sm:px-3 sm:py-2 flex items-center gap-1.5 text-xs font-bold backdrop-blur pointer-events-auto mr-0.5 sm:mr-0 shrink-0"
            >
              <span className="material-symbols-outlined text-base">
                {isFullscreen || isPseudoFs ? "fullscreen_exit" : "fullscreen"}
              </span>
              <span className="hidden lg:inline">Plein écran</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {isPseudoFs && (
        // Placeholder: keep layout stable when player is fixed (pseudo-fullscreen).
        <div className="relative w-full aspect-video rounded-xl bg-slate-950 border border-slate-800 shadow-xl overflow-hidden">
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#0f1e23]">
            <span className="material-symbols-outlined text-slate-700 animate-pulse">
              videocam
            </span>
          </div>
        </div>
      )}
      {playerMarkup}
    </>
  );
}
