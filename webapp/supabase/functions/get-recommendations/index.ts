import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ITEMS_PER_PAGE = 10;

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("❌ Missing Authorization Header");
      return new Response(
        JSON.stringify({ error: "Missing Authorization Header" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("❌ Server configuration error");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Extrai userId do token JWT (igual ao get-user-movies)
    const token = authHeader.replace("Bearer ", "");
    const payload = JSON.parse(atob(token.split(".")[1]));
    const userId = payload.sub;

    console.log("✅ User ID from token:", userId);

    // Lê page do body (mantém compatível com o hook atual)
    const body = await req.json();
    const page = parseInt(body.page || "0", 10);
    const searchQuery = body.searchQuery || null;

    console.log(
      `📄 Fetching recommendations - Page: ${page}, Search: ${
        searchQuery || "none"
      }`
    );

    // Busca recomendações paginadas
    const { data: recommendationData, error: recommendationError } =
      await supabase
        .from("user_recommendations")
        .select("movie_id")
        .eq("user_id", userId)
        .order("generated_at", { ascending: false })
        .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);

    if (recommendationError) {
      console.error("❌ Error fetching recommendations:", recommendationError);
      throw recommendationError;
    }

    if (!recommendationData || recommendationData.length === 0) {
      console.log("⚠️ No recommendations found");
      return new Response(
        JSON.stringify({
          recommendations: [],
          page,
          hasMore: false,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const movieIds = recommendationData.map((r) => r.movie_id);
    console.log(`🎬 Found ${movieIds.length} recommendation IDs`);

    // Busca detalhes dos filmes
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

    if (moviesError) {
      console.error("❌ Error fetching movies:", moviesError);
      throw moviesError;
    }

    const recommendations = (moviesData || []).map((movie, index) => ({
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

    console.log(
      `✅ Returning ${recommendations.length} recommendations for page ${page}`
    );

    return new Response(
      JSON.stringify({
        recommendations,
        page,
        hasMore: recommendations.length === ITEMS_PER_PAGE,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
