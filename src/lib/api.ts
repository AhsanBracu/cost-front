import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";
export const TOKEN_STORAGE_KEY = "cost_front_token";

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error ?? error.message;
  }
  return error instanceof Error ? error.message : "Something went wrong";
};

export const receiptUrl = (path?: string) => (path ? `${API_BASE_URL}${path}` : undefined);
