import type { RequestHandler } from "express";
import { AppError } from "./error.middleware";
import { verifyAccessToken } from "../utils/jwt";

export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next(new AppError(401, "Unauthorized"));
    return;
  }

  try {
    const payload = verifyAccessToken(header.slice("Bearer ".length).trim());
    req.user = {
      id: payload.sub,
      email: payload.email,
      orgId: payload.orgId,
      roles: payload.roles,
    };
    next();
  } catch {
    next(new AppError(401, "Unauthorized"));
  }
};
