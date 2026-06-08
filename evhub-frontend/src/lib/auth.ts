import apiClient from "./api";
import type { BaseResponse, TokenResponse } from "@/types/api";

export async function login(email: string, password: string): Promise<TokenResponse> {
  const { data } = await apiClient.post<BaseResponse<TokenResponse>>("/auth/login", {
    email,
    password,
  });
  return data.data!;
}

export async function register(
  username: string,
  email: string,
  password: string
): Promise<void> {
  await apiClient.post("/auth/register", { username, email, password });
}

export async function logout(): Promise<void> {
  await apiClient.post("/auth/logout");
}

export async function refreshToken(): Promise<string> {
  const { data } = await apiClient.post<BaseResponse<{ access_token: string }>>(
    "/auth/refresh"
  );
  return data.data!.access_token;
}