import { Context, Next } from "hono";
import { verify } from "hono/jwt";

type AuthenticatedContext = Context & { user?: { id: number; email: string } };

export const isAuthenticated = async (c: AuthenticatedContext, next: Next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ message: "Unauthorized: No token provided" }, 401);
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = await verify(token, "secret");
    if (!decoded) {
      return c.json({ message: "Unauthorized: Invalid token" }, 401);
    }

    c.set("user", decoded); // Store user info in the context
    await next();
  } catch (error) {
    return c.json({ message: "Unauthorized: Invalid token" }, 401);
  }
};
