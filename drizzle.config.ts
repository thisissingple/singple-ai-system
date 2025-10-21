import { defineConfig } from "drizzle-kit";

// ✅ 只使用 Supabase（唯一資料庫）
const databaseUrl = process.env.SUPABASE_DB_URL;

if (!databaseUrl) {
  throw new Error("SUPABASE_DB_URL must be set");
}

console.log('🔧 Drizzle using Supabase ✅');

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
