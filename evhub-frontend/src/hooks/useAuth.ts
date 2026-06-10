"use client";

import { useEffect, useRef } from "react";
import apiClient from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";
import type { BaseResponse, UserInfo } from "@/types/api";

export function useAuth() {
  const { user, isAuthenticated, setUser, clearUser } = useAuthStore();
  const triedRef = useRef(false);

  useEffect(() => {
    if (triedRef.current) return;
    if (user || isAuthenticated) return;

    triedRef.current = true;
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
    fetchUser();
  }, [user, isAuthenticated, setUser, clearUser]);

  return { user, isAuthenticated, setUser, clearUser };
}