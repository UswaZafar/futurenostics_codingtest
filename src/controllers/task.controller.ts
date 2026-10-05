import { TaskPriority, TaskStatus } from "@prisma/client";
import type { Request, RequestHandler } from "express";
import { AppError } from "../middleware/error.middleware";
import * as taskService from "../services/task.service";
import type { AuthUser } from "../types";

const statuses = new Set<string>(Object.values(TaskStatus));
const priorities = new Set<string>(Object.values(TaskPriority));

function currentUser(req: Request): AuthUser {
  if (!req.user) {
    throw new AppError(401, "Unauthorized");
  }
  return req.user;
}

function asEnum<T extends string>(value: unknown, allowed: Set<string>, label: string): T | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value !== "string" || !allowed.has(value)) {
    throw new AppError(400, `Invalid ${label}`);
  }
  return value as T;
}

function asStringArray(value: unknown): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new AppError(400, "tags must be a string array");
  }
  return value.map((item) => item.trim()).filter(Boolean);
}

function asDueDate(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value === "") {
    return null;
  }
  if (typeof value !== "string") {
    throw new AppError(400, "Invalid dueDate");
  }
  return value;
}

function readWriteBody(body: unknown) {
  if (!body || typeof body !== "object") {
    return {};
  }
  const data = body as Record<string, unknown>;
  return {
    title: typeof data.title === "string" ? data.title : undefined,
    status: asEnum<TaskStatus>(data.status, statuses, "status"),
    priority: asEnum<TaskPriority>(data.priority, priorities, "priority"),
    tags: asStringArray(data.tags),
    dueDate: asDueDate(data.dueDate),
  };
}

export const listTasks: RequestHandler = async (req, res, next) => {
  try {
    const limitRaw = Number(req.query.limit ?? 20);
    const limit = Number.isInteger(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 20;
    const status = asEnum<TaskStatus>(
      typeof req.query.status === "string" ? req.query.status : undefined,
      statuses,
      "status",
    );
    const priority = asEnum<TaskPriority>(
      typeof req.query.priority === "string" ? req.query.priority : undefined,
      priorities,
      "priority",
    );

    res.json(
      await taskService.listTasks(currentUser(req), {
        scope: typeof req.query.scope === "string" && req.query.scope ? req.query.scope : "mine",
        status,
        priority,
        tags: typeof req.query.tags === "string" ? req.query.tags : undefined,
        q: typeof req.query.q === "string" ? req.query.q : undefined,
        cursor: typeof req.query.cursor === "string" ? req.query.cursor : undefined,
        limit,
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const createTask: RequestHandler = async (req, res, next) => {
  try {
    res.status(201).json(await taskService.createTask(currentUser(req), readWriteBody(req.body)));
  } catch (error) {
    next(error);
  }
};

export const updateTask: RequestHandler = async (req, res, next) => {
  try {
    res.json(await taskService.updateTask(currentUser(req), req.params.id, readWriteBody(req.body)));
  } catch (error) {
    next(error);
  }
};

export const deleteTask: RequestHandler = async (req, res, next) => {
  try {
    await taskService.deleteTask(currentUser(req), req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const bulkUpdateTasks: RequestHandler = async (req, res, next) => {
  try {
    const body = req.body as { ids?: unknown; set?: { status?: unknown; priority?: unknown } };
    if (!body || !Array.isArray(body.ids) || body.ids.some((id) => typeof id !== "string")) {
      throw new AppError(400, "ids is required");
    }
    res.json(
      await taskService.bulkUpdateTasks(currentUser(req), body.ids, {
        status: asEnum<TaskStatus>(body.set?.status, statuses, "status"),
        priority: asEnum<TaskPriority>(body.set?.priority, priorities, "priority"),
      }),
    );
  } catch (error) {
    next(error);
  }
};
