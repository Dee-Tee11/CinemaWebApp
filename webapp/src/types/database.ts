/**
 * Database Types
 * 
 * Type definitions for Supabase database tables and responses.
 * These types replace the usage of 'any' throughout the application.
 */

// ============================================================================
// USER TYPES
// ============================================================================

export interface User {
    id: string;
    name: string;
    email?: string;
    taguser?: string;
    created_at?: string;
}

// ============================================================================
// MOVIE TYPES
// ============================================================================

export interface Movie {
    id: number;
    series_title: string;
    poster_url: string;
    runtime: string;
    genre: string;
    imdb_rating: number;
    released_year?: string;
}

export interface UserMovie {
    id?: string;
    user_id: string;
    movie_id: number;
    status: 'saved' | 'watching' | 'seen' | 'Watch Later';
    rating?: number | null;
    review?: string | null;
    created_at: string;
}

// ============================================================================
// FRIENDSHIP TYPES
// ============================================================================

export interface Friendship {
    id?: string;
    user_id_a: string;
    user_id_b: string;
    created_at: string;
    user_a?: User;
    user_b?: User;
}

export interface FriendRequest {
    id: string;
    sender_id: string;
    receiver_id: string;
    status: 'pending' | 'accepted' | 'rejected';
    created_at: string;
    sender?: User;
    receiver?: User;
}

// ============================================================================
// JOINED TYPES (with relations)
// ============================================================================

/**
 * UserMovie with user information joined
 */
export interface UserMovieWithUser extends UserMovie {
    user: User;
}

/**
 * UserMovie with user information joined (array variant from Supabase)
 * Sometimes Supabase returns joined data as arrays
 */
export interface UserMovieWithUserArray extends Omit<UserMovie, 'user'> {
    user: User[];
}

/**
 * Friendship with both users' information
 */
export interface FriendshipWithUsers {
    user_id_a: string;
    user_id_b: string;
    user_a: User;
    user_b: User;
    created_at: string;
}

/**
 * Friend request with sender information
 */
export interface FriendRequestWithSender {
    id: string;
    sender_id: string;
    receiver_id: string;
    status: 'pending' | 'accepted' | 'rejected';
    created_at: string;
    sender: User;
}

// ============================================================================
// QUERY RESPONSE TYPES
// ============================================================================

/**
 * Response from get-user-movies function
 */
export interface GetUserMoviesResponse {
    movies: Array<{
        id: string;
        img: string;
        url: string;
        height: number;
        title?: string;
        time?: string;
        category?: string;
        year?: string;
        rating?: number;
        synopsis?: string;
    }>;
    counts: {
        saved: number;
        watching: number;
        seen: number;
    };
}

/**
 * Statistics for user's movie collection
 */
export interface MovieStats {
    saved: number;
    watching: number;
    seen: number;
}
