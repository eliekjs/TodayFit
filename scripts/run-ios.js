#!/usr/bin/env node

const { execSync, spawn } = require("node:child_process");

const projectRoot = process.cwd();
const preferredPorts = [8081, 8082, 8083];

function getListeningPids(port) {
  try {
    const out = execSync(`lsof -tiTCP:${port} -sTCP:LISTEN`, {
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    }).trim();
    if (!out) return [];
    return out
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function getProcessCommand(pid) {
  try {
    return execSync(`ps -p ${pid} -o command=`, {
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    }).trim();
  } catch {
    return "";
  }
}

function sleep(ms) {
  const shared = new SharedArrayBuffer(4);
  const view = new Int32Array(shared);
  Atomics.wait(view, 0, 0, ms);
}

function stopStaleExpoOnPort(port) {
  const pids = getListeningPids(port);
  const matched = [];

  for (const pid of pids) {
    const command = getProcessCommand(pid);
    const isExpo = command.includes("expo start");
    const isThisProject = command.includes(projectRoot);
    if (isExpo && isThisProject) {
      matched.push(pid);
      try {
        process.stdout.write(`Stopping stale Expo process ${pid} on port ${port}\n`);
        process.kill(Number(pid), "SIGTERM");
      } catch {
        // no-op: if process exits before kill
      }
    }
  }

  if (!matched.length) return;
  sleep(800);

  const remaining = getListeningPids(port);
  for (const pid of remaining) {
    if (!matched.includes(pid)) continue;
    try {
      process.stdout.write(`Force stopping Expo process ${pid} on port ${port}\n`);
      process.kill(Number(pid), "SIGKILL");
    } catch {
      // no-op
    }
  }
}

function pickAvailablePort() {
  for (const port of preferredPorts) {
    if (getListeningPids(port).length === 0) return port;
  }
  return preferredPorts[preferredPorts.length - 1];
}

function runIos() {
  stopStaleExpoOnPort(preferredPorts[0]);
  const port = pickAvailablePort();
  const shouldClear = process.argv.includes("--clear");
  const expoArgs = ["expo", "start", "--ios", "--localhost", "--port", String(port)];
  if (shouldClear) expoArgs.push("--clear");

  const child = spawn(
    "npx",
    expoArgs,
    {
      stdio: "inherit",
      env: {
        ...process.env,
        EXPO_USE_FAST_RESOLVER: "1",
        CI: "false",
      },
    }
  );

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}

runIos();
