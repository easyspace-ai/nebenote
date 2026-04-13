import { betterAuth } from "better-auth";
import path from "path";

// better-auth v1.x defaults to SQLite database
// We just need to change the path to a writable persistent location
const config: any = {
  emailAndPassword: {
    enabled: true,
  },
};

// In production, store database in a persistent volume that's mounted from host
if (process.env.NODE_ENV === "production") {
  config.database = {
    path: path.join(process.cwd(), ".better-auth", "auth.db"),
  };
}

export const auth = betterAuth(config);

export type Session = typeof auth.$Infer.Session;
