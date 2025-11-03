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
    // Get request body
    const { receiver_id } = await req.json();
    if (!receiver_id || typeof receiver_id !== "string" || receiver_id.trim() === "") {
      return new Response(
        JSON.stringify({ error: "receiver_id is required and must be a valid string." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Check for Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header. Please login." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Create Supabase client with service_role_key (INSECURE - TEMPORARY)
    // This bypasses all RLS. This is a temporary and insecure measure.
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Manually decode token to get sender_id (INSECURE - TEMPORARY)
    let sender_id: string;
    try {
      const token = authHeader.replace("Bearer ", "");
      const payload = JSON.parse(atob(token.split(".")[1]));
      sender_id = payload.sub;
      if (!sender_id) throw new Error("User ID (sub) not found in token payload.");
    } catch (e) {
      console.error("Error manually decoding token:", e);
      return new Response(
        JSON.stringify({ error: "Invalid token format." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Validate: Cannot send a request to yourself
    if (sender_id === receiver_id) {
      return new Response(
        JSON.stringify({ error: "You cannot send a friend request to yourself." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Validate: Receiver must exist in the 'User' table
    const { data: receiverExists, error: receiverError } = await supabase
      .from("User")
      .select("id")
      .eq("id", receiver_id)
      .maybeSingle();

    if (receiverError) throw receiverError;
    if (!receiverExists) {
      return new Response(
        JSON.stringify({ error: "User not found. Please check the user ID." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Validate: Not already friends
    const { data: existingFriendship, error: friendshipError } = await supabase
      .from("friendships")
      .select("user_id_a, user_id_b")
      .or(`and(user_id_a.eq.${sender_id},user_id_b.eq.${receiver_id}),and(user_id_a.eq.${receiver_id},user_id_b.eq.${sender_id})`)
      .maybeSingle();

    if (friendshipError) throw friendshipError;
    if (existingFriendship) {
      return new Response(
        JSON.stringify({ error: "You are already friends with this user." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409 }
      );
    }

    // Validate: No pending request in either direction
    const { data: existingRequest, error: requestError } = await supabase
      .from("friend_request")
      .select("id, sender_id")
      .or(`and(sender_id.eq.${sender_id},receiver_id.eq.${receiver_id}),and(sender_id.eq.${receiver_id},receiver_id.eq.${sender_id})`)
      .eq("status", "pending")
      .maybeSingle();

    if (requestError) throw requestError;
    if (existingRequest) {
      const error = existingRequest.sender_id === receiver_id
        ? "This user has already sent you a friend request. Please accept it instead."
        : "You already have a pending friend request with this user.";
      return new Response(
        JSON.stringify({ error }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409 }
      );
    }

    // Insert new friend request
    const { data, error } = await supabase
      .from("friend_request")
      .insert({ sender_id, receiver_id, status: "pending" })
      .select("id, sender_id, receiver_id, status, created_at")
      .single();

    if (error) throw error;

    // Success
    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 201 }
    );

  } catch (error) {
    console.error("❌ Error in send-friend-request:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal Server Error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});