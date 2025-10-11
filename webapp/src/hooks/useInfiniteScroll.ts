import { useEffect } from 'react';

/**
 * @param callback The function to call when the user scrolls to the bottom of the page.
 * @param hasMore A boolean to indicate if there are more items to load.
 * @param isLoading A boolean to indicate if the app is currently loading more items.
 */
export const useInfiniteScroll = (callback: () => void, hasMore: boolean, isLoading: boolean) => {
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = window.innerHeight;

      if (scrollTop + clientHeight >= scrollHeight - 500 && hasMore && !isLoading) {
        callback();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [callback, hasMore, isLoading]);
};