import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Check for Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header. Please login." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Create Supabase client with service_role_key
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Manually decode token to get user_id
    let user_id: string;
    try {
      const token = authHeader.replace("Bearer ", "");
      const payload = JSON.parse(atob(token.split(".")[1]));
      user_id = payload.sub;
      if (!user_id) throw new Error("User ID (sub) not found in token payload.");
    } catch (e) {
      console.error("Error manually decoding token:", e);
      return new Response(
        JSON.stringify({ error: "Invalid token format." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    console.log("Generating recommendations for user:", user_id);

    // Validate: User must have at least 5 rated movies
    const { data: userMovies, error: userMoviesError } = await supabase
      .from("user_movies")
      .select("movie_id", { count: "exact" })
      .eq("user_id", user_id);

    if (userMoviesError) throw userMoviesError;

    if (!userMovies || userMovies.length < 5) {
      return new Response(
        JSON.stringify({ 
          error: "You need to rate at least 5 movies to generate recommendations.",
          rated_count: userMovies?.length || 0,
          required_count: 5
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Call Python recommendation service
    const pythonServiceUrl = Deno.env.get("PYTHON_SERVICE_URL") || "http://127.0.0.1:8000";
    const recommendationResponse = await fetch(
      `${pythonServiceUrl}/get/${user_id}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!recommendationResponse.ok) {
      const errorText = await recommendationResponse.text();
      console.error("Python service error:", errorText);
      return new Response(
        JSON.stringify({ 
          error: "Failed to generate recommendations from ML service",
          details: errorText
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const recommendationData = await recommendationResponse.json();
    console.log("Recommendations generated successfully:", recommendationData);

    // Verify recommendations were saved
    const { data: savedRecommendations, error: verifyError } = await supabase
      .from("user_recommendations")
      .select("movie_id", { count: "exact" })
      .eq("user_id", user_id)
      .limit(10);

    if (verifyError) throw verifyError;

    // Success
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Recommendations generated successfully",
        recommendations_count: savedRecommendations?.length || 0,
        data: recommendationData
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    console.error("❌ Error in get-recommendations:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal Server Error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});