import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import dotenv from "dotenv";

// Load .env file BEFORE checking environment variables
// This is critical for local development where .env is not auto-loaded
dotenv.config({ override: false }); // Don't override if already set

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  // 使用 PostgreSQL session store 以保持 session 在重啟後依然有效
  let sessionStore;

  // 🆕 使用 PostgreSQL session store（開發和生產環境都用）
  // 這樣 nodemon 重啟時 session 不會丟失
  // 優先使用 Session Pooler (port 6543) 避免長時間查詢被中斷
  const dbUrl = process.env.SUPABASE_SESSION_DB_URL || process.env.SESSION_DB_URL || process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

  if (dbUrl) {
    try {
      const pgStore = connectPg(session);
      sessionStore = new pgStore({
        conString: dbUrl,
        createTableIfMissing: true,  // Auto-create table if missing
        ttl: sessionTtl,
        tableName: "sessions",
      });
      console.log("✓ Using PostgreSQL session store (persistent across restarts)");
    } catch (error) {
      console.error("⚠️  PostgreSQL session store error:", error);
      console.warn("⚠️  Falling back to memory session store");
      console.warn("ℹ️  Session will be lost on server restart");
      // Fallback to memory store if PostgreSQL fails
    }
  } else {
    console.log("ℹ️  Using memory session store (development mode)");
    console.warn("⚠️  Session will be lost on server restart");
    console.warn("💡 Tip: Set DATABASE_URL to use persistent sessions");
  }

  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
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
