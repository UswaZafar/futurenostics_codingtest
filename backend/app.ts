import cors from "cors";
import express from "express";
import { errorHandler } from "./middleware/error.middleware";
import { notFoundHandler } from "./middleware/notFound.middleware";
import { apiRouter } from "./routes";
import { env } from "./utils/env";

export const app = express();

app.use(express.json());
app.use(
  cors({
    origin: env.clientOrigin,
    credentials: true,
  }),
);

app.use(apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);
