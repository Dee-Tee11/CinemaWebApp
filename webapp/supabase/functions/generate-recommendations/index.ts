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

    // 2. Chamar FastAPI para gerar recomendações KNN
    const FASTAPI_URL = Deno.env.get("FASTAPI_URL") || "https://movienight-ai.onrender.com";

    try {
      console.log(`🚀 Calling FastAPI: ${FASTAPI_URL}/generate-recommendations/${userId}`);

      const response = await fetch(
        `${FASTAPI_URL}/generate-recommendations/${userId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ FastAPI error (${response.status}):`, errorText);
        throw new Error(`FastAPI returned ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log("✅ FastAPI response:", result);

      return new Response(
        JSON.stringify({
          success: true,
          needsMoreRatings: false,
          message: result.message || "Recommendations generated successfully",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } catch (apiError) {
      console.error("❌ Error calling FastAPI:", apiError);

      // Fallback: retornar erro mas não bloquear
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to generate recommendations via FastAPI",
          details: apiError.message,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }
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