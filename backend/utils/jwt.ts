import { Role } from "@prisma/client";
import jwt from "jsonwebtoken";
import { env } from "./env";

export const accessTokenTtlSeconds = 15 * 60;

export type AccessTokenPayload = {
  sub: string;
  email: string;
  orgId: string;
  roles: Role[];
};

function isRole(value: unknown): value is Role {
  return value === Role.USER || value === Role.MANAGER || value === Role.ADMIN;
}

function isAccessTokenPayload(value: unknown): value is AccessTokenPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as AccessTokenPayload;
  return (
    typeof payload.sub === "string" &&
    typeof payload.email === "string" &&
    typeof payload.orgId === "string" &&
    Array.isArray(payload.roles) &&
    payload.roles.every(isRole)
  );
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: accessTokenTtlSeconds });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.jwtSecret);
  if (!isAccessTokenPayload(decoded)) {
    throw new Error("Invalid access token");
  }
  return decoded;
}
