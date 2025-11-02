import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const ITEMS_PER_PAGE = 20;
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
};
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }
  try {
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
    // Usa Service Role Key para bypass RLS (temporário para teste)
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
    // TEMPORARIAMENTE usa service role para testar
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    // Extrai o user_id do token manualmente (temporário)
    const token = authHeader.replace("Bearer ", "");
    const payload = JSON.parse(atob(token.split(".")[1]));
    const userId = payload.sub;
    console.log("✅ User ID from token:", userId);
    const url = new URL(req.url);
    const statusFilter = url.searchParams.get("statusFilter");
    const searchQuery = url.searchParams.get("searchQuery");
    const page = parseInt(url.searchParams.get("page") || "0", 10);
    // Fetch data
    const [countsResponse, moviesResponse] = await Promise.all([
      supabase.from("user_movies").select("status").eq("user_id", userId),
      (async () => {
        let userMoviesQuery = supabase
          .from("user_movies")
          .select("movie_id, created_at")
          .eq("user_id", userId);
        if (statusFilter) {
          userMoviesQuery = userMoviesQuery.eq("status", statusFilter);
        }
        const { data: userMoviesData, error: userMoviesError } =
          await userMoviesQuery
            .order("created_at", {
              ascending: false,
            })
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
    return new Response(
      JSON.stringify({
        movies: moviesResponse,
        counts,
        page,
        hasMore: moviesResponse.length === ITEMS_PER_PAGE,
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
