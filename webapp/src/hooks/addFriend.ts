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

    return null;
  }


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



  try {
    // Search for user by tag
    const { data, error } = await supabase
      .from("User")
      .select("id, name, taguser")
      .eq("taguser", trimmedQuery)
      .neq("id", currentUserId)
      .single();

    if (error || !data) {

      return { user: null, error: "User not found with this tag" };
    }



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

    return {
      success: false,
      error: "You must be logged in to send friend requests",
    };
  }


  try {
    // Get authentication token
    const token = await getToken({ template: "supabase" });


    if (!token) {
      return { success: false, error: "Authentication token not found" };
    }

    // Make request to edge function
    const url = `${supabaseUrl}/functions/v1/send-friend-request`;



    const fetchResponse = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify({ receiver_id: friendId }),
    });



    const responseText = await fetchResponse.text();


    let data;
    try {
      data = JSON.parse(responseText);

    } catch (e) {

      return {
        success: false,
        error: `Server returned invalid response: ${responseText.substring(0, 100)}`,
      };
    }



    if (!fetchResponse.ok) {

      return {
        success: false,
        error: data?.error || `Server error: ${fetchResponse.status}`,
      };
    }

    if (data?.success) {

      return { success: true, error: null };
    } else {
      const errorMessage = data?.error || "Failed to send friend request";

      return { success: false, error: errorMessage };
    }
  } catch (err) {

    return { success: false, error: `Caught error: ${err}` };
  }
};