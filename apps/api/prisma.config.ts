import { createRequire } from "node:module";
import { resolve } from "node:path";
import { defineConfig } from "prisma/config";

const require = createRequire(import.meta.url);
try {
  require("dotenv").config({ path: resolve(__dirname, "../../.env") });
  require("dotenv").config({ path: resolve(__dirname, ".env.local"), override: true });
} catch {
  // production Docker image: DATABASE_URL comes from container env
}

const defaultDatabaseUrl =
  "postgresql://timefairy:timefairy@localhost:5432/timefairy?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed:
      'ts-node --compiler-options {"module":"CommonJS"} prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? defaultDatabaseUrl,
  },
});
