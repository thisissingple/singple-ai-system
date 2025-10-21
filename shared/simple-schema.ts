import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer, decimal, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// 簡化的數據源表 - 支援多個 Google Sheets
export const dataSources = pgTable("data_sources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // 體驗課上課記錄表, 體驗課購買記錄表, EODs for Closers
  type: varchar("type").notNull(), // class_records, purchase_records, consultation_records
  spreadsheetId: text("spreadsheet_id").notNull(),
  worksheetName: text("worksheet_name"), // 工作表名稱
  gid: text("gid"), // Google Sheets worksheet GID
  emailColumn: text("email_column").notNull(), // email 欄位名稱
  dateColumn: text("date_column"), // 日期欄位名稱
  headers: jsonb("headers").$type<string[]>().notNull(),
  isActive: boolean("is_active").default(true),
  lastSyncAt: timestamp("last_sync_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// 統一的原始數據表 - 所有 Google Sheets 數據都存在這裡
export const rawData = pgTable("raw_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dataSourceId: varchar("data_source_id").notNull().references(() => dataSources.id),
  email: text("email").notNull(), // 統一的關聯鍵
  rowData: jsonb("row_data").$type<Record<string, any>>().notNull(), // 原始數據
  extractedDate: timestamp("extracted_date"), // 從數據中提取的日期
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// 報表記錄表 - 存儲已生成的報表
export const reports = pgTable("reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type").notNull(), // daily, weekly
  reportDate: timestamp("report_date").notNull(), // 報表日期
  data: jsonb("data").$type<{
    period: {
      start: string;
      end: string;
    };
    metrics: {
      classCount: number;
      purchaseCount: number;
      dealCount: number;
      totalRevenue: number;
    };
    details: {
      classes: Array<{ email: string; name: string; date: string; teacher: string }>;
      purchases: Array<{ email: string; name: string; date: string; plan: string }>;
      deals: Array<{ email: string; name: string; date: string; amount: number }>;
    };
  }>().notNull(),
  aiInsights: text("ai_insights"), // AI 生成的洞察
  userModifiedInsights: text("user_modified_insights"), // 用戶修改的建議
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Schema 定義
export const insertDataSourceSchema = createInsertSchema(dataSources).omit({
  id: true,
  createdAt: true,
  lastSyncAt: true,
});

export const insertRawDataSchema = createInsertSchema(rawData).omit({
  id: true,
  lastUpdated: true,
});

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type DataSource = typeof dataSources.$inferSelect;
export type InsertDataSource = z.infer<typeof insertDataSourceSchema>;
export type RawData = typeof rawData.$inferSelect;
export type InsertRawData = z.infer<typeof insertRawDataSchema>;
export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;

// 報表請求 schema
export const generateReportSchema = z.object({
  type: z.enum(["daily", "weekly"]),
  date: z.string(), // ISO date string
});

export type GenerateReportRequest = z.infer<typeof generateReportSchema>;

// 數據源配置 schema
export const dataSourceConfigSchema = z.object({
  name: z.string(),
  type: z.enum(["class_records", "purchase_records", "consultation_records"]),
  spreadsheetId: z.string(),
  worksheetName: z.string().optional(),
  gid: z.string().optional(),
  emailColumn: z.string(),
  dateColumn: z.string().optional(),
});

export type DataSourceConfig = z.infer<typeof dataSourceConfigSchema>;

// AI 建議更新 schema
export const updateInsightsSchema = z.object({
  reportId: z.string(),
  insights: z.string(),
});

export type UpdateInsightsRequest = z.infer<typeof updateInsightsSchema>;