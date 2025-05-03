import { Hono } from "hono";
import { UserService } from "../services/users";
import { withDb } from "../middleware/withDb";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { compare, genSalt, getSalt } from "bcryptjs";
import { sign } from "hono/jwt";

const userRouter = new Hono();
const userService = new UserService(); // Initialize UserService with the database connection

userRouter.post(
  "/",
  zValidator(
    "json",
    z.object({
      username: z.string().min(3),
      email: z.string().email(),
      password: z.string().min(6),
    })
  ),
  withDb(async (c, db) => {
    const { username, email, password } = c.req.valid("json");

    const newUser = await userService.createUser(db, username, email, password);

    // Generate token after successful user creation
    const token = await sign(
      {
        id: newUser.id,
        email: newUser.email,
        exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour expiration
      },
      "secret"
    );

    return c.json({
      message: "User created successfully",
      user: newUser,
      token, // Add the token to the response
    });
  })
);

userRouter.post(
  "/login",
  withDb(async (c, db) => {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({ message: "Email and password are required" }, 400);
    }

    const user = await userService.getUserByEmail(db, email);
    if (!user) {
      return c.json({ message: "Invalid credentials" }, 401);
    }

    const isMatch = await compare(password, user.password);

    const salt = getSalt(user.password);

    const newSalt = await genSalt(10); // Generate a new salt

    if (!isMatch) {
      return c.json({ message: "Invalid credentials" }, 401);
    }

    const token = await sign(
      {
        id: user.id,
        email: user.email,
        exp: Math.floor(Date.now() / 1000) + 60 * 60,
      },
      "secret"
    );

    return c.json({
      message: "Login successful",
      token,
      userId: user.id,
      salt: salt || newSalt,
    });
  })
);

userRouter.get(
  "/",
  withDb(async (c, db) => {
    const allUsers = await userService.getAllUsers(db);
    return c.json(allUsers);
  })
);

userRouter.get(
  "/:id",
  withDb(async (c, db) => {
    const userId = c.req.param("id");
    const user = await userService.getUserById(db, Number(userId));
    return c.json(user);
  })
);

userRouter.put(
  "/:id",
  withDb(async (c, db) => {
    const userId = c.req.param("id");
    const { username, email, password } = await c.req.json();
    const updatedUser = await userService.updateUser(
      db,
      Number(userId),
      username,
      email,
      password
    );
    return c.json(updatedUser);
  })
);

userRouter.delete(
  "/:id",
  withDb(async (c, db) => {
    const userId = c.req.param("id");
    const response = await userService.deleteUser(db, Number(userId));
    return c.json(response);
  })
);

export default userRouter;
