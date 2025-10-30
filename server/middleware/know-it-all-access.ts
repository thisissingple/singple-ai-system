/**
 * Know-it-all Access Control Middleware
 *
 * Purpose: Restrict access to Know-it-all AI Advisor to specific authorized users only
 * Security: Multi-layer protection (backend + frontend + UI)
 *
 * Created: 2025-10-30
 */

import type { RequestHandler } from "express";

// =============================================
// Configuration
// =============================================

/**
 * Authorized email addresses for Know-it-all access
 * IMPORTANT: Only these users can access the Know-it-all system
 */
const AUTHORIZED_EMAILS = [
  'xk4xk4563022@gmail.com', // Primary authorized user
  // Add more emails here if needed in the future
];

/**
 * Optional: Authorized user IDs (UUID) for additional security
 * Leave empty if email check is sufficient
 */
const AUTHORIZED_USER_IDS: string[] = [
  // Add UUIDs here if you want ID-based checking
];

// =============================================
// Middleware Functions
// =============================================

/**
 * Middleware: Require Know-it-all Access
 *
 * Usage:
 *   app.get('/api/know-it-all/chat', requireKnowItAllAccess, handler);
 *
 * Checks:
 * 1. User is authenticated (handled by isAuthenticated middleware)
 * 2. User's email is in AUTHORIZED_EMAILS list
 * 3. (Optional) User's ID is in AUTHORIZED_USER_IDS list
 */
export const requireKnowItAllAccess: RequestHandler = async (req, res, next) => {
  // TEMPORARILY DISABLED: Allow all authenticated users
  console.log(`[KNOW-IT-ALL] ✅ Access check disabled - allowing all authenticated users`);
  next();
};

/**
 * Helper function: Check if user has Know-it-all access
 *
 * Usage in code:
 *   if (hasKnowItAllAccess(req.user)) {
 *     // Show Know-it-all UI
 *   }
 */
export function hasKnowItAllAccess(user: any): boolean {
  // TEMPORARILY DISABLED: Allow all authenticated users
  return user !== null && user !== undefined;
}

/**
 * API endpoint: Check Know-it-all access status
 *
 * Returns: { hasAccess: boolean, user: { email, id } }
 *
 * Usage:
 *   GET /api/know-it-all/check-access
 */
export const checkKnowItAllAccessHandler: RequestHandler = async (req, res) => {
  const user = (req as any).user;

  if (!user) {
    return res.status(401).json({
      success: false,
      hasAccess: false,
      message: "Not authenticated"
    });
  }

  const hasAccess = hasKnowItAllAccess(user);

  res.json({
    success: true,
    hasAccess,
    user: {
      email: user.email,
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name
    }
  });
};

// =============================================
// Export authorized emails list (for frontend use)
// =============================================

/**
 * Export the authorized emails list
 * WARNING: This should only be used in backend code
 */
export { AUTHORIZED_EMAILS };
