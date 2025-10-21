import { sql } from "drizzle-orm";
import { pgTable, text, uuid, timestamp, jsonb, integer, boolean, index, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================
// IMPORTANT: All schemas use snake_case to match Supabase
// This is the single source of truth for database schema
// ============================================

// ========================================
// 1. Users & Authentication
// ========================================

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("user"),
  department: varchar("department"),
  status: varchar("status").default("active"),
  teacherId: text("teacher_id"),
  salesId: text("sales_id"),
  departmentId: uuid("department_id"),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const sessions = pgTable("sessions", {
  sid: varchar("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire", { withTimezone: true }).notNull(),
});

export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  permissions: jsonb("permissions").notNull().default(sql`'[]'::jsonb`),
  spreadsheetAccess: jsonb("spreadsheet_access").notNull().default(sql`'[]'::jsonb`),
  canManageUsers: boolean("can_manage_users").default(false),
  canViewAllData: boolean("can_view_all_data").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ========================================
// 2. Google OAuth Tokens
// ========================================

export const googleOauthTokens = pgTable("google_oauth_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  tokenType: text("token_type").default("Bearer"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  scope: text("scope"),
  isValid: boolean("is_valid").default(true),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ========================================
// 3. Spreadsheets & Worksheets
// ========================================

export const spreadsheets = pgTable("spreadsheets", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  spreadsheetId: text("spreadsheet_id").notNull().unique(), // Google Sheets ID
  spreadsheetUrl: text("spreadsheet_url"),
  range: text("range").default("A1:Z1000"),
  ownerUserId: uuid("owner_user_id").references(() => users.id, { onDelete: "set null" }),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }).defaultNow(),
  headers: jsonb("headers").$type<string[] | null>(),
  rowCount: integer("row_count").default(0),

  // Sync settings
  syncFrequencyMinutes: integer("sync_frequency_minutes").default(60),
  isAutoSyncEnabled: boolean("is_auto_sync_enabled").default(true),
  syncStatus: varchar("sync_status").default("pending"),
  lastSyncError: text("last_sync_error"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const userSpreadsheets = pgTable("user_spreadsheets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  spreadsheetId: uuid("spreadsheet_id").notNull().references(() => spreadsheets.id, { onDelete: "cascade" }),
  permission: text("permission").notNull(), // 'owner', 'editor', 'viewer'
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const worksheets = pgTable("worksheets", {
  id: uuid("id").primaryKey().defaultRandom(),
  spreadsheetId: uuid("spreadsheet_id").notNull().references(() => spreadsheets.id, { onDelete: "cascade" }),
  worksheetName: text("worksheet_name").notNull(),
  gid: text("gid").notNull(),
  isEnabled: boolean("is_enabled").default(true),
  range: text("range").default("A1:Z1000"),
  headers: jsonb("headers").$type<string[] | null>(),
  rowCount: integer("row_count").default(0),
  supabaseTable: text("supabase_table"), // Target table: trial_class_attendance, etc.
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const sheetData = pgTable("sheet_data", {
  id: uuid("id").primaryKey().defaultRandom(),
  spreadsheetId: uuid("spreadsheet_id").notNull().references(() => spreadsheets.id, { onDelete: "cascade" }),
  worksheetId: uuid("worksheet_id").references(() => worksheets.id, { onDelete: "cascade" }),
  rowIndex: integer("row_index").notNull(),
  data: jsonb("data").$type<Record<string, any>>().notNull(),
  lastUpdated: timestamp("last_updated", { withTimezone: true }).defaultNow(),
});

export const syncHistory = pgTable("sync_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  spreadsheetId: uuid("spreadsheet_id").notNull().references(() => spreadsheets.id, { onDelete: "cascade" }),
  worksheetId: uuid("worksheet_id").references(() => worksheets.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  status: varchar("status").notNull().default("running"), // running, success, failed
  rowsSynced: integer("rows_synced").default(0),
  errorMessage: text("error_message"),
  syncedBy: uuid("synced_by").references(() => users.id, { onDelete: "set null" }),
});

// ========================================
// 4. Dashboard Templates & Custom Dashboards
// ========================================

export const dashboardTemplates = pgTable("dashboard_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  type: varchar("type").notNull(),
  description: text("description"),
  config: jsonb("config").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const customDashboards = pgTable("custom_dashboards", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  templateId: uuid("template_id").references(() => dashboardTemplates.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  config: jsonb("config").notNull(),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ========================================
// 5. Business Data Tables (Already in Supabase)
// ========================================

export const trialClassAttendance = pgTable("trial_class_attendance", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Core tracking fields
  studentEmail: text("student_email"),
  rawData: jsonb("raw_data").notNull().default(sql`'{}'::jsonb`),
  sourceWorksheetId: uuid("source_worksheet_id").references(() => worksheets.id, { onDelete: "set null" }),
  originRowIndex: integer("origin_row_index"),
  syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow(),
  // Common fields (cached for easier querying)
  studentName: text("student_name"),
  classDate: timestamp("class_date", { withTimezone: true }),
  teacherName: text("teacher_name"),
  notes: text("notes"),
  teacherId: text("teacher_id"),
  salesId: text("sales_id"),
  departmentId: uuid("department_id"),
  // Business logic fields
  isReviewed: boolean("is_reviewed").default(false),
  noConversionReason: text("no_conversion_reason"),
  classTranscript: text("class_transcript"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const trialClassPurchase = pgTable("trial_class_purchase", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Core tracking fields
  studentEmail: text("student_email"),
  rawData: jsonb("raw_data").notNull().default(sql`'{}'::jsonb`),
  sourceWorksheetId: uuid("source_worksheet_id").references(() => worksheets.id, { onDelete: "set null" }),
  originRowIndex: integer("origin_row_index"),
  syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow(),
  // Common fields (cached for easier querying)
  studentName: text("student_name"),
  purchaseDate: timestamp("purchase_date", { withTimezone: true }),
  packageName: text("package_name"),
  packagePrice: integer("package_price"),
  notes: text("notes"),
  teacherId: text("teacher_id"),
  salesId: text("sales_id"),
  departmentId: uuid("department_id"),
  // Business logic fields
  age: integer("age"),
  occupation: text("occupation"),
  trialClassesTotal: integer("trial_classes_total").default(0),
  remainingClasses: integer("remaining_classes").default(0),
  currentStatus: text("current_status"),
  updatedDate: timestamp("updated_date", { withTimezone: true }),
  lastClassDate: timestamp("last_class_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const eodsForClosers = pgTable("eods_for_closers", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Core tracking fields
  studentName: text("student_name"),
  studentEmail: text("student_email"),
  rawData: jsonb("raw_data").notNull().default(sql`'{}'::jsonb`),
  sourceWorksheetId: uuid("source_worksheet_id").references(() => worksheets.id, { onDelete: "set null" }),
  originRowIndex: integer("origin_row_index"),
  syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow(),
  // Common fields (cached for easier querying)
  reportDate: timestamp("report_date", { withTimezone: true }),
  closerName: text("closer_name"),
  notes: text("notes"),
  closerId: text("closer_id"),
  setterId: text("setter_id"),
  departmentId: uuid("department_id"),
  // Business logic fields
  callerName: text("caller_name"),
  isOnline: boolean("is_online").default(false),
  leadSource: text("lead_source"),
  consultationResult: text("consultation_result"),
  dealPackage: text("deal_package"),
  packageQuantity: integer("package_quantity").default(0),
  paymentMethod: text("payment_method"),
  installmentPeriods: integer("installment_periods").default(0),
  packagePrice: integer("package_price"),
  actualAmount: integer("actual_amount"),
  consultationDate: timestamp("consultation_date", { withTimezone: true }),
  dealDate: timestamp("deal_date", { withTimezone: true }),
  formSubmittedAt: timestamp("form_submitted_at", { withTimezone: true }),
  month: integer("month"),
  year: integer("year"),
  weekNumber: integer("week_number"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ========================================
// Zod Schemas for Validation
// ========================================

export const insertSpreadsheetSchema = createInsertSchema(spreadsheets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorksheetSchema = createInsertSchema(worksheets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSheetDataSchema = createInsertSchema(sheetData).omit({
  id: true,
  lastUpdated: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ========================================
// TypeScript Types
// ========================================

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Spreadsheet = typeof spreadsheets.$inferSelect;
export type InsertSpreadsheet = z.infer<typeof insertSpreadsheetSchema>;

export type Worksheet = typeof worksheets.$inferSelect;
export type InsertWorksheet = z.infer<typeof insertWorksheetSchema>;

export type SheetData = typeof sheetData.$inferSelect;
export type InsertSheetData = z.infer<typeof insertSheetDataSchema>;

export type SyncHistory = typeof syncHistory.$inferSelect;

export type DashboardTemplate = typeof dashboardTemplates.$inferSelect;
export type CustomDashboard = typeof customDashboards.$inferSelect;

export type GoogleOauthToken = typeof googleOauthTokens.$inferSelect;

// ========================================
// Temporary type aliases for compatibility
// ========================================

// WebSocket message type
export type WSMessage = {
  type: string;
  [key: string]: any;  // Allow any additional properties
};

// Purchase and Consultation records (using JSONB data field)
export type PurchaseRecord = {
  id: string;
  data: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
};

export type ConsultationRecord = {
  id: string;
  data: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
};

// Insert schemas for compatibility
export const insertRoleSchema = createInsertSchema(roles).omit({ id: true, createdAt: true });
export const insertCustomDashboardSchema = createInsertSchema(customDashboards).omit({ id: true, createdAt: true, updatedAt: true });

// Placeholder exports for unused features (will return empty/stub from storage)
export type CalculationRule = any;
export type DataSourceMapping = any;
export type DataSourceRelationship = any;
export type MultiSourceAnalytic = any;
export type WorksheetAnalysis = any;
export type AutoGeneratedReport = any;

export const insertCalculationRuleSchema = z.object({});
export const insertDataSourceMappingSchema = z.object({});
export const insertDataSourceRelationshipSchema = z.object({});
export const insertPurchaseRecordSchema = z.object({});
export const insertConsultationRecordSchema = z.object({});
export const insertMultiSourceAnalyticSchema = z.object({});
export const insertWorksheetAnalysisSchema = z.object({});
export const insertAutoGeneratedReportSchema = z.object({});
export const updateDataSourceRelationshipSchema = z.object({});
export const updatePurchaseRecordSchema = z.object({});
export const updateConsultationRecordSchema = z.object({});
export const updateMultiSourceAnalyticSchema = z.object({});
export const enhancedInsertPurchaseRecordSchema = z.object({});
export const enhancedInsertConsultationRecordSchema = z.object({});
