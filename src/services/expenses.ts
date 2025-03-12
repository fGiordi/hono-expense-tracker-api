import { NeonDatabase } from "drizzle-orm/neon-serverless"; // Adjust based on your DB type
import { expenses } from "../db/schema"; // Import the expenses schema
import { eq } from "drizzle-orm";

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
}

export class ExpenseService {
  // Automatically categorize a transaction based on its description
  // public categorizeTransaction(description: string): string {
  //   const lowerCaseDescription = description.toLocaleLowerCase();

  //   for (const [category, keywords] of Object.entries(categories)) {
  //     if (keywords.some((keyword) => lowerCaseDescription.includes(keyword))) {
  //       return category;
  //     }
  //   }

  //   return "Miscellaneous"; // Default category
  // }

  // Create a new expense
  public async createExpense(
    db: NeonDatabase,
    description: string,
    amount: number,
    userId: number,
    category: Category
  ) {
    const [newExpense] = await db
      .insert(expenses)
      .values({
        description,
        amount,
        category,
        userId,
        createdAt: new Date(),
      })
      .returning();

    return newExpense;
  }

  // Get all expenses for a user
  public async getExpensesByUser(db: NeonDatabase, userId: number) {
    return await db.select().from(expenses).where(eq(expenses.userId, userId));
  }

  // Get a single expense by ID
  public async getExpenseById(db: NeonDatabase, id: number) {
    const [expense] = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, id));
    return expense;
  }

  // Update an expense
  public async updateExpense({
    db,
    id,
    description,
    amount,
    category,
  }: IUpdateExpense) {
    const [updatedExpense] = await db
      .update(expenses)
      .set({ description, amount, category })
      .where(eq(expenses.id, id))
      .returning();
    return updatedExpense;
  }

  // Delete an expense
  public async deleteExpense(db: NeonDatabase, id: number) {
    const [deletedExpense] = await db
      .delete(expenses)
      .where(eq(expenses.id, id))
      .returning();
    return deletedExpense;
  }
}
