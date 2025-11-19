import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MINIMUM_RATED_MOVIES = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 405,
      }
    );
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const payload = JSON.parse(atob(token.split(".")[1]));
    const userId = payload.sub;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Invalid token: missing user ID" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);


    // 1. Verifica se tem ≥5 filmes
    const { count: userMoviesCount, error: countError } = await supabase
      .from("user_movies")
      .select("movie_id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (countError) throw countError;


    if (!userMoviesCount || userMoviesCount < MINIMUM_RATED_MOVIES) {
      return new Response(
        JSON.stringify({
          success: false,
          needsMoreRatings: true,
          currentCount: userMoviesCount || 0,
          requiredCount: MINIMUM_RATED_MOVIES,
          message: `You need to rate at least ${MINIMUM_RATED_MOVIES} movies. You have rated ${userMoviesCount || 0}.`,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // 2. Pega gêneros mais frequentes
    const { data: userMovies, error: moviesError } = await supabase
      .from("user_movies")
      .select("movie_id")
      .eq("user_id", userId);

    if (moviesError) throw moviesError;

    const movieIds = userMovies.map((m) => m.movie_id);

    const { data: genresData, error: genresError } = await supabase
      .from("movies")
      .select("id, genre")
      .in("id", movieIds);

    if (genresError) throw genresError;

    const genreCount: Record<string, number> = {};
    genresData.forEach((movie) => {
      const genres = movie.genre?.split(", ") || [];
      genres.forEach((g) => {
        genreCount[g] = (genreCount[g] || 0) + 1;
      });
    });

    const topGenres = Object.entries(genreCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([genre]) => genre);


    if (topGenres.length === 0) {
      return new Response(
        JSON.stringify({ error: "No genres found in user movies" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // 3. Busca filmes NÃO vistos nos top genres
    let candidateQuery = supabase
      .from("movies")
      .select("id")
      .not("id", "in", `(${movieIds.join(",")})`)
      .limit(200);

    // Adiciona filtro de gêneros (usando OR para qualquer dos top genres)
    const genreFilters = topGenres.map((g) => `genre.ilike.%${g}%`).join(",");
    candidateQuery = candidateQuery.or(genreFilters);

    const { data: candidateMovies, error: candidateError } =
      await candidateQuery;

    if (candidateError) throw candidateError;

    if (!candidateMovies || candidateMovies.length === 0) {
      return new Response(
        JSON.stringify({ error: "No candidate movies found" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }


    // 4. Embaralha e pega 50
    const shuffled = candidateMovies.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 50);

    // 5. Apaga recomendações antigas
    const { error: deleteError } = await supabase
      .from("user_recommendations")
      .delete()
      .eq("user_id", userId);

    if (deleteError) throw deleteError;

    // 6. Insere novas
    const recommendationsToInsert = selected.map((movie) => ({
      user_id: userId,
      movie_id: movie.id,
    }));

    const { error: insertError } = await supabase
      .from("user_recommendations")
      .insert(recommendationsToInsert);

    if (insertError) throw insertError;



    return new Response(
      JSON.stringify({
        success: true,
        needsMoreRatings: false,
        recommendationCount: selected.length,
        message: `Successfully generated ${selected.length} recommendations`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("❌ Error in generate-recommendations:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});