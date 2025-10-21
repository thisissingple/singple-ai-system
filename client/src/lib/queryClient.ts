import { QueryClient, QueryFunction } from "@tanstack/react-query";

// API response format
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

/**
 * Universal API request handler for new format { success, data?, error?, details? }
 * @returns Parsed data from response.data
 * @throws Error with error message and details if request fails
 */
export async function apiRequest<T = any>(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // Handle 204 No Content (DELETE operations)
  if (res.status === 204) {
    return undefined as T;
  }

  const contentType = res.headers.get('content-type') || '';

  if (!contentType.toLowerCase().includes('application/json')) {
    const rawBody = await res.text();
    const error: any = new Error('Unexpected response format');
    error.details = rawBody;
    error.status = res.status;
    throw error;
  }

  // Parse JSON response
  const json: ApiResponse<T> = await res.json();

  // Check if response is in error state
  if (!res.ok || json.success === false) {
    const errorMessage = json.error || res.statusText || 'Request failed';
    const error: any = new Error(errorMessage);
    error.details = json.details;
    error.status = res.status;
    throw error;
  }

  // Return the data payload
  return json.data as T;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn = <T = unknown>(options: {
  on401: UnauthorizedBehavior;
}): QueryFunction<T | null> => {
  return async ({ queryKey }) => {
    const { on401: unauthorizedBehavior } = options;
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    // Handle 401 based on behavior setting
    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    // Handle 204 No Content
    if (res.status === 204) {
      return undefined as T;
    }

    await throwIfResNotOk(res);

    const contentType = res.headers.get('content-type') || '';

    if (!contentType.toLowerCase().includes('application/json')) {
      const rawBody = await res.text();
      const error: any = new Error('Unexpected response format');
      error.details = rawBody;
      throw error;
    }

    // Parse new API format
    const json: ApiResponse<T> = await res.json();

    // Check success flag
    if (json.success === false) {
      const errorMessage = json.error || 'Request failed';
      const error: any = new Error(errorMessage);
      error.details = json.details;
      throw error;
    }

    // Return the data payload
    return json.data as T;
  };
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
