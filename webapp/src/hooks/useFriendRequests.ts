import { useState, useEffect, useCallback } from "react";
import { useSupabase } from "./useSupabase";
import { useAuth } from "@clerk/clerk-react";

export interface PendingRequest {
    id: string;
    sender_id: string;
    sender_name: string;
    created_at: string;
}

export const useFriendRequests = () => {
    const supabase = useSupabase();
    const { userId, getToken } = useAuth();
    const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
    const [pendingCount, setPendingCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    const fetchPendingRequests = useCallback(async () => {
        if (!userId || !supabase) return;

        setIsLoading(true);
        try {
            // Query friend_request table where current user is receiver and status is pending
            const { data, error } = await supabase
                .from("friend_request")
                .select(`
          id,
          sender_id,
          created_at,
          sender:User!friend_request_sender_id_fkey (name)
        `)
                .eq("receiver_id", userId)
                .eq("status", "pending");

            if (error) {
                console.error("Error fetching friend requests:", error);
                return;
            }

            if (data) {
                const formatted: PendingRequest[] = data.map((req: any) => ({
                    id: req.id,
                    sender_id: req.sender_id,
                    sender_name: req.sender?.name || "Unknown User",
                    created_at: req.created_at,
                }));
                setPendingRequests(formatted);
                setPendingCount(formatted.length);
            }
        } catch (err) {
            console.error("Exception fetching friend requests:", err);
        } finally {
            setIsLoading(false);
        }
    }, [userId, supabase]);

    const respondToRequest = async (requestId: string, accept: boolean) => {
        if (!userId || !supabase) return { success: false, error: "Not authenticated" };

        try {
            const token = await getToken({ template: "supabase" });
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

            const endpoint = accept ? "accept-friend-request" : "decline-friend-request";
            const url = `${supabaseUrl}/functions/v1/${endpoint}`;

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                    apikey: supabaseAnonKey,
                },
                body: JSON.stringify({ request_id: requestId }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Refresh local state
                await fetchPendingRequests();
                return { success: true };
            } else {
                return { success: false, error: data.error || "Failed to respond to request" };
            }
        } catch (err) {
            return { success: false, error: String(err) };
        }
    };

    useEffect(() => {
        fetchPendingRequests();
    }, [fetchPendingRequests]);

    return {
        pendingRequests,
        pendingCount,
        isLoading,
        refresh: fetchPendingRequests,
        acceptRequest: (id: string) => respondToRequest(id, true),
        declineRequest: (id: string) => respondToRequest(id, false),
    };
};
