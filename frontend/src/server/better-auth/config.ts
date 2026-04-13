import { betterAuth } from "better-auth";
import { SQLiteAdapter } from "better-auth/adapters/sqlite";
import path from "path";

// Store auth database in a persistent volume
const dbPath = process.env.NODE_ENV === "production"
  ? path.join(process.cwd(), ".better-auth", "auth.db")
  : "./auth.db";

export const auth = betterAuth({
  database: new SQLiteAdapter({
    path: dbPath,
  }),
  emailAndPassword: {
    enabled: true,
  },
});

export type Session = typeof auth.$Infer.Session;
