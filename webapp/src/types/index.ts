/**
 * Type Definitions Index
 * 
 * Central export point for all type definitions.
 * Import types from here in your components and hooks.
 * 
 * Example:
 * import { User, Movie, CardTransform } from '@/types';
 */

// Database types
export type {
    User,
    Movie,
    UserMovie,
    Friendship,
    FriendRequest,
    UserMovieWithUser,
    UserMovieWithUserArray,
    FriendshipWithUsers,
    FriendRequestWithSender,
    GetUserMoviesResponse,
    MovieStats,
} from './database';

// Transform types
export type {
    CardTransform,
    CardTransformCache,
    ScrollData,
} from './transform';
