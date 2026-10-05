import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { AppError } from "../middleware/error.middleware";
import type { AuthUser, LoginResponse, RefreshResponse } from "../types";
import { prisma } from "../utils/prisma";
import { signAccessToken } from "../utils/jwt";

const refreshTokenTtlMs = 7 * 24 * 60 * 60 * 1000;

function toAuthUser(user: {
  id: string;
  email: string;
  orgId: string;
  roles: AuthUser["roles"];
}): AuthUser {
  return {
    id: user.id,
    email: user.email,
    orgId: user.orgId,
    roles: user.roles,
  };
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const user = await prisma.user.findUnique({ where: { email } });
  const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false;

  if (!user || !passwordMatches) {
    throw new AppError(401, "Invalid email or password");
  }

  const authUser = toAuthUser(user);
  const refreshToken = randomBytes(32).toString("hex");

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + refreshTokenTtlMs),
    },
  });

  return {
    accessToken: signAccessToken({
      sub: authUser.id,
      email: authUser.email,
      orgId: authUser.orgId,
      roles: authUser.roles,
    }),
    refreshToken,
    user: authUser,
  };
}

export async function refresh(refreshToken: string): Promise<RefreshResponse> {
  const stored = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { user: true },
  });

  if (!stored || stored.expiresAt <= new Date()) {
    throw new AppError(401, "Invalid refresh token");
  }

  const authUser = toAuthUser(stored.user);

  return {
    accessToken: signAccessToken({
      sub: authUser.id,
      email: authUser.email,
      orgId: authUser.orgId,
      roles: authUser.roles,
    }),
  };
}
