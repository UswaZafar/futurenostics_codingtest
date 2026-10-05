import type { RequestHandler } from "express";
import type { HealthResponse } from "../types";

export const getHealth: RequestHandler = (_req, res) => {
  const body: HealthResponse = { status: "ok" };
  res.json(body);
};
