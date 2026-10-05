import type { RequestHandler } from "express";
import { AppError } from "../middleware/error.middleware";
import * as authService from "../services/auth.service";

function readLoginBody(body: unknown): { email: string; password: string } {
  if (!body || typeof body !== "object") {
    throw new AppError(400, "Email and password are required");
  }

  const { email, password } = body as { email?: unknown; password?: unknown };
  if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
    throw new AppError(400, "Email and password are required");
  }

  return { email: email.trim().toLowerCase(), password };
}

function readRefreshBody(body: unknown): string {
  if (!body || typeof body !== "object") {
    throw new AppError(400, "Refresh token is required");
  }

  const { refreshToken } = body as { refreshToken?: unknown };
  if (typeof refreshToken !== "string" || !refreshToken) {
    throw new AppError(400, "Refresh token is required");
  }

  return refreshToken;
}

export const login: RequestHandler = async (req, res, next) => {
  try {
    const { email, password } = readLoginBody(req.body);
    res.json(await authService.login(email, password));
  } catch (error) {
    next(error);
  }
};

export const refresh: RequestHandler = async (req, res, next) => {
  try {
    res.json(await authService.refresh(readRefreshBody(req.body)));
  } catch (error) {
    next(error);
  }
};
