import { SupabaseClient } from "@supabase/supabase-js";

export interface Friend {
  id: string;
  name: string;
  taguser: string;
  requestStatus?: "none" | "pending" | "friends";
}

export interface SearchUserParams {
  supabase: SupabaseClient;
  searchQuery: string;
  currentUserId: string | null;
}

export interface SendFriendRequestParams {
  friendId: string;
  currentUserId: string | null;
  getToken: (options: { template: string }) => Promise<string | null>;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

/**
 * Verifies if the user exists in Supabase
 */
export const verifyUserInSupabase = async (
  supabase: SupabaseClient,
  userId: string
) => {
  const { data, error } = await supabase
    .from("User")
    .select("id")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("User not found in Supabase:", error);
    return null;
  }

  console.log("User found in Supabase:", data);
  return data;
};

/**
 * Searches for a user by their tag
 */
export const searchUserByTag = async ({
  supabase,
  searchQuery,
  currentUserId,
}: SearchUserParams): Promise<{
  user: Friend | null;
  error: string | null;
}> => {
  const trimmedQuery = searchQuery.trim();

  if (!trimmedQuery) {
    return { user: null, error: null };
  }

  console.log("Searching for tag:", trimmedQuery);

  try {
    // Search for user by tag
    const { data, error } = await supabase
      .from("User")
      .select("id, name, taguser")
      .eq("taguser", trimmedQuery)
      .neq("id", currentUserId)
      .single();

    if (error || !data) {
      console.log("User not found with tag:", trimmedQuery);
      return { user: null, error: "User not found with this tag" };
    }

    console.log("User found:", data);

    // Check if already friends
    const { data: friendshipData } = await supabase
      .from("friendships")
      .select("*")
      .or(
        `and(user_id_a.eq.${currentUserId},user_id_b.eq.${data.id}),and(user_id_a.eq.${data.id},user_id_b.eq.${currentUserId})`
      );

    if (friendshipData && friendshipData.length > 0) {
      return { user: { ...data, requestStatus: "friends" }, error: null };
    }

    // Check if there's a pending request
    const { data: requestData } = await supabase
      .from("friend_request")
      .select("*")
      .or(
        `and(sender_id.eq.${currentUserId},receiver_id.eq.${data.id}),and(sender_id.eq.${data.id},receiver_id.eq.${currentUserId})`
      )
      .eq("status", "pending");

    if (requestData && requestData.length > 0) {
      return { user: { ...data, requestStatus: "pending" }, error: null };
    }

    return { user: { ...data, requestStatus: "none" }, error: null };
  } catch (err) {
    console.error("Search error:", err);
    return { user: null, error: "Error searching for user" };
  }
};

/**
 * Sends a friend request to another user
 */
export const sendFriendRequest = async ({
  friendId,
  currentUserId,
  getToken,
  supabaseUrl,
  supabaseAnonKey,
}: SendFriendRequestParams): Promise<{
  success: boolean;
  error: string | null;
}> => {
  if (!currentUserId) {
    console.error("User not authenticated");
    return {
      success: false,
      error: "You must be logged in to send friend requests",
    };
  }

  console.log(`Sending friend request to user: ${friendId}`);
  console.log(`Current user ID: ${currentUserId}`);

  try {
    // Get authentication token
    const token = await getToken({ template: "supabase" });
    console.log("Token exists:", !!token);

    if (!token) {
      return { success: false, error: "Authentication token not found" };
    }

    // Make request to edge function
    const url = `${supabaseUrl}/functions/v1/send-friend-request`;

    console.log("=== FETCH REQUEST ===");
    console.log("URL:", url);
    console.log("Token preview:", token.substring(0, 50) + "...");

    const fetchResponse = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify({ receiver_id: friendId }),
    });

    console.log("=== FETCH RESPONSE ===");
    console.log("Status:", fetchResponse.status);
    console.log("Status Text:", fetchResponse.statusText);
    console.log(
      "Headers:",
      Object.fromEntries(fetchResponse.headers.entries())
    );

    const responseText = await fetchResponse.text();
    console.log("Response Text:", responseText);

    let data;
    try {
      data = JSON.parse(responseText);
      console.log("Parsed Data:", data);
    } catch (e) {
      console.error("Failed to parse response as JSON:", e);
      return {
        success: false,
        error: `Server returned invalid response: ${responseText.substring(0, 100)}`,
      };
    }

    console.log("======================");

    if (!fetchResponse.ok) {
      console.error("Edge function returned error:", data);
      return {
        success: false,
        error: data?.error || `Server error: ${fetchResponse.status}`,
      };
    }

    if (data?.success) {
      console.log("✅ Friend request sent!", data.data);
      return { success: true, error: null };
    } else {
      const errorMessage = data?.error || "Failed to send friend request";
      console.error("Edge function error:", errorMessage);
      return { success: false, error: errorMessage };
    }
  } catch (err) {
    console.error("Unexpected error:", err);
    return { success: false, error: `Caught error: ${err}` };
  }
};