import { Router } from "express";
import { authRouter } from "./auth.routes";
import { healthRouter } from "./health.routes";
import { taskRouter } from "./task.routes";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/tasks", taskRouter);
