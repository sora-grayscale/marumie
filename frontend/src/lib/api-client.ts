const API_BASE = "";

interface ApiOptions extends RequestInit {
  params?: Record<string, string>;
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { params, ...fetchOptions } = options;

  let url = `${API_BASE}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...fetchOptions.headers,
    },
    credentials: "include",
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "Unknown error");
    throw new ApiError(response.status, errorBody);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const api = {
  get<T>(endpoint: string, options?: ApiOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: "GET" });
  },
  post<T>(endpoint: string, body?: unknown, options?: ApiOptions): Promise<T> {
    return request<T>(endpoint, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  },
  put<T>(endpoint: string, body?: unknown, options?: ApiOptions): Promise<T> {
    return request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  },
  delete<T>(endpoint: string, options?: ApiOptions): Promise<T> {
    return request<T>(endpoint, { ...options, method: "DELETE" });
  },
  upload<T>(endpoint: string, formData: FormData, options?: ApiOptions): Promise<T> {
    const { params, headers: _headers, ...rest } = options || {};

    let url = `${API_BASE}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    return fetch(url, {
      ...rest,
      method: "POST",
      body: formData,
      credentials: "include",
    }).then(async (response) => {
      if (!response.ok) {
        const errorBody = await response.text().catch(() => "Unknown error");
        throw new ApiError(response.status, errorBody);
      }
      if (response.status === 204) return undefined as T;
      return response.json();
    });
  },
};

export { ApiError };
