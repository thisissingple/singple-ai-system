import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export function serveStatic(app: Express) {
  // Use __dirname equivalent for ESM
  const currentDir = path.dirname(new URL(import.meta.url).pathname);
  const distPath = path.resolve(currentDir, "public");

  console.log(`[Static Server] Looking for static files in: ${distPath}`);

  if (!fs.existsSync(distPath)) {
    console.error(`[Static Server] ❌ Build directory not found: ${distPath}`);
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  console.log(`[Static Server] ✅ Serving static files from: ${distPath}`);

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
