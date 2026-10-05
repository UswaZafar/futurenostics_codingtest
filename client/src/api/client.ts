import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { clearAuth, readAuth, saveAuth } from "../auth/storage";

const API_URL = "http://localhost:4000";

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

export const api = axios.create({ baseURL: API_URL });

let refreshPromise: Promise<string> | null = null;

function redirectToLogin(): void {
  clearAuth();
  if (window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}

function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    const session = readAuth();
    refreshPromise = (
      session
        ? axios
            .post<{ accessToken: string }>(`${API_URL}/auth/refresh`, {
              refreshToken: session.refreshToken,
            })
            .then((response) => {
              saveAuth({ ...session, accessToken: response.data.accessToken });
              return response.data.accessToken;
            })
        : Promise.reject(new Error("Not signed in"))
    ).finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

api.interceptors.request.use((config) => {
  const accessToken = readAuth()?.accessToken;
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryConfig | undefined;
    const url = config?.url ?? "";
    const isAuthCall = url.includes("/auth/login") || url.includes("/auth/refresh");

    if (!config || error.response?.status !== 401 || config._retry || isAuthCall) {
      return Promise.reject(error);
    }

    config._retry = true;

    try {
      const accessToken = await refreshAccessToken();
      config.headers.Authorization = `Bearer ${accessToken}`;
      return api.request(config);
    } catch (refreshError) {
      redirectToLogin();
      return Promise.reject(refreshError);
    }
  },
);
