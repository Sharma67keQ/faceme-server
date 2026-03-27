import { spawn } from "node:child_process";

const steps = [
  "npm run db:generate",
  "npm run db:migrate",
  "npm run db:seed",
];

const runStep = (command) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, {
      stdio: "inherit",
      shell: true,
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Command failed: ${command}`));
    });
  });

for (const step of steps) {
  await runStep(step);
}
