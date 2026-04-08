import cors from "cors";
import express from "express";
import { apiRouter } from "./routes/index.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { env } from "./lib/env.js";

export const createApp = () => {
  const app = express();

  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.get("/", (_req, res) => {
    res.json({ status: "ok", service: "faceme-server" });
  });

  app.use("/api", apiRouter);

  app.use((_req, res) => {
    res.status(404).json({ message: "Route not found" });
  });

  app.use(errorMiddleware);

  return app;
};
