import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import "dotenv/config";

// Initialize Neon client
const sql = neon(process.env.DATABASE_URL!);

// Initialize Drizzle with Neon
export const db = drizzle(sql);
