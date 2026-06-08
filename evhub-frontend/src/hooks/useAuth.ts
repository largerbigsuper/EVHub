"use client";

import { useEffect } from "react";
import apiClient from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";
import type { BaseResponse, UserInfo } from "@/types/api";

export function useAuth() {
  const { user, isAuthenticated, setUser, clearUser } = useAuthStore();

  useEffect(() => {
    async function fetchUser() {
      try {
        const { data } = await apiClient.get<BaseResponse<UserInfo>>("/auth/me");
        if (data.data) {
          setUser(data.data);
        }
      } catch {
        clearUser();
      }
    }
    if (!user && !isAuthenticated) {
      fetchUser();
    }
  }, [user, isAuthenticated, setUser, clearUser]);

  return { user, isAuthenticated, setUser, clearUser };
}