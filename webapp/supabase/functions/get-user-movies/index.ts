import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jwtVerify } from "https://deno.land/x/jose@v5.2.3/index.ts";

const ITEMS_PER_PAGE = 20;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. JWT Validation - SECURE VERSION
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization Header" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Get the signing key for this specific JWT template
    const clerkSigningKey = Deno.env.get("CLERK_JWT_SIGNING_KEY");

    if (!clerkSigningKey) {
      console.error("❌ Missing CLERK_JWT_SIGNING_KEY");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // Verify JWT with HS256 using the JWT template signing key
    let payload;
    try {
      const secret = new TextEncoder().encode(clerkSigningKey);
      const result = await jwtVerify(token, secret, {
        algorithms: ["HS256"],
        issuer: "https://subtle-gannet-13.clerk.accounts.dev",
      });
      payload = result.payload;
      console.log("✅ JWT verified with template signing key");
    } catch (jwtError) {
      console.error("❌ JWT verification failed:", jwtError.message);
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    const userId = payload.sub;
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Invalid token: Missing user ID" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    console.log("✅ User authenticated:", userId);

    // 2. Create Supabase Admin Client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
      Deno.env.get("MY_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 3. Parse query parameters
    const url = new URL(req.url);
    const statusFilter = url.searchParams.get("statusFilter");
    const searchQuery = url.searchParams.get("searchQuery");
    const page = parseInt(url.searchParams.get("page") || "0", 10);

    // 4. Fetch counts and movies in parallel
    const [countsResponse, moviesResponse] = await Promise.all([
      supabase.from("user_movies").select("status").eq("user_id", userId),

      (async () => {
        try {
          let userMoviesQuery = supabase
            .from("user_movies")
            .select("movie_id, created_at")
            .eq("user_id", userId);

          if (statusFilter) {
            userMoviesQuery = userMoviesQuery.eq("status", statusFilter);
          }

          const { data: userMoviesData, error: userMoviesError } =
            await userMoviesQuery
              .order("created_at", { ascending: false })
              .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);

          if (userMoviesError) throw userMoviesError;
          if (!userMoviesData || userMoviesData.length === 0) return [];

          const movieIds = userMoviesData.map((um) => um.movie_id);

          let moviesQuery = supabase
            .from("movies")
            .select(
              "id, series_title, poster_url, runtime, genre, imdb_rating, overview"
            )
            .in("id", movieIds);

          if (searchQuery) {
            moviesQuery = moviesQuery.ilike("series_title", `%${searchQuery}%`);
          }

          const { data: moviesData, error: moviesError } = await moviesQuery;
          if (moviesError) throw moviesError;

          return (moviesData || []).map((movie, index) => ({
            id: movie.id.toString(),
            img: movie.poster_url || "",
            url: "#",
            height: [600, 700, 800, 850, 900, 950, 1000][index % 7],
            title: movie.series_title || "Untitled",
            time: movie.runtime || "",
            category: movie.genre || "Uncategorized",
            year: "N/A",
            rating: movie.imdb_rating || 0,
            synopsis: movie.overview || "Synopsis not available",
          }));
        } catch (error) {
          console.error("Error fetching movies:", error);
          throw error;
        }
      })(),
    ]);

    if (countsResponse.error) throw countsResponse.error;

    const counts = {
      saved:
        countsResponse.data?.filter((m) => m.status === "saved").length || 0,
      watching:
        countsResponse.data?.filter((m) => m.status === "watching").length || 0,
      seen: countsResponse.data?.filter((m) => m.status === "seen").length || 0,
    };

    const responsePayload = {
      movies: moviesResponse,
      counts,
      page,
      hasMore: moviesResponse.length === ITEMS_PER_PAGE,
    };

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in edge function:", error);

    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
