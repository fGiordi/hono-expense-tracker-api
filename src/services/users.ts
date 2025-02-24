import { hash } from "bcryptjs";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { NeonDatabase } from "drizzle-orm/neon-serverless"; // Use NeonDatabase

export class UserService {
  public async getUserByEmail(db: NeonDatabase, email: string) {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .execute(); // Use .execute() for SELECT
    return result[0]; // Return the first result (or null if no results)
  }

  public async getAllUsers(db: NeonDatabase) {
    return await db.select().from(users).execute(); // Use .execute() for SELECT
  }

  public async getUserById(db: NeonDatabase, userId: number) {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .execute(); // Use .execute() for SELECT
    return result[0]; // Return the first result (or null if no results)
  }

  async createUser(
    db: NeonDatabase,
    username: string,
    email: string,
    password: string
  ) {
    const hashedPassword = await hash(password, 10); // Hash the password
    const newUser = await db
      .insert(users)
      .values({ username, email, password: hashedPassword });
    // @ts-ignore
    return newUser[0]; // Return the first result (the newly created user)
  }

  public async updateUser(
    db: NeonDatabase,
    userId: number,
    username: string,
    email: string,
    password: string
  ) {
    return await db
      .update(users)
      .set({ username, email, password })
      .where(eq(users.id, userId))
      .execute(); // Use .execute() for UPDATE
  }

  public async deleteUser(db: NeonDatabase, userId: number) {
    return await db.delete(users).where(eq(users.id, userId)).execute(); // Use .execute() for DELETE
  }
}
