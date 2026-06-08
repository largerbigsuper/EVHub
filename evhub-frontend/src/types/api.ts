export interface BaseResponse<T = unknown> {
  code: number;
  message: string;
  data: T | null;
}

export interface PageMeta {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface PageResponse<T = unknown> {
  code: number;
  message: string;
  data: T[];
  meta: PageMeta;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserInfo {
  id: string;
  username: string;
  nickname: string;
  email: string;
  avatar: string | null;
  role: string;
  status: number;
}