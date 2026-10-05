import { Prisma, Role } from "@prisma/client";
import { AppError } from "../middleware/error.middleware";
import type { AuthUser } from "../types";

type TaskAccess = {
  orgId: string;
  ownerId: string;
};

export function taskAccessWhere(user: AuthUser): Prisma.TaskWhereInput {
  if (user.roles.includes(Role.ADMIN)) {
    return {};
  }

  if (user.roles.includes(Role.MANAGER)) {
    return { orgId: user.orgId };
  }

  return { ownerId: user.id };
}

export function scopeWhere(user: AuthUser, scope: string): Prisma.TaskWhereInput {
  if (scope === "mine") {
    return { AND: [{ ownerId: user.id }, taskAccessWhere(user)] };
  }

  if (scope === "org") {
    if (!user.roles.includes(Role.MANAGER) && !user.roles.includes(Role.ADMIN)) {
      throw new AppError(403, "Forbidden");
    }
    return { AND: [{ orgId: user.orgId }, taskAccessWhere(user)] };
  }

  if (scope === "all") {
    if (!user.roles.includes(Role.ADMIN)) {
      throw new AppError(403, "Forbidden");
    }
    return taskAccessWhere(user);
  }

  throw new AppError(400, "Invalid scope");
}

export function assertTaskAccess(user: AuthUser, task: TaskAccess): void {
  if (user.roles.includes(Role.ADMIN)) {
    return;
  }

  if (user.roles.includes(Role.MANAGER)) {
    if (task.orgId !== user.orgId) {
      throw new AppError(403, "Forbidden");
    }
    return;
  }

  if (task.ownerId !== user.id) {
    throw new AppError(403, "Forbidden");
  }
}
