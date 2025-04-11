import { Hono } from "hono";
import { ExpenseService } from "../services/expenses";
import { isAuthenticated } from "../middleware/auth";
import { withDb } from "../middleware/withDb";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const expenseRouter = new Hono();
const expenseService = new ExpenseService();

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
      tags: z.array(z.string()).optional().default([]),
      groupId: z.number().optional(), // Optional group ID for group expenses
    })
  ),
  withDb(async (c, db) => {
    const { description, amount, category, date, tags, groupId } =
      c.req.valid("json");
    const user = c.get("user");

    try {
      const newExpense = await expenseService.createExpense(
        db,
        description,
        amount,
        user.id,
        category,
        tags,
        date,
        groupId
      );

      return c.json(
        {
          message: "Expense created successfully",
          expense: newExpense,
        },
        201
      );
    } catch (error) {
      if (error instanceof Error) {
        return c.json({ message: error.message }, 400);
      }
      throw error;
    }
  })
);

// Get all expenses for the logged-in user (including group expenses)
expenseRouter.get(
  "/",
  withDb(async (c, db) => {
    const user = c.get("user");
    const userExpenses = await expenseService.getExpensesByUser(db, user.id);
    console.log("userExpenses", userExpenses);
    return c.json(userExpenses);
  })
);

// Get expenses for a specific group
expenseRouter.get(
  "/group/:groupId",
  withDb(async (c, db) => {
    const groupId = parseInt(c.req.param("groupId"));
    const user = c.get("user");

    try {
      const groupExpenses = await expenseService.getGroupExpenses(
        db,
        groupId,
        user.id
      );
      return c.json(groupExpenses);
    } catch (error) {
      if (error instanceof Error) {
        return c.json({ message: error.message }, 403);
      }
      throw error;
    }
  })
);

// Get expense summary
expenseRouter.get(
  "/summary",
  withDb(async (c, db) => {
    const user = c.get("user");
    const summary = await expenseService.getCategorySummary(db, user.id);
    return c.json(summary);
  })
);

// Get a single expense by ID
expenseRouter.get(
  "/:id",
  withDb(async (c, db) => {
    const expenseId = parseInt(c.req.param("id"));
    const user = c.get("user");

    try {
      const expense = await expenseService.getExpenseById(
        db,
        expenseId,
        user.id
      );
      if (!expense) {
        return c.json({ message: "Expense not found" }, 404);
      }
      return c.json(expense);
    } catch (error) {
      if (error instanceof Error) {
        return c.json({ message: error.message }, 403);
      }
      throw error;
    }
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
      category: z.string().optional(),
      date: z.string().optional(),
      tags: z.array(z.string()).optional(),
    })
  ),
  withDb(async (c, db) => {
    const expenseId = parseInt(c.req.param("id"));
    const updates = c.req.valid("json");
    const user = c.get("user");

    try {
      const updatedExpense = await expenseService.updateExpense(
        db,
        expenseId,
        user.id,
        updates
      );
      return c.json({
        message: "Expense updated successfully",
        expense: updatedExpense,
      });
    } catch (error) {
      if (error instanceof Error) {
        return c.json(
          { message: error.message },
          error.message.includes("not found") ? 404 : 403
        );
      }
      throw error;
    }
  })
);

// Delete an expense
expenseRouter.delete(
  "/:id",
  withDb(async (c, db) => {
    const expenseId = parseInt(c.req.param("id"));
    const user = c.get("user");

    try {
      const deletedExpense = await expenseService.deleteExpense(
        db,
        expenseId,
        user.id
      );
      return c.json({
        message: "Expense deleted successfully",
        expense: deletedExpense,
      });
    } catch (error) {
      if (error instanceof Error) {
        return c.json(
          { message: error.message },
          error.message.includes("not found") ? 404 : 403
        );
      }
      throw error;
    }
  })
);

export default expenseRouter;
