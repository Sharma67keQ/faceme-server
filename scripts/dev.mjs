import { spawn } from "node:child_process";
import process from "node:process";

const processes = [
  {
    name: "server",
    color: "\x1b[36m",
    command: "npm --prefix server run dev",
  },
  {
    name: "mobile",
    color: "\x1b[35m",
    command: "npm --prefix mobile run start",
  },
];

const reset = "\x1b[0m";
const children = [];
let shuttingDown = false;

const pipeOutput = (child, name, color, stream) => {
  stream?.on("data", (chunk) => {
    const text = chunk.toString();
    const lines = text.split(/\r?\n/);

    for (const line of lines) {
      if (!line) {
        continue;
      }

      process.stdout.write(`${color}[${name}]${reset} ${line}\n`);
    }
  });
};

const shutdown = (code = 0) => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGINT");
    }
  }

  setTimeout(() => process.exit(code), 300);
};

for (const entry of processes) {
  const child = spawn(entry.command, {
    stdio: ["inherit", "pipe", "pipe"],
    shell: true,
  });

  children.push(child);
  pipeOutput(child, entry.name, entry.color, child.stdout);
  pipeOutput(child, entry.name, entry.color, child.stderr);

  child.on("exit", (code) => {
    if (!shuttingDown) {
      shutdown(code ?? 1);
    }
  });
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
