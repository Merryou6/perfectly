export interface User {
  id: number;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  role: "USER" | "ADMIN";
  status: "ACTIVE" | "DISABLED" | "DELETED";
  createdAt: string;
}

export interface Post {
  id: number;
  title: string | null;
  content: string;
  status: "PENDING" | "PUBLISHED" | "HIDDEN" | "DELETED";
  createdAt: string;
  updatedAt: string;
  author: Pick<User, "id" | "username" | "displayName" | "avatarUrl">;
}

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
  requestId?: string;
}
