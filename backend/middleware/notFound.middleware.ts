import type { RequestHandler } from "express";
import { AppError } from "./error.middleware";

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};
