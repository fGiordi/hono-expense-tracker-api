import {
  pgTable,
  text,
  integer,
  real,
  timestamp,
  serial,
  jsonb,
  uuid,
  boolean,
} from "drizzle-orm/pg-core";

// Define the Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
});

// Define the Groups table
export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdBy: integer("created_by")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Define the GroupMembers table for managing group memberships
export const groupMembers = pgTable("group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id")
    .references(() => groups.id)
    .notNull(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

// Define the GroupInvites table for managing invitations
export const groupInvites = pgTable("group_invites", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id")
    .references(() => groups.id)
    .notNull(),
  invitedEmail: text("invited_email").notNull(),
  invitedBy: integer("invited_by")
    .references(() => users.id)
    .notNull(),
  token: uuid("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
});

// Define the Expenses table with a foreign key to Groups
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  amount: real("amount").notNull(),
  category: text("category"),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  groupId: integer("group_id")
    .references(() => groups.id),  // Optional group ID - if null, it's a personal expense
  createdAt: timestamp("created_at").defaultNow().notNull(),
  date: timestamp("date"),
  tags: jsonb("tags").default("[]").notNull(),
});
