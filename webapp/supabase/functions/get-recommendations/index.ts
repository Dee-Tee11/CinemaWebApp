// Supabase Edge Function: get-recommendations
// Path: C:\Users\win11\Documents\GitHub\CinemaWebApp\webapp\supabase\functions\get-recommendations\index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ITEMS_PER_PAGE = 20;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
};

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

    console.log("✅ User ID from token:", userId);

    // Get pagination parameter
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "0", 10);

    console.log(`📄 Fetching page ${page} for user ${userId}`);

    // Step 1: Get user recommendations with pagination
    const { data: recommendationData, error: recommendationError } =
      await supabase
        .from("user_recommendations")
        .select("movie_id")
        .eq("user_id", userId)
        .order("rank", { ascending: true })
        .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);

    if (recommendationError) {
      throw recommendationError;
    }

    if (!recommendationData || recommendationData.length === 0) {
      console.log("⚠️ No recommendations found for user");
      return new Response(
        JSON.stringify({
          movies: [],
          page,
          hasMore: false,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
          status: 200,
        }
      );
    }

    console.log(`✅ Found ${recommendationData.length} recommendations`);

    // Step 2: Get movie details
    const movieIds = recommendationData.map((r) => r.movie_id);
    const { data: moviesData, error: moviesError } = await supabase
      .from("movies")
      .select(
        "id, series_title, poster_url, runtime, genre, imdb_rating, overview, released_year"
      )
      .in("id", movieIds);

    if (moviesError) {
      throw moviesError;
    }

    if (!moviesData) {
      return new Response(
        JSON.stringify({
          movies: [],
          page,
          hasMore: false,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
          status: 200,
        }
      );
    }

    // Step 3: Maintain order from recommendations and format response
    const movieMap = new Map(moviesData.map((m) => [m.id, m]));
    const orderedMovies = movieIds
      .map((id) => movieMap.get(id))
      .filter((m) => m !== undefined);

    const formattedMovies = orderedMovies.map((movie, index) => ({
      id: movie.id.toString(),
      img: movie.poster_url || "",
      url: "#",
      height: [600, 700, 800, 850, 900, 950, 1000][index % 7],
      title: movie.series_title || "Untitled",
      time: movie.runtime || "",
      category: movie.genre || "Uncategorized",
      year: movie.released_year?.toString() || "N/A",
      rating: movie.imdb_rating || 0,
      synopsis: movie.overview || "Synopsis not available",
    }));

    console.log(`✅ Returning ${formattedMovies.length} movies`);

    return new Response(
      JSON.stringify({
        movies: formattedMovies,
        page,
        hasMore: formattedMovies.length === ITEMS_PER_PAGE,
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