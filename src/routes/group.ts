import { Hono } from "hono";
import { GroupService } from "../services/groups";
import { isAuthenticated } from "../middleware/auth";
import { withDb } from "../middleware/withDb";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const groupRouter = new Hono();
const groupService = new GroupService();

// Apply authentication middleware to all routes
groupRouter.use("*", isAuthenticated);

// Create a new group
groupRouter.post(
  "/",
  zValidator(
    "json",
    z.object({
      name: z.string().min(1),
    })
  ),
  withDb(async (c, db) => {
    const { name } = c.req.valid("json");
    const user = c.get("user");

    const newGroup = await groupService.createGroup(db, name, user.id);

    return c.json(
      {
        message: "Group created successfully",
        group: newGroup,
      },
      201
    );
  })
);

// Get all groups for the current user
groupRouter.get(
  "/",
  withDb(async (c, db) => {
    const user = c.get("user");
    const userGroups = await groupService.getUserGroups(db, user.id);
    return c.json(userGroups);
  })
);

// Get group details
groupRouter.get(
  "/:id",
  withDb(async (c, db) => {
    const groupId = parseInt(c.req.param("id"));
    const user = c.get("user");

    // Check if user is a member of the group
    const isMember = await groupService.isGroupMember(db, groupId, user.id);
    if (!isMember) {
      return c.json({ message: "Unauthorized" }, 403);
    }

    const groupDetails = await groupService.getGroupDetails(db, groupId);
    return c.json(groupDetails);
  })
);

// Create an invitation
groupRouter.post(
  "/:id/invite",
  zValidator(
    "json",
    z.object({
      email: z.string().email(),
    })
  ),
  withDb(async (c, db) => {
    const groupId = parseInt(c.req.param("id"));
    const { email } = c.req.valid("json");
    const user = c.get("user");

    // Check if user is a member of the group
    const isMember = await groupService.isGroupMember(db, groupId, user.id);
    if (!isMember) {
      return c.json({ message: "Unauthorized" }, 403);
    }

    try {
      const invitation = await groupService.createInvitation(
        db,
        groupId,
        email,
        user.id
      );

      // In a real application, you would send an email here with the invitation link
      // For now, we'll just return the token
      return c.json({
        message: "Invitation created successfully",
        invitationToken: invitation.token,
      });
    } catch (error) {
      if (error instanceof Error) {
        return c.json({ message: error.message }, 400);
      }
      throw error;
    }
  })
);

// Accept an invitation
groupRouter.post(
  "/accept-invitation",
  zValidator(
    "json",
    z.object({
      token: z.string().uuid(),
    })
  ),
  withDb(async (c, db) => {
    const { token } = c.req.valid("json");
    const user = c.get("user");

    try {
      await groupService.acceptInvitation(db, token, user.id);
      return c.json({ message: "Successfully joined the group" }, 201);
    } catch (error) {
      if (error instanceof Error) {
        console.log("error", error);
        return c.json({ message: error.message }, 400);
      }
      throw error;
    }
  })
);

export default groupRouter;
