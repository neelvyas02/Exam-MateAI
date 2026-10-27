import { ApiResponse } from "./types";

export const AUTH_TOKEN_KEY = "exammate_token";
export const AUTH_USER_KEY = "exammate_user";
export const AUTH_REFRESH_TOKEN_KEY = "exammate_refresh_token";

const getBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && envUrl.trim() !== "") {
    return envUrl.replace(/\/+$/, "");
  }
  // Fallback to relative proxy or direct dev server URL
  return typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:5137/api/v1"
    : "/api/v1";
};

export function getStoredAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setStoredAuthToken(token: string | null, refreshToken?: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    if (refreshToken) {
      localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, refreshToken);
    }
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  }
}

export class ApiError extends Error {
  public statusCode: number;
  public errors: string[];

  constructor(message: string, statusCode: number = 500, errors: string[] = []) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: any;
  params?: Record<string, string | number | boolean | undefined | null>;
  isFormData?: boolean;
}

export async function request<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { body, params, headers = {}, isFormData = false, ...customConfig } = options;

  let url = `${getBaseUrl()}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  if (params) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });
    const queryString = queryParams.toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }
  }

  const reqHeaders: Record<string, string> = {
    Accept: "application/json",
    ...(headers as Record<string, string>),
  };

  if (!isFormData && body !== undefined && !(body instanceof FormData)) {
    reqHeaders["Content-Type"] = "application/json";
  }

  const token = getStoredAuthToken();
  if (token) {
    reqHeaders["Authorization"] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...customConfig,
    headers: reqHeaders,
  };

  if (body !== undefined) {
    config.body = isFormData || body instanceof FormData ? body : JSON.stringify(body);
  }

  try {
    const response = await fetch(url, config);

    if (response.status === 401) {
      setStoredAuthToken(null);
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        // Broadcast auth expired event if needed or trigger redirect
        window.dispatchEvent(new Event("exammate:unauthorized"));
      }
    }

    let data: ApiResponse<T>;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = {
        success: response.ok,
        message: response.ok ? text : `HTTP Error ${response.status}: ${response.statusText}`,
        data: text as unknown as T,
      };
    }

    if (!response.ok || data.success === false) {
      let errorMsg = data.message || `Request failed with status ${response.status}`;
      if (response.status === 401 && (errorMsg === "Unauthorized access." || !errorMsg)) {
        errorMsg = "Invalid email or password.";
      }

      const rawErrors = data.errors && data.errors.length > 0 ? data.errors : [errorMsg];
      const errorsList = rawErrors.map((err) =>
        err.includes("transient failure")
          ? "Unable to connect to the ExamMateAI database. Please check your database server."
          : err
      );

      if (errorMsg.includes("transient failure")) {
        errorMsg = "Unable to connect to the ExamMateAI database. Please check your database server.";
      }

      console.warn(`[API Response Error] ${config.method || "GET"} ${url} -> Status ${response.status}:`, errorMsg);
      throw new ApiError(errorMsg, response.status, errorsList);
    }

    return data;
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    const isNetworkError =
      error.name === "TypeError" ||
      error.message?.includes("fetch") ||
      error.message?.includes("Failed to fetch") ||
      error.message?.includes("NetworkError");

    const message = isNetworkError
      ? "Unable to connect to the ExamMateAI server. Please make sure the backend is running."
      : (error.message || "ExamMateAI server is currently unavailable.");

    console.error(`[API Network/Client Error] ${config.method || "GET"} ${url}:`, message);
    throw new ApiError(message, isNetworkError ? 503 : 500, [message]);
  }
}

export const apiClient = {
  get: <T = any>(endpoint: string, params?: Record<string, any>, options: RequestOptions = {}) =>
    request<T>(endpoint, { ...options, method: "GET", params }),

  post: <T = any>(endpoint: string, body?: any, options: RequestOptions = {}) =>
    request<T>(endpoint, { ...options, method: "POST", body }),

  put: <T = any>(endpoint: string, body?: any, options: RequestOptions = {}) =>
    request<T>(endpoint, { ...options, method: "PUT", body }),

  patch: <T = any>(endpoint: string, body?: any, options: RequestOptions = {}) =>
    request<T>(endpoint, { ...options, method: "PATCH", body }),

  delete: <T = any>(endpoint: string, options: RequestOptions = {}) =>
    request<T>(endpoint, { ...options, method: "DELETE" }),

  postForm: <T = any>(endpoint: string, formData: FormData, options: RequestOptions = {}) =>
    request<T>(endpoint, { ...options, method: "POST", body: formData, isFormData: true }),
};
