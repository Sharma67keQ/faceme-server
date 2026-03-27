type LogLevel = "debug" | "info" | "warn" | "error";

const levelWeight: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const configuredLevel = ((process.env.LOG_LEVEL ?? "info").toLowerCase() as LogLevel);

const shouldLog = (level: LogLevel) =>
  levelWeight[level] >= levelWeight[configuredLevel] || level === "error";

const writeLog = (level: LogLevel, message: string, meta?: Record<string, unknown>) => {
  if (!shouldLog(level)) {
    return;
  }

  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };

  const serialized = JSON.stringify(payload);

  if (level === "error") {
    console.error(serialized);
    return;
  }

  console.log(serialized);
};

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => writeLog("debug", message, meta),
  info: (message: string, meta?: Record<string, unknown>) => writeLog("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => writeLog("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => writeLog("error", message, meta),
};
