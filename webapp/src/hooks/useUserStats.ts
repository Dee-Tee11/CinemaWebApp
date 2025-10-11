import { useState } from 'react';

/**
 * @returns An object containing the user stats.
 * Hardcoded -> preciso mudar
 */
export const useUserStats = () => {
  const [userStats] = useState({
    likedMovies: 42,
    favoriteMovies: 15,
    watchedMovies: 128,
  });

  return userStats;
};