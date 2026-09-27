import { defineConfig } from "prisma/config";

// Next.js reads .env.local itself; the Prisma CLI doesn't.
try {
  process.loadEnvFile(".env.local");
} catch {}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Migrations need a direct (session) connection; the app uses the pooled DATABASE_URL.
  datasource: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL },
});
