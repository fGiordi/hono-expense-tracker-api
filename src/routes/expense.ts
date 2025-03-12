import { Hono } from "hono";
import { ExpenseService } from "../services/expenses";
import { isAuthenticated } from "../middleware/auth";
import { withDb } from "../middleware/withDb";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const expenseRouter = new Hono();
const expenseService = new ExpenseService(); // Initialize ExpenseService

// Apply authentication middleware to all routes
expenseRouter.use("*", isAuthenticated);

// Create a new expense
expenseRouter.post(
  "/",
  zValidator(
    "json",
    z.object({
      description: z.string().min(1),
      amount: z.number().positive(),
      category: z.string().optional(),
      date: z
        .string()
        .optional()
        .default(new Date().toISOString().split("T")[0]),
      tags: z.array(z.string()).optional().default([]), // New field: tags
    })
  ),
  withDb(async (c, db) => {
    const { description, amount, category, date, tags } = c.req.valid("json");
    const user = c.get("user");
    const userId = user.id;

    const newExpense = await expenseService.createExpense(
      db,
      description,
      amount,
      userId,
      category,
      tags,
      date
    );

    return c.json(
      {
        message: "Expense created successfully",
        expense: newExpense,
      },
      201
    );
  })
);

// Get all expenses for the logged-in user
expenseRouter.get(
  "/",
  withDb(async (c, db) => {
    const user = c.get("user"); // Get user from JWT middleware
    const userId = user.id;

    const userExpenses = await expenseService.getExpensesByUser(db, userId);
    return c.json(userExpenses);
  })
);

// Get a single expense by ID
expenseRouter.get(
  "/:id",
  withDb(async (c, db) => {
    const expenseId = c.req.param("id");
    const user = c.get("user"); // Get user from JWT middleware
    const userId = user.id;

    const expense = await expenseService.getExpenseById(
      db,
      Number(expenseId)
      // userId
    );

    if (!expense) {
      return c.json({ message: "Expense not found" }, 404);
    }

    return c.json(expense);
  })
);

// Update an expense
expenseRouter.put(
  "/:id",
  zValidator(
    "json",
    z.object({
      description: z.string().min(1).optional(),
      amount: z.number().positive().optional(),
      category: z.string().min(1).optional(),
      date: z.string().optional(),
      tags: z.array(z.string()).optional(), // New field: tags
    })
  ),
  withDb(async (c, db) => {
    const expenseId = c.req.param("id");
    const { description, amount, category, date, tags } = c.req.valid("json");

    const user = c.get("user"); // Get user from JWT middleware
    const userId = user.id;

    const updatedExpense = await expenseService.updateExpense({
      db,
      id: Number(expenseId),
      amount,
      category,
      description,
      date,
      tags,
    });

    if (!updatedExpense) {
      return c.json({ message: "Expense not found" }, 404);
    }

    return c.json({
      message: "Expense updated successfully",
      expense: updatedExpense,
    });
  })
);

// Delete an expense
expenseRouter.delete(
  "/:id",
  withDb(async (c, db) => {
    const expenseId = c.req.param("id");
    const user = c.get("user"); // Get user from JWT middleware
    const userId = user.id;

    const deletedExpense = await expenseService.deleteExpense(
      db,
      Number(expenseId)
    );

    if (!deletedExpense) {
      return c.json({ message: "Expense not found" }, 404);
    }

    return c.json({
      message: "Expense deleted successfully",
      expense: deletedExpense,
    });
  })
);

export default expenseRouter;
