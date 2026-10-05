import { Router } from "express";
import {
  bulkUpdateTasks,
  createTask,
  deleteTask,
  listTasks,
  updateTask,
} from "../controllers/task.controller";
import { requireAuth } from "../middleware/auth.middleware";

export const taskRouter = Router();

taskRouter.use(requireAuth);
taskRouter.get("/", listTasks);
taskRouter.post("/", createTask);
taskRouter.patch("/bulk", bulkUpdateTasks);
taskRouter.patch("/:id", updateTask);
taskRouter.delete("/:id", deleteTask);
