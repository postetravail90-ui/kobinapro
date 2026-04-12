import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      throwOnError: false,
      retry: 2,
      retryDelay: 1000,
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      placeholderData: (previousData: unknown) => previousData,
    },
    mutations: {
      retry: 1,
    },
  },
});
