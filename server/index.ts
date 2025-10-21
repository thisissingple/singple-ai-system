import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import dotenv from "dotenv";
import { startAutoAnalyzer, stopAutoAnalyzer } from "./services/teaching-quality-auto-analyzer";

/**
 * Load environment variables from .env file
 * This is required for local/Replit development where .env is not auto-loaded
 *
 * override: true - 強制使用 .env 的值覆蓋 Replit Secrets
 * 這樣可以確保認證系統正常啟用（SKIP_AUTH=false）
 */
dotenv.config({ override: true });

// Debug: Log SKIP_AUTH status on startup
console.log('🔧 Environment Configuration:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`   SKIP_AUTH: ${process.env.SKIP_AUTH || 'not set'}`);
console.log(`   PORT: ${process.env.PORT || 'not set'}`);

/**
 * ⚠️ REPLIT PROJECT NOTICE ⚠️
 * This server is designed to run on Replit environment.
 * PORT must be provided by Replit - do not hardcode any port values.
 * Replit automatically assigns PORT environment variable.
 */

// Graceful shutdown handlers for Replit
process.on('SIGTERM', () => {
  log('Received SIGTERM, shutting down gracefully...');
  stopAutoAnalyzer();
  process.exit(0);
});

process.on('SIGINT', () => {
  log('Received SIGINT, shutting down gracefully...');
  stopAutoAnalyzer();
  process.exit(0);
});

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error('Error handler caught:', err);
    res.status(status).json({
      success: false,
      error: message,
      details: err.errors || undefined
    });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || '5000', 10);

  server.listen(port, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${port}`);

    // Auto-analyzer disabled due to database connection mode incompatibility
    // Transaction mode pooler doesn't support features needed by auto-analyzer
    // startAutoAnalyzer();
  });
})();
