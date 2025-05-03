import { NeonDatabase } from "drizzle-orm/neon-serverless"; // Adjust based on your DB type
import { expenses, groupMembers } from "../db/schema"; // Import the expenses and groupMembers schema
import { eq, sql, and, desc, isNull } from "drizzle-orm";

export enum Category {
  Food = "Food",
  Transportation = "Transportation",
  Utilities = "Utilities",
  Entertainment = "Entertainment",
  Shopping = "Shopping",
  Health = "Health",
  Travel = "Travel",
  Education = "Education",
  Miscellaneous = "Miscellaneous",
  Housing = "Housing",
  Insurance = "Insurance",
  PersonalCare = "PersonalCare",
  Subscriptions = "Subscriptions",
  GiftsAndDonations = "GiftsAndDonations",
  WorkRelated = "WorkRelated",
}

export const categoryValues = Object.values(Category);

// Array of category values

interface IUpdateExpense {
  db: NeonDatabase;
  id: number;
  description?: string;
  amount?: number;
  category?: string;
  tags: []; // Array of tags
  date: Date;
}

type CategorySummary = {
  category: string;
  total: number;
};

export class ExpenseService {
  // Automatically categorize a transaction based on its description

  // Create a new expense
  async createExpense(
    db: NeonDatabase,
    description: string,
    amount: number,
    userId: number,
    category?: string,
    tags: string[] = [],
    date?: string,
    groupId?: number
  ) {
    // If groupId is provided, verify user is a member of the group
    if (groupId) {
      const isMember = await db
        .select()
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, groupId),
            eq(groupMembers.userId, userId)
          )
        )
        .limit(1);

      if (!isMember.length) {
        throw new Error("User is not a member of this group");
      }
    }

    const [newExpense] = await db
      .insert(expenses)
      .values({
        description,
        amount,
        userId,
        category,
        tags,
        date: date ? new Date(date) : new Date(),
        groupId,
      })
      .returning();

    return newExpense;
  }

  // Get all expenses for a user (including group expenses they have access to)
  async getExpensesByUser(db: NeonDatabase, userId: number) {
    // Get personal expenses
    const userExpenses = await db
      .select()
      .from(expenses)
      .where(and(eq(expenses.userId, userId), isNull(expenses.groupId)))
      .orderBy(desc(expenses.date));

    // Get group expenses
    const groupExpenses = await db
      .select({
        expenses: expenses,
      })
      .from(expenses)
      .innerJoin(
        groupMembers,
        and(
          eq(expenses.groupId, groupMembers.groupId),
          eq(groupMembers.userId, userId)
        )
      )
      .orderBy(desc(expenses.date));

    // Combine and return all expenses
    return [...userExpenses, ...groupExpenses.map((ge) => ge.expenses)];
  }

  // Get expenses for a specific group
  async getGroupExpenses(db: NeonDatabase, groupId: number, userId: number) {
    // Verify user is a member of the group
    const isMember = await db
      .select()
      .from(groupMembers)
      .where(
        and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId))
      )
      .limit(1);

    if (!isMember.length) {
      throw new Error("User is not a member of this group");
    }

    return await db
      .select()
      .from(expenses)
      .where(eq(expenses.groupId, groupId))
      .orderBy(desc(expenses.date));
  }

  // Get category summary for a user (including group expenses)
  async getCategorySummary(db: NeonDatabase, userId: number) {
    const allExpenses = await this.getExpensesByUser(db, userId);

    const summary: Record<string, { total: number; count: number }> = {};

    for (const expense of allExpenses) {
      const category = expense.category || "Uncategorized";
      if (!summary[category]) {
        summary[category] = { total: 0, count: 0 };
      }
      summary[category].total += expense.amount;
      summary[category].count += 1;
    }

    return summary;
  }

  // Get a single expense by ID
  async getExpenseById(db: NeonDatabase, expenseId: number, userId: number) {
    const [expense] = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, expenseId));

    if (!expense) {
      return null;
    }

    // Check if user has permission to view this expense
    if (expense.groupId) {
      const isMember = await db
        .select()
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, expense.groupId),
            eq(groupMembers.userId, userId)
          )
        )
        .limit(1);

      if (!isMember.length) {
        throw new Error("User does not have permission to view this expense");
      }
    } else if (expense.userId !== userId) {
      throw new Error("User does not have permission to view this expense");
    }

    return expense;
  }

  // Update an expense
  async updateExpense(
    db: NeonDatabase,
    expenseId: number,
    userId: number,
    updates: {
      description?: string;
      amount?: number;
      category?: string;
      tags?: string[];
      date?: string;
    }
  ) {
    // First, get the expense to check permissions
    const [expense] = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, expenseId));

    if (!expense) {
      throw new Error("Expense not found");
    }

    // Check if user has permission to update this expense
    if (expense.groupId) {
      const isMember = await db
        .select()
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, expense.groupId),
            eq(groupMembers.userId, userId)
          )
        )
        .limit(1);

      if (!isMember.length) {
        throw new Error("User does not have permission to update this expense");
      }
    } else if (expense.userId !== userId) {
      throw new Error("User does not have permission to update this expense");
    }

    // Apply updates
    const [updatedExpense] = await db
      .update(expenses)
      .set({
        ...updates,
        date: updates.date ? new Date(updates.date) : undefined,
      })
      .where(eq(expenses.id, expenseId))
      .returning();

    return updatedExpense;
  }

  // Delete an expense
  async deleteExpense(db: NeonDatabase, expenseId: number, userId: number) {
    // First, get the expense to check permissions
    const [expense] = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, expenseId));

    if (!expense) {
      throw new Error("Expense not found");
    }

    // Check if user has permission to delete this expense
    if (expense.groupId) {
      const isMember = await db
        .select()
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, expense.groupId),
            eq(groupMembers.userId, userId)
          )
        )
        .limit(1);

      if (!isMember.length) {
        throw new Error("User does not have permission to delete this expense");
      }
    } else if (expense.userId !== userId) {
      throw new Error("User does not have permission to delete this expense");
    }

    // Delete the expense
    const [deletedExpense] = await db
      .delete(expenses)
      .where(eq(expenses.id, expenseId))
      .returning();

    return deletedExpense;
  }
}
