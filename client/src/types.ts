export type Role = "USER" | "MANAGER" | "ADMIN";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

export type Scope = "mine" | "org" | "all";

export type AuthUser = {
  id: string;
  email: string;
  orgId: string;
  roles: Role[];
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  tags: string[];
  dueDate: string | null;
  ownerId: string;
  orgId: string;
};

export type TaskListResponse = {
  items: Task[];
  nextCursor: string | null;
  hasMore: boolean;
};

export function highestRole(roles: Role[]): Role {
  if (roles.includes("ADMIN")) return "ADMIN";
  if (roles.includes("MANAGER")) return "MANAGER";
  return "USER";
}
