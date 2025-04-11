import { NeonDatabase } from "drizzle-orm/neon-serverless";
import { groups, groupMembers, groupInvites, users } from "../db/schema";
import { eq, and, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export class GroupService {
  // Create a new group
  async createGroup(db: NeonDatabase, name: string, createdBy: number) {
    const [newGroup] = await db
      .insert(groups)
      .values({ name, createdBy })
      .returning();

    // Add the creator as a member
    await db.insert(groupMembers).values({
      groupId: newGroup.id,
      userId: createdBy,
    });

    return newGroup;
  }

  async getUserGroups(db: NeonDatabase, userId: number) {
    const result = await db
      .select({
        group: groups,
        memberCount: sql<number>`(
          SELECT COUNT(*) 
          FROM ${groupMembers} 
          WHERE ${groupMembers.groupId} = ${groups.id}
        )`.as("memberCount"),
      })
      .from(groups)
      .innerJoin(
        groupMembers,
        and(
          eq(groups.id, groupMembers.groupId),
          eq(groupMembers.userId, userId)
        )
      );

    return result;
  }

  // Create an invitation to a group
  async createInvitation(
    db: NeonDatabase,
    groupId: number,
    invitedEmail: string,
    invitedBy: number
  ) {
    // Check if user is already a member
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, invitedEmail))
      .limit(1);

    if (existingUser.length > 0) {
      const existingMember = await db
        .select()
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, groupId),
            eq(groupMembers.userId, existingUser[0].id)
          )
        )
        .limit(1);

      if (existingMember.length > 0) {
        throw new Error("User is already a member of this group");
      }
    }

    // Create invitation with 7-day expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const [invitation] = await db
      .insert(groupInvites)
      .values({
        groupId,
        invitedEmail,
        invitedBy,
        token: randomUUID(),
        expiresAt,
      })
      .returning();

    return invitation;
  }

  // Accept an invitation
  async acceptInvitation(db: NeonDatabase, token: string, userId: number) {
    // Find and validate invitation
    const [invitation] = await db
      .select()
      .from(groupInvites)
      .where(and(eq(groupInvites.token, token), eq(groupInvites.used, false)));

    if (!invitation) {
      throw new Error("Invalid or expired invitation");
    }

    if (new Date() > invitation.expiresAt) {
      throw new Error("Invitation has expired");
    }

    // Add user to group
    const [membership] = await db
      .insert(groupMembers)
      .values({
        groupId: invitation.groupId,
        userId,
      })
      .returning();

    // Mark invitation as used
    await db
      .update(groupInvites)
      .set({ used: true })
      .where(eq(groupInvites.id, invitation.id));

    return membership;
  }

  // Get group details including members
  async getGroupDetails(db: NeonDatabase, groupId: number) {
    const group = await db
      .select()
      .from(groups)
      .where(eq(groups.id, groupId))
      .limit(1);

    if (!group.length) {
      throw new Error("Group not found");
    }

    const members = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        joinedAt: groupMembers.joinedAt,
      })
      .from(groupMembers)
      .innerJoin(users, eq(groupMembers.userId, users.id))
      .where(eq(groupMembers.groupId, groupId));

    return {
      ...group[0],
      members,
    };
  }

  // Check if user is a member of a group
  async isGroupMember(db: NeonDatabase, groupId: number, userId: number) {
    const member = await db
      .select()
      .from(groupMembers)
      .where(
        and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId))
      )
      .limit(1);

    return member.length > 0;
  }
}
