import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { config as loadDotEnv } from "dotenv";

const resolveEnvFileCandidates = () => {
  const cwd = process.cwd();
  const nodeEnv = process.env.NODE_ENV ?? "development";

  return [
    path.join(cwd, ".env"),
    path.join(cwd, `.env.${nodeEnv}`),
    path.join(cwd, ".env.local"),
    path.join(cwd, `.env.${nodeEnv}.local`),
  ];
};

export const loadEnvironment = () => {
  for (const file of resolveEnvFileCandidates()) {
    if (!existsSync(file)) {
      continue;
    }

    loadDotEnv({
      path: file,
      override: false,
    });
  }
};
