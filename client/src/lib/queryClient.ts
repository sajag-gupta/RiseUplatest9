import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Get auth token for authenticated endpoints
  const token = localStorage.getItem('ruc_auth_token');
  const headers: Record<string, string> = {};

  if (data) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Only use the first element as the URL, ignore cache parameters
    const url = queryKey[0] as string;
    
    // Get auth token for authenticated endpoints
    const token = localStorage.getItem('ruc_auth_token');
    const headers: Record<string, string> = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const res = await fetch(url, {
      credentials: "include",
      headers,
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
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: (failureCount, error) => {
        // Don't retry on auth errors (401, 403)
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as any).status;
          if (status === 401 || status === 403) {
            return false;
          }
        }
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
