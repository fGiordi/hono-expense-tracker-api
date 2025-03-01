import {
  pgTable,
  text,
  integer,
  real,
  timestamp,
  serial,
} from "drizzle-orm/pg-core";

// Define the Expenses table with a foreign key to Users
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  amount: real("amount").notNull(), // Use real for monetary values
  category: text("category"),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(), // Timestamp for when the expense was created
});

// Define the Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(), // Auto-generated ID
  username: text("username").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
});
