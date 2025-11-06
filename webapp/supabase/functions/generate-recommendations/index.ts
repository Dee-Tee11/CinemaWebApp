// Supabase Edge Function: generate-recommendations
// Path: C:\Users\win11\Documents\GitHub\CinemaWebApp\webapp\supabase\functions\generate-recommendations\index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
};

interface UserRating {
  movie_id: number;
  rating: number;
}

interface MovieSimilarity {
  movie_id: number;
  score: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    // Check Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          error: "Missing Authorization Header",
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
          status: 401,
        }
      );
    }

    // Get Supabase credentials
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({
          error: "Server configuration error",
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
          status: 500,
        }
      );
    }

    // Create Supabase client with service role
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Extract user_id from JWT token
    const token = authHeader.replace("Bearer ", "");
    const payload = JSON.parse(atob(token.split(".")[1]));
    const userId = payload.sub;

    console.log("✅ Generating recommendations for user:", userId);

    // Step 1: Verify user has completed onboarding
    const { data: userData, error: userError } = await supabase
      .from("User")
      .select("onboarding_status")
      .eq("id", userId)
      .single();

    if (userError || !userData) {
      return new Response(
        JSON.stringify({
          error: "User not found",
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
          status: 404,
        }
      );
    }

    if (userData.onboarding_status !== "completed" && userData.onboarding_status !== "skipped") {
      return new Response(
        JSON.stringify({
          error: "User has not completed onboarding",
          onboarding_status: userData.onboarding_status,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
          status: 400,
        }
      );
    }

    // Step 2: Get user's rated movies
    const { data: userMovies, error: userMoviesError } = await supabase
      .from("user_movies")
      .select("movie_id, rating")
      .eq("user_id", userId)
      .not("rating", "is", null);

    if (userMoviesError) {
      throw userMoviesError;
    }

    if (!userMovies || userMovies.length < 5) {
      return new Response(
        JSON.stringify({
          error: "User needs at least 5 rated movies",
          rated_count: userMovies?.length || 0,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
          status: 400,
        }
      );
    }

    console.log(`✅ User has ${userMovies.length} rated movies`);

    // Step 3: Get all movies with their genres
    const { data: allMovies, error: allMoviesError } = await supabase
      .from("movies")
      .select("id, genre, imdb_rating");

    if (allMoviesError) {
      throw allMoviesError;
    }

    // Step 4: Calculate recommendations using hybrid approach
    const userRatings = userMovies as UserRating[];
    const userMovieIds = new Set(userRatings.map((m) => m.movie_id));

    // Calculate user's genre preferences
    const genrePreferences = calculateGenrePreferences(userRatings, allMovies);

    // Calculate user's average rating
    const avgUserRating =
      userRatings.reduce((sum, m) => sum + m.rating, 0) / userRatings.length;

    console.log(`✅ User average rating: ${avgUserRating.toFixed(2)}`);

    // Score each unwatched movie
    const recommendations: MovieSimilarity[] = [];

    for (const movie of allMovies) {
      // Skip movies user has already rated
      if (userMovieIds.has(movie.id)) continue;

      let score = 0;

      // Content-based: Genre similarity (40% weight)
      const genres = movie.genre
        ? movie.genre.split(",").map((g: string) => g.trim())
        : [];
      const genreScore =
        genres.reduce((sum: number, genre: string) => {
          return sum + (genrePreferences[genre] || 0);
        }, 0) / Math.max(genres.length, 1);
      score += genreScore * 0.4;

      // Quality filter: IMDb rating (30% weight)
      if (movie.imdb_rating) {
        const ratingScore = parseFloat(movie.imdb_rating) / 10;
        score += ratingScore * 0.3;
      }

      // Preference alignment: Favor highly-rated genres (30% weight)
      const highlyRatedGenres = userRatings
        .filter((r) => r.rating >= avgUserRating)
        .map((r) => {
          const m = allMovies.find((am) => am.id === r.movie_id);
          return m?.genre || "";
        })
        .join(",");

      const alignmentScore =
        genres.reduce((sum: number, genre: string) => {
          return sum + (highlyRatedGenres.includes(genre) ? 1 : 0);
        }, 0) / Math.max(genres.length, 1);
      score += alignmentScore * 0.3;

      recommendations.push({
        movie_id: movie.id,
        score: score,
      });
    }

    // Sort by score and take top 50
    recommendations.sort((a, b) => b.score - a.score);
    const topRecommendations = recommendations.slice(0, 50);

    console.log(`✅ Generated ${topRecommendations.length} recommendations`);

    // Step 5: Clear existing recommendations for this user
    const { error: deleteError } = await supabase
      .from("user_recommendations")
      .delete()
      .eq("user_id", userId);

    if (deleteError) {
      console.error("⚠️ Error deleting old recommendations:", deleteError);
    }

    // Step 6: Insert new recommendations
    const recommendationsToInsert = topRecommendations.map((rec, index) => ({
      user_id: userId,
      movie_id: rec.movie_id,
      score: rec.score,
      rank: index + 1,
      created_at: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .from("user_recommendations")
      .insert(recommendationsToInsert);

    if (insertError) {
      throw insertError;
    }

    console.log(`✅ Successfully inserted ${topRecommendations.length} recommendations`);

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        recommendations_count: topRecommendations.length,
        message: "Recommendations generated successfully",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 200,
      }
    );
  } catch (error) {
    console.error("❌ Error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 500,
      }
    );
  }
});

// Helper function to calculate genre preferences based on user ratings
function calculateGenrePreferences(
  userRatings: UserRating[],
  allMovies: any[]
): Record<string, number> {
  const genreScores: Record<string, number> = {};
  const genreCounts: Record<string, number> = {};

  for (const rating of userRatings) {
    const movie = allMovies.find((m) => m.id === rating.movie_id);
    if (!movie || !movie.genre) continue;

    const genres = movie.genre.split(",").map((g: string) => g.trim());

    for (const genre of genres) {
      if (!genreScores[genre]) {
        genreScores[genre] = 0;
        genreCounts[genre] = 0;
      }
      // Normalize rating to 0-1 scale
      genreScores[genre] += rating.rating / 10;
      genreCounts[genre]++;
    }
  }

  // Calculate average score for each genre
  const preferences: Record<string, number> = {};
  for (const genre in genreScores) {
    preferences[genre] = genreScores[genre] / genreCounts[genre];
  }

  return preferences;
}