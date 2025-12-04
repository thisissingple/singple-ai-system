import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic, log } from "./static";
import dotenv from "dotenv";
import { startAutoAnalyzer, stopAutoAnalyzer } from "./services/teaching-quality-auto-analyzer";
import { startScheduler, stopScheduler } from "./services/sheets/scheduler";
import { startTrelloScheduler, stopTrelloScheduler } from "./services/trello-scheduler";

/**
 * Load environment variables from .env file
 * This is required for local development where .env is not auto-loaded
 *
 * override: true - Force .env values to take precedence
 * This ensures authentication system works correctly
 */
dotenv.config({ override: true });

// Debug: Log SKIP_AUTH status on startup
console.log('🔧 Environment Configuration:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`   SKIP_AUTH: ${process.env.SKIP_AUTH || 'not set'}`);
console.log(`   PORT: ${process.env.PORT || 'not set'}`);

/**
 * ⚠️ ZEABUR DEPLOYMENT NOTICE ⚠️
 * This server is designed to run on Zeabur platform.
 * PORT can be configured via environment variable (defaults to 5001).
 * Zeabur automatically assigns PORT in production.
 */

// Graceful shutdown handlers
process.on('SIGTERM', () => {
  log('Received SIGTERM, shutting down gracefully...');
  stopAutoAnalyzer();
  stopScheduler();
  process.exit(0);
});

process.on('SIGINT', () => {
  log('Received SIGINT, shutting down gracefully...');
  stopAutoAnalyzer();
  stopScheduler();
  process.exit(0);
});

const app = express();
// 增加請求大小限制到 10MB（支援較長的課程文字檔）
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

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
    // Dynamic import vite only in development to avoid production dependency
    const { setupVite } = await import("./vite");
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

    // Start Google Sheets sync scheduler
    if (process.env.GOOGLE_SHEETS_CREDENTIALS) {
      startScheduler(process.env.GOOGLE_SHEETS_CREDENTIALS);
    } else {
      console.log('⚠️  Google Sheets scheduler not started (GOOGLE_SHEETS_CREDENTIALS not configured)');
    }

    // Start Trello sync scheduler
    startTrelloScheduler().catch((err) => {
      console.error('❌ Trello scheduler start failed:', err.message);
    });
  });
})();
