import { Router } from "express";
import { login, refresh } from "../controllers/auth.controller";

export const authRouter = Router();

authRouter.post("/login", login);
authRouter.post("/refresh", refresh);
