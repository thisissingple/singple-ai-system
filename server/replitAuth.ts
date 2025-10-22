import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./services/legacy/storage";
import dotenv from "dotenv";

// Load .env file BEFORE checking environment variables
// This is critical for local development where .env is not auto-loaded
dotenv.config({ override: false }); // Don't override if already set

// Skip Replit auth requirements if SKIP_AUTH is enabled
if (!process.env.REPLIT_DOMAINS && process.env.SKIP_AUTH !== 'true') {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week

  let sessionStore;

  // In development, use memory store (Supabase Direct connection may be blocked in Replit)
  // In production, use PostgreSQL session store
  if (process.env.NODE_ENV === 'production' && process.env.SESSION_DB_URL) {
    try {
      const pgStore = connectPg(session);
      sessionStore = new pgStore({
        conString: process.env.SESSION_DB_URL,
        createTableIfMissing: false,
        ttl: sessionTtl,
        tableName: "sessions",
      });
      console.log("✓ Using PostgreSQL session store");
    } catch (error) {
      console.warn("⚠️  PostgreSQL session store failed, using memory store");
    }
  } else {
    console.log("ℹ️  Using memory session store (development mode)");
  }

  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      // 'none' 允許在 Replit iframe 中使用，但安全性較低
      // 'lax' 更安全但會被 iframe 阻擋
      sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'none',
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  // Check if this is the first user (bootstrap admin)
  const existingUsers = await storage.listUsers();
  const isFirstUser = existingUsers.length === 0;
  
  // Super admin email (hardcoded for security)
  const SUPER_ADMIN_EMAIL = "xk4xk4563022@gmail.com";
  
  // Check if this user should be an admin
  const isBootstrapAdmin = process.env.ADMIN_EMAIL && claims["email"] === process.env.ADMIN_EMAIL;
  const isSuperAdmin = claims["email"] === SUPER_ADMIN_EMAIL;
  
  // Determine role and status
  const role = (isFirstUser || isBootstrapAdmin || isSuperAdmin) ? "admin" : "user";
  const status = (isFirstUser || isBootstrapAdmin || isSuperAdmin) ? "active" : "pending_approval";
  
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
    role: role,
    status: status,
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Skip OIDC setup if authentication is disabled
  if (process.env.SKIP_AUTH === 'true') {
    console.log("⚠️  Authentication disabled (SKIP_AUTH=true) - Development mode only!");
    return;
  }

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // Skip authentication in development mode if SKIP_AUTH is enabled
  if (process.env.SKIP_AUTH === 'true') {
    // 設定模擬的 Admin 使用者
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

  // Check for session-based authentication (password login)
  const sessionUserId = (req as any).session?.userId;
  const sessionUser = (req as any).session?.user;

  if (sessionUserId && sessionUser) {
    // 設定 req.user 供其他 API 使用
    (req as any).user = sessionUser;
    console.log(`[AUTH] ✅ Session authenticated: ${sessionUserId} for ${req.method} ${req.path}`);
    return next();
  }

  // Check for OAuth authentication (Replit OAuth)
  const user = req.user as any;

  if (!req.isAuthenticated() || !user?.expires_at) {
    console.log(`[AUTH] ❌ Unauthorized access attempt to ${req.method} ${req.path}`);
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    console.log(`[AUTH] ✅ OAuth authenticated for ${req.method} ${req.path}`);
    return next();
  }

  // Try to refresh OAuth token
  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    console.log(`[AUTH] ✅ OAuth token refreshed for ${req.method} ${req.path}`);
    return next();
  } catch (error) {
    console.log(`[AUTH] ❌ OAuth token refresh failed for ${req.method} ${req.path}`);
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};

// Permission middleware for role-based access
export const requireRole = (...roles: string[]): RequestHandler => {
  return async (req, res, next) => {
    // Skip auth in development mode
    if (process.env.SKIP_AUTH === 'true') {
      console.log(`[DEV MODE] 🔓 Skipping role check for ${req.method} ${req.path}`);
      return next();
    }

    const user = (req as any).user;

    // Support both OAuth (old) and Session (new) authentication
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
  const user = req.user as any;
  
  if (!req.isAuthenticated() || !user.claims) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const userId = user.claims.sub;
    const userRecord = await storage.getUser(userId);
    
    if (!userRecord) {
      return res.status(401).json({ message: "User not found" });
    }

    if (userRecord.status !== "active") {
      return res.status(403).json({ 
        message: "Account pending approval", 
        status: userRecord.status,
        role: userRecord.role 
      });
    }

    // Add user record to request for easy access
    (req as any).userRecord = userRecord;
    next();
  } catch (error) {
    console.error('Error checking user status:', error);
    res.status(500).json({ message: "Internal server error" });
  }
};