import Taro from "@tarojs/taro";
import type { ApiEnvelope } from "@/types";

declare const __API_BASE__: string;

const API_BASE = __API_BASE__;

export const TOKEN_KEY = "perfectly_token";
export const USER_KEY = "perfectly_user";

interface RequestOptions {
  path: string;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  data?: unknown;
  auth?: boolean;
}

export async function request<T>({
  path,
  method = "GET",
  data,
  auth = false,
}: RequestOptions): Promise<T> {
  const token = Taro.getStorageSync<string>(TOKEN_KEY);
  const response = await Taro.request<ApiEnvelope<T>>({
    url: `${API_BASE}${path}`,
    method,
    data,
    header: {
      "Content-Type": "application/json",
      ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (response.statusCode === 401) {
    Taro.removeStorageSync(TOKEN_KEY);
    Taro.removeStorageSync(USER_KEY);
    throw new Error("登录已过期，请重新登录");
  }

  const body = response.data;
  if (response.statusCode < 200 || response.statusCode >= 300 || body.code !== 0) {
    throw new Error(body?.message || "请求失败，请稍后重试");
  }
  return body.data;
}
