import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import dotenv from "dotenv";
import pg from "pg";

// Load .env file BEFORE checking environment variables
// This is critical for local development where .env is not auto-loaded
dotenv.config({ override: false }); // Don't override if already set

// 🔧 全局變數：用於儲存 session store 初始化結果
let sessionStoreInitialized = false;
let sessionStoreInstance: any = undefined;

/**
 * 非同步初始化 PostgreSQL session store
 * 必須在 getSession() 之前呼叫
 */
export async function initSessionStore(): Promise<void> {
  if (sessionStoreInitialized) {
    return;
  }

  const dbUrl = process.env.SUPABASE_SESSION_DB_URL || process.env.SESSION_DB_URL || process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

  if (!dbUrl) {
    console.log("ℹ️  No database URL configured, using memory session store");
    console.warn("⚠️  Session will be lost on server restart");
    sessionStoreInitialized = true;
    return;
  }

  console.log("🔌 Testing database connection for session store...");

  try {
    // 🔧 先測試連線是否可用
    const testPool = new pg.Pool({
      connectionString: dbUrl,
      max: 1,
      connectionTimeoutMillis: 5000, // 5 秒測試超時
    });

    // 🛡️ 防止 pooler 斷線導致 Node.js 崩潰
    testPool.on('error', (err) => {
      console.error('⚠️  Test pool error (ignored):', err.message);
    });

    // 測試連線
    const client = await testPool.connect();
    await client.query('SELECT 1');
    client.release();
    await testPool.end();

    console.log("✅ Database connection test passed");

    // 連線測試成功，建立實際的 session store
    const pgStore = connectPg(session);
    const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week

    const pool = new pg.Pool({
      connectionString: dbUrl,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on('error', (err) => {
      console.error('⚠️  Session store pool error (will reconnect):', err.message);
    });

    sessionStoreInstance = new pgStore({
      pool: pool,
      createTableIfMissing: true,
      ttl: sessionTtl,
      tableName: "sessions",
      pruneSessionInterval: 60 * 15,
      errorLog: (err: Error) => {
        console.error('⚠️  Session store error:', err.message);
      },
    });

    console.log("✓ Using PostgreSQL session store (persistent across restarts)");
  } catch (error: any) {
    console.error("⚠️  Database connection failed:", error.message);
    console.warn("⚠️  Falling back to memory session store");
    console.warn("ℹ️  Session will be lost on server restart");
    sessionStoreInstance = undefined;
  }

  sessionStoreInitialized = true;
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week

  // 如果尚未初始化（同步呼叫），使用 memory store
  if (!sessionStoreInitialized) {
    console.warn("⚠️  getSession() called before initSessionStore(), using memory store");
  }

  return session({
    secret: process.env.SESSION_SECRET || 'dev-session-secret-' + Math.random().toString(36).substring(7),
    store: sessionStoreInstance,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'lax', // 使用 'lax' 以支援手機瀏覽器（zeabur.app 同域不需要 'none'）
      maxAge: sessionTtl,
      path: '/', // Ensure cookie is available for all paths
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  console.log("✓ Session-based authentication initialized");

  // Simple logout endpoint
  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ success: true, message: "Logged out successfully" });
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // Skip authentication in development mode if SKIP_AUTH is enabled
  if (process.env.SKIP_AUTH === 'true') {
    // Mock admin user for development
    (req as any).user = {
      id: 'admin-test-123',
      email: 'admin@example.com',
      first_name: 'Admin',
      last_name: 'User',
      role: 'admin',
      roles: ['admin'],
      status: 'active',
    };
    console.log(`[DEV MODE] 🔓 Skipping authentication for ${req.method} ${req.path}`);
    return next();
  }

  // Check for session-based authentication
  const sessionUserId = (req as any).session?.userId;
  const sessionUser = (req as any).session?.user;

  if (sessionUserId && sessionUser) {
    // Set req.user for other APIs
    (req as any).user = sessionUser;
    console.log(`[AUTH] ✅ Session authenticated: ${sessionUserId} for ${req.method} ${req.path}`);
    return next();
  }

  console.log(`[AUTH] ❌ Unauthorized access attempt to ${req.method} ${req.path}`);
  return res.status(401).json({ message: "Unauthorized" });
};

// Permission middleware for role-based access
export const requireRole = (...roles: string[]): RequestHandler => {
  return async (req, res, next) => {
    // Skip auth in development mode
    if (process.env.SKIP_AUTH === 'true') {
      console.log(`[DEV MODE] 🔓 Skipping role check for ${req.method} ${req.path}`);
      return next();
    }

    // Wait for session to be loaded (if still loading)
    await new Promise<void>((resolve) => {
      if ((req as any).session !== undefined) {
        resolve();
      } else {
        // Session not ready yet, wait a bit
        setTimeout(resolve, 50);
      }
    });

    // Check for session-based authentication first
    const sessionUserId = (req as any).session?.userId;
    const sessionUser = (req as any).session?.user;

    if (!sessionUserId || !sessionUser) {
      console.log(`[AUTH] ❌ No session found for ${req.method} ${req.path}`);
      console.log(`[AUTH] Session debug:`, {
        hasSession: !!(req as any).session,
        sessionId: (req as any).session?.id,
        sessionUserId: sessionUserId,
        hasUser: !!sessionUser,
        cookies: req.headers.cookie ? 'present' : 'missing',
      });
      return res.status(401).json({ message: "Unauthorized - No session" });
    }

    // Set req.user if not already set by isAuthenticated
    if (!(req as any).user) {
      (req as any).user = sessionUser;
    }

    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({ message: "Unauthorized - No user found" });
    }

    try {
      // Check if user has required role (support both 'role' and 'roles' array)
      const userRole = user.role;
      const userRoles = user.roles || [];

      const hasRole = roles.some(role =>
        role === userRole || userRoles.includes(role)
      );

      if (!hasRole) {
        console.log(`[AUTH] ❌ User ${user.email} lacks required role. Has: ${userRole}/${userRoles.join(',')}, Needs: ${roles.join(',')}`);
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      console.log(`[AUTH] ✅ User ${user.email} has required role: ${roles.join(',')}`);
      next();
    } catch (error) {
      console.error('Error checking user role:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
};

// Admin only middleware
export const requireAdmin = requireRole("admin", "manager");

// Require active user (not pending approval)
export const requireActiveUser: RequestHandler = async (req, res, next) => {
  // Skip in development mode
  if (process.env.SKIP_AUTH === 'true') {
    return next();
  }

  const user = (req as any).user;

  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (user.status !== "active") {
    return res.status(403).json({
      message: "Account pending approval",
      status: user.status,
      role: user.role
    });
  }

  next();
};
