import { NeonDatabase } from "drizzle-orm/neon-serverless"; // Adjust based on your DB type
import { expenses } from "../db/schema"; // Import the expenses schema
import { eq } from "drizzle-orm";

const categories = {
  Food: [
    "restaurant",
    "cafe",
    "groceries",
    "food",
    "dinner",
    "lunch",
    "breakfast",
  ],
  Transportation: [
    "uber",
    "lyft",
    "taxi",
    "gas",
    "fuel",
    "public transport",
    "metro",
  ],
  Utilities: ["electricity", "water", "internet", "phone", "utility", "bill"],
  Entertainment: ["movie", "netflix", "spotify", "concert", "game", "hobby"],
  Shopping: ["amazon", "clothes", "shoes", "electronics", "store", "mall"],
  Health: ["gym", "pharmacy", "doctor", "hospital", "fitness", "yoga"],
  Travel: ["flight", "hotel", "airbnb", "vacation", "trip", "luggage"],
  Education: ["course", "book", "tuition", "school", "workshop", "seminar"],
  Miscellaneous: ["other", "uncategorized", "misc"],
};

export class ExpenseService {
  // Automatically categorize a transaction based on its description
  public categorizeTransaction(description: string): string {
    const lowerCaseDescription = description.toLowerCase();

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some((keyword) => lowerCaseDescription.includes(keyword))) {
        return category;
      }
    }

    return "Miscellaneous"; // Default category
  }

  // Create a new expense
  public async createExpense(
    db: NeonDatabase,
    description: string,
    amount: number,
    userId: number,
    _category: string
  ) {
    const category = this.categorizeTransaction(description); // Automatically categorize
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
  public async updateExpense(
    db: NeonDatabase,
    id: number,
    description?: string,
    amount?: number
  ) {
    let category: string | undefined;

    if (description) {
      category = this.categorizeTransaction(description); // Re-categorize if description changes
    }

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
