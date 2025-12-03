import { useState } from 'react';
import { useSupabase } from './useSupabase';
import { useUser, useClerk } from '@clerk/clerk-react';

interface UseDeleteAccountReturn {
    deleteAccount: () => Promise<void>;
    isDeleting: boolean;
    error: string | null;
}

export const useDeleteAccount = (): UseDeleteAccountReturn => {
    const supabase = useSupabase();
    const { user } = useUser();
    const { signOut } = useClerk();
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const deleteAccount = async () => {
        if (!user || !supabase) return;

        setIsDeleting(true);
        setError(null);

        try {
            // 1. Delete data from Supabase via Edge Function
            // The Edge Function will also delete the user from Clerk if CLERK_SECRET_KEY is set.
            const { error: supabaseError } = await supabase.functions.invoke('delete-account', {
                method: 'DELETE',
            });

            if (supabaseError) {
                throw new Error(supabaseError.message || 'Failed to delete data from Supabase');
            }

            // 2. Sign out locally
            // We do NOT call user.delete() here because it triggers "additional verification" errors.
            await signOut();

        } catch (err: any) {
            console.error('Error deleting account:', err);
            setError(err.message || 'An error occurred while deleting your account.');
            throw err;
        } finally {
            setIsDeleting(false);
        }
    };

    return {
        deleteAccount,
        isDeleting,
        error,
    };
};
