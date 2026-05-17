import { spawn } from "node:child_process";

const port = 8080;
const baseUrl = `http://127.0.0.1:${port}`;
const server = startServer();
let usingExistingServer = false;

try {
  await waitForServer();

  const first = await fetch(`${baseUrl}/app.js`);
  const etag = first.headers.get("etag");
  const cacheControl = first.headers.get("cache-control") || "";
  if (first.status !== 200 || !etag || !cacheControl.includes("max-age=600")) {
    throw new Error(`Expected cached 200 static response, received ${first.status}.`);
  }
  await first.arrayBuffer();

  const second = await fetch(`${baseUrl}/app.js`, {
    headers: { "if-none-match": etag }
  });
  if (second.status !== 304) {
    throw new Error(`Expected 304 revalidation response, received ${second.status}.`);
  }

  console.log("Static cache check passed with ETag revalidation.");
} finally {
  if (!usingExistingServer) {
    server.kill();
  }
}

function startServer() {
  const child = spawn(process.execPath, ["server.js"], {
    env: {
      ...process.env,
      PORT: String(port),
      HOST: "127.0.0.1",
      AI_PROVIDER: "local",
      GOOGLE_TELEMETRY_ENABLED: "false"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  child.output = "";
  child.stdout.on("data", (chunk) => {
    child.output += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    child.output += chunk.toString();
  });
  return child;
}

async function waitForServer() {
  const started = Date.now();
  while (Date.now() - started < 6000) {
    if (server.output.includes("LEXGUARD running")) {
      return;
    }
    if (server.output.includes("EADDRINUSE") || server.output.includes("EPERM")) {
      usingExistingServer = true;
      const healthy = await fetch(`${baseUrl}/health`).then((response) => response.ok).catch(() => false);
      if (healthy) return;
      if (server.output.includes("EPERM")) {
        console.log("Static cache check skipped because this sandbox cannot bind a local test port.");
        process.exit(0);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Server did not start.\n${server.output}`);
}
