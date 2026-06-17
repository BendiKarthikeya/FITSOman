import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getAuthToken } from "./authUtils";
import { parseApiError, logError, retry } from "@/utils/error-handler";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = res.statusText;
    try {
      const errorData = await res.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      try {
        errorMessage = (await res.text()) || errorMessage;
      } catch {
        // Keep default statusText
      }
    }

    const error = new Error(errorMessage);
    (error as any).status = res.status;
    throw error;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  console.log(`[DEBUG] Making ${method} request to ${url}`);

  const headers: Record<string, string> = data
    ? { "Content-Type": "application/json" }
    : {};

  // Add Authorization header with JWT token if available
  const token = getAuthToken();
  if (token) {
    console.log(
      `[DEBUG] Adding Authorization header with token (length: ${token.length})`,
    );
    headers["Authorization"] = `Bearer ${token}`;
  } else {
    console.log(`[DEBUG] No auth token available for request to ${url}`);
  }

  // Add cache control headers to prevent issues with cached responses
  headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
  headers["Pragma"] = "no-cache";
  headers["Expires"] = "0";

  try {
    const res = await retry(
      async () => {
        const response = await fetch(url, {
          method,
          headers,
          body: data ? JSON.stringify(data) : undefined,
          credentials: "include",
        });

        // Don't retry for 4xx errors (client errors) - but extract the error message first
        if (response.status >= 400 && response.status < 500) {
          let errorMessage = response.statusText;
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
          } catch {
            try {
              errorMessage = (await response.text()) || errorMessage;
            } catch {
              // Keep default statusText
            }
          }
          
          const error = new Error(errorMessage);
          (error as any).status = response.status;
          throw error;
        }

        return response;
      },
      2,
      1000,
    ); // Max 2 attempts for network/server errors

    console.log(`[DEBUG] Response from ${url}: status ${res.status}`);

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    const parsedError = parseApiError(error);
    logError(parsedError, { url, method, data });
    throw parsedError;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const headers: Record<string, string> = {};

    // Add Authorization header with JWT token if available
    const token = getAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(queryKey[0] as string, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      // Enhanced caching configuration
      staleTime: 5 * 60 * 1000, // 5 minutes default stale time
      gcTime: 15 * 60 * 1000, // 15 minutes cache time (renamed from cacheTime in v5)
      refetchInterval: false,
      refetchOnWindowFocus: false, // Disable to prevent unnecessary network calls
      refetchOnMount: true,
      refetchOnReconnect: true,
      retry: (failureCount, error: any) => {
        // Don't retry on client errors (4xx)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry up to 2 times for server errors
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Don't retry mutations on client errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry once for server errors
        return failureCount < 1;
      },
      retryDelay: 1000,
    },
  },
});

// Function to clear entire cache
export const clearEntireCache = () => {
  console.log("Clearing entire query cache");
  queryClient.clear();
};

// Force a refresh of all query data including settings
export const refreshAllQueries = async () => {
  return queryClient.invalidateQueries();
};
