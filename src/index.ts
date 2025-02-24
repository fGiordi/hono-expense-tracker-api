import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import userRouter from "./routes/user";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";

// Define the environment type
export type Env = {
  DATABASE_URL: string;
};

// Create the Hono app with environment bindings
const app = new Hono<{ Bindings: Env }>();

// Apply CORS middleware
app.use("/*", cors());

// Initialize the Neon DB connection
app.use("*", async (c, next) => {
  const client = new Pool({ connectionString: c.env.DATABASE_URL });
  const db = drizzle(client); // Initialize Drizzle with the Neon DB client
  c.set("db", db); // Attach the database connection to the context
  await next();
});

// Root route
app.get("/", (c) => {
  return c.text("Welcome to the Expense Tracker API!");
});

// Attach the user and expense routers
app.route("/users", userRouter);

export default app;
