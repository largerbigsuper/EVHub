import apiClient from "./api";
import type { BaseResponse, TokenResponse } from "@/types/api";

const ACCESS_TOKEN_KEY = "evhub_access_token";
const REFRESH_TOKEN_KEY = "evhub_refresh_token";

const COOKIE_DAYS = 7;

function setCookie(name: string, value: string, days: number = COOKIE_DAYS) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 86400000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function removeCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(access_token: string, refresh_token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_TOKEN_KEY, access_token);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
  setCookie("access_token", access_token);
}

export function setUserRole(role: string): void {
  setCookie("user_role", role);
}

export function clearTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  removeCookie("access_token");
  removeCookie("user_role");
}

export function hasToken(): boolean {
  return !!getAccessToken();
}

export function syncTokenCookie(): void {
  const token = getAccessToken();
  if (token) {
    setCookie("access_token", token);
  }
}

export async function login(login: string, password: string): Promise<TokenResponse> {
  const { data } = await apiClient.post<BaseResponse<TokenResponse>>("/auth/login", {
    login,
    password,
  });
  const tokens = data.data!;
  setTokens(tokens.access_token, tokens.refresh_token);
  return tokens;
}

export async function register(
  username: string,
  email: string,
  password: string
): Promise<void> {
  const { data } = await apiClient.post<BaseResponse<TokenResponse>>("/auth/register", {
    username,
    email,
    password,
  });
  if (data.data) {
    setTokens(data.data.access_token, data.data.refresh_token);
  }
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post("/auth/logout");
  } catch {
    // ignore logout errors
  }
  clearTokens();
}

export async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token");
  const { data } = await apiClient.post<BaseResponse<{ access_token: string }>>(
    "/auth/refresh",
    { refresh_token: refreshToken }
  );
  return data.data!.access_token;
}