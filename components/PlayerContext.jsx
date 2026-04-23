"use client";

import { createContext, useContext, useState } from "react";

const PlayerContext = createContext();

export function PlayerProvider({ children }) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);

  const playTrack = (track) => {
    setCurrentTrack(track);
    setIsVisible(true);
  };

  const hidePlayer = () => {
    setIsVisible(false);
  };

  return (
    <PlayerContext.Provider
      value={{ isVisible, currentTrack, playTrack, hidePlayer }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  return useContext(PlayerContext);
}
