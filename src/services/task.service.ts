import { Prisma, TaskPriority, TaskStatus } from "@prisma/client";
import { AppError } from "../middleware/error.middleware";
import type { AuthUser } from "../types";
import { prisma } from "../utils/prisma";
import { assertTaskAccess, scopeWhere } from "../utils/rbac";

export type TaskListQuery = {
  scope: string;
  status?: string;
  priority?: string;
  tags?: string;
  q?: string;
  cursor?: string;
  limit: number;
};

export type TaskWriteInput = {
  title?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  tags?: string[];
  dueDate?: string | null;
};

type Cursor = { u: string; i: string };

function encodeCursor(task: { updatedAt: Date; id: string }): string {
  return Buffer.from(
    JSON.stringify({ u: task.updatedAt.toISOString(), i: task.id }),
  ).toString("base64url");
}

function decodeCursor(cursor: string): Cursor {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString()) as Cursor;
    if (typeof parsed.u === "string" && typeof parsed.i === "string") {
      return parsed;
    }
  } catch {
    // handled below
  }
  throw new AppError(400, "Invalid cursor");
}

function parseTags(value?: string): string[] | undefined {
  if (!value) {
    return undefined;
  }
  const tags = value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  return tags.length > 0 ? tags : undefined;
}

export async function listTasks(user: AuthUser, query: TaskListQuery) {
  const tags = parseTags(query.tags);
  const cursor = query.cursor ? decodeCursor(query.cursor) : null;
  const cursorDate = cursor ? new Date(cursor.u) : null;

  const where: Prisma.TaskWhereInput = {
    AND: [
      scopeWhere(user, query.scope),
      query.status ? { status: query.status as TaskStatus } : {},
      query.priority ? { priority: query.priority as TaskPriority } : {},
      tags ? { tags: { hasSome: tags } } : {},
      query.q ? { title: { contains: query.q, mode: "insensitive" } } : {},
      cursor && cursorDate
        ? {
            OR: [
              { updatedAt: { lt: cursorDate } },
              { AND: [{ updatedAt: cursorDate }, { id: { lt: cursor.i } }] },
            ],
          }
        : {},
    ],
  };

  const rows = await prisma.task.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
  });

  const hasMore = rows.length > query.limit;
  const items = hasMore ? rows.slice(0, query.limit) : rows;
  const last = items[items.length - 1];

  return {
    items,
    nextCursor: hasMore && last ? encodeCursor(last) : null,
    hasMore,
  };
}

export async function createTask(user: AuthUser, input: TaskWriteInput) {
  if (!input.title?.trim()) {
    throw new AppError(400, "Title is required");
  }

  return prisma.task.create({
    data: {
      title: input.title.trim(),
      status: input.status ?? TaskStatus.TODO,
      priority: input.priority ?? TaskPriority.MEDIUM,
      tags: input.tags ?? [],
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      ownerId: user.id,
      orgId: user.orgId,
    },
  });
}

export async function updateTask(user: AuthUser, id: string, input: TaskWriteInput) {
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) {
    throw new AppError(404, "Task not found");
  }
  assertTaskAccess(user, task);

  return prisma.task.update({
    where: { id },
    data: {
      title: input.title?.trim(),
      status: input.status,
      priority: input.priority,
      tags: input.tags,
      dueDate: input.dueDate === undefined ? undefined : input.dueDate ? new Date(input.dueDate) : null,
    },
  });
}

export async function deleteTask(user: AuthUser, id: string) {
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) {
    throw new AppError(404, "Task not found");
  }
  assertTaskAccess(user, task);
  await prisma.task.delete({ where: { id } });
}

export async function bulkUpdateTasks(
  user: AuthUser,
  ids: string[],
  set: { status?: TaskStatus; priority?: TaskPriority },
) {
  if (ids.length === 0) {
    throw new AppError(400, "ids is required");
  }
  if (!set.status && !set.priority) {
    throw new AppError(400, "set.status or set.priority is required");
  }

  const tasks = await prisma.task.findMany({ where: { id: { in: ids } } });
  if (tasks.length !== ids.length) {
    throw new AppError(404, "Task not found");
  }
  for (const task of tasks) {
    assertTaskAccess(user, task);
  }

  await prisma.task.updateMany({
    where: { id: { in: ids } },
    data: {
      status: set.status,
      priority: set.priority,
    },
  });

  return prisma.task.findMany({
    where: { id: { in: ids } },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
  });
}
