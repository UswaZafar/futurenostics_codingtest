import type { Role } from "@prisma/client";

export type HealthResponse = {
  status: "ok";
};

export type AuthUser = {
  id: string;
  email: string;
  orgId: string;
  roles: Role[];
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export type RefreshResponse = {
  accessToken: string;
};

export type ErrorResponse = {
  error: string;
};
