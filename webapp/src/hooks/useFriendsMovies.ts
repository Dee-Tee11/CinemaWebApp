import { useState, useEffect } from 'react';
import { useSupabase } from './useSupabase';
import { useAuth } from '@clerk/clerk-react';
import type { Item } from './useMovies';

const ITEMS_PER_PAGE = 20;

interface FriendActivity {
  friend_id: string;
  friend_name: string;
  movie_id: string;
  status: string;
  rating: number | null;
  review: string | null;
  created_at: string;
}

interface UseFriendsMoviesReturn {
  items: Item[];
  friendsActivity: FriendActivity[];
  isLoading: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  hasFriends: boolean;
  friendsCount: number;
  refresh: () => Promise<void>;
}

export const useFriendsMovies = (movieId?: string): UseFriendsMoviesReturn => {
  const supabase = useSupabase();
  const { userId } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [friendsActivity, setFriendsActivity] = useState<FriendActivity[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFriends, setHasFriends] = useState(false);
  const [friendsCount, setFriendsCount] = useState(0);

  // Get user's friends IDs
  const getFriendsIds = async (): Promise<string[]> => {
    if (!userId) return [];

    const { data, error } = await supabase
      .from('friendships')
      .select('user_id_a, user_id_b')
      .or(`user_id_a.eq.${userId},user_id_b.eq.${userId}`);

    if (error) {
      console.error('Error fetching friends:', error);
      return [];
    }

    const friendIds = data.map((friendship: any) =>
      friendship.user_id_a === userId ? friendship.user_id_b : friendship.user_id_a
    );

    console.log('📱 Friends found:', friendIds);
    setFriendsCount(friendIds.length);
    setHasFriends(friendIds.length > 0);

    return friendIds;
  };

  // Fetch friends' activities for a specific movie
  const fetchFriendsActivity = async (movieId: string) => {
    if (!userId || !movieId) {
      setFriendsActivity([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const friendIds = await getFriendsIds();

      if (friendIds.length === 0) {
        console.log('⚠️ No friends found for user:', userId);
        setFriendsActivity([]);
        setIsLoading(false);
        return;
      }

      console.log('🔍 Searching activities for movieId:', movieId, 'with friendIds:', friendIds);

      const { data, error } = await supabase
        .from('user_movies')
        .select(`
          user_id,
          movie_id,
          status,
          rating,
          review,
          created_at,
          user:User!user_movies_user_id_fkey (id, name)
        `)
        .eq('movie_id', movieId)
        .in('user_id', friendIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching friends activities:', error.message);
        setFriendsActivity([]);
      } else {
        console.log('📊 Activities fetched:', data);
        const activities: FriendActivity[] = data?.map((activity: any) => ({
          friend_id: activity.user_id,
          friend_name: activity.user?.name || 'Anonymous Friend',
          movie_id: activity.movie_id.toString(),
          status: activity.status || 'Unknown',
          rating: activity.rating || null,
          review: activity.review || null,
          created_at: activity.created_at || new Date().toISOString(),
        })) || [];
        setFriendsActivity(activities);
      }
    } catch (err) {
      console.error('Unexpected error in fetchFriendsActivity:', err);
      setFriendsActivity([]);
    }

    setIsLoading(false);
  };

  // Load friends' movies with pagination (mantido para compatibilidade)
  const loadFriendsMovies = async (page: number): Promise<Item[]> => {
    if (!userId) return [];

    const friendIds = await getFriendsIds();

    if (friendIds.length === 0) {
      return [];
    }

    const { data: friendsActivities, error: activitiesError } = await supabase
      .from('user_movies')
      .select(`
        user_id,
        movie_id,
        status,
        rating,
        created_at,
        user:User!user_movies_user_id_fkey (id, name)
      `)
      .in('user_id', friendIds)
      .order('created_at', { ascending: false })
      .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);

    if (activitiesError) {
      console.error('Error fetching friends activities:', activitiesError);
      return [];
    }

    if (!friendsActivities || friendsActivities.length === 0) {
      return [];
    }

    const movieIds = [...new Set(friendsActivities.map((a: any) => a.movie_id))];

    const { data: moviesData, error: moviesError } = await supabase
      .from('movies')
      .select('id, series_title, poster_url, runtime, genre, imdb_rating, overview')
      .in('id', movieIds);

    if (moviesError) {
      console.error('Error fetching movies:', moviesError);
      return [];
    }

    const formattedMovies = moviesData.map((movie: any, index: number) => ({
      id: movie.id.toString(),
      img: movie.poster_url || '',
      url: '#',
      height: [600, 700, 800, 850, 900, 950, 1000][index % 7],
      title: movie.series_title || 'Untitled',
      time: movie.runtime || '',
      category: movie.genre || 'Uncategorized',
      year: movie.runtime ? new Date(movie.runtime).getFullYear().toString() : '2024',
      rating: movie.imdb_rating || 0,
      synopsis: `\n\n${movie.overview || 'Synopsis not available'}`,
    }));

    return formattedMovies;
  };

  // Initialize
  const initializeFriendsMovies = async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    if (movieId) {
      await fetchFriendsActivity(movieId);
    } else {
      const movies = await loadFriendsMovies(0);
      setItems(movies);
      setHasMore(movies.length === ITEMS_PER_PAGE);
    }

    setIsLoading(false);
  };

  const loadMore = async () => {
    if (movieId || !hasMore || isLoading || !userId) return;

    setIsLoading(true);
    const nextPage = currentPage + 1;

    const newMovies = await loadFriendsMovies(nextPage);

    if (newMovies.length > 0) {
      setItems((prev) => {
        const existingIds = new Set(prev.map((item) => item.id));
        const filteredNewMovies = newMovies.filter((item) => !existingIds.has(item.id));
        return [...prev, ...filteredNewMovies];
      });
      setCurrentPage(nextPage);
      setHasMore(newMovies.length === ITEMS_PER_PAGE);
    } else {
      setHasMore(false);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    initializeFriendsMovies();
  }, [userId, movieId]);

  return {
    items,
    friendsActivity,
    isLoading,
    hasMore,
    loadMore,
    hasFriends,
    friendsCount,
    refresh: initializeFriendsMovies,
  };
};