import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_RORK_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  }

  throw new Error(
    "No base url found, please set EXPO_PUBLIC_RORK_API_BASE_URL"
  );
};

// Lazy initialize tRPC client to improve cold start
let _trpcClient: ReturnType<typeof trpc.createClient> | null = null;

export const trpcClient = (() => {
  if (!_trpcClient) {
    console.log('🚀 Initializing tRPC client...');
    _trpcClient = trpc.createClient({
      links: [
        httpLink({
          url: `${getBaseUrl()}/api/trpc`,
          transformer: superjson,
          // Optimize for faster requests
          fetch: (url, options) => {
            return fetch(url, {
              ...options,
              // Add timeout for faster failure
              signal: AbortSignal.timeout(10000), // 10 second timeout
            });
          },
        }),
      ],
    });
  }
  return _trpcClient;
})();