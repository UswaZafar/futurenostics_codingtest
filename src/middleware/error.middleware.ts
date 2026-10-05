import type { ErrorRequestHandler } from "express";
import type { ErrorResponse } from "../types";
import { env } from "../utils/env";

export class AppError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message =
    err instanceof AppError
      ? err.message
      : env.nodeEnv === "production"
        ? "Internal server error"
        : err instanceof Error
          ? err.message
          : "Internal server error";

  if (statusCode === 500) {
    console.error(err);
  }

  const body: ErrorResponse = { error: message };
  res.status(statusCode).json(body);
};
