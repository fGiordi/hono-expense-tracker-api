import { Context, Next } from "hono";
import { NeonDatabase } from "drizzle-orm/neon-serverless";

export function withDb(
  handler: (c: Context, db: NeonDatabase) => Promise<Response>
) {
  return async (c: Context, next: Next) => {
    const db = c.get("db") as NeonDatabase; // Retrieve the database connection
    return await handler(c, db); // Pass the database connection to the handler
  };
}
