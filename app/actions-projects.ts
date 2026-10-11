"use server";

import { safeRevalidatePath, isUniqueConstraintError } from "./actions-shared";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, projectActivity, projectMembers, projects, tasks, workspaceMembers } from "@/lib/db/schema";
import { getActiveWorkspaceId } from "@/lib/db/workspace";
import { getCurrentUser, AuthError, requireUser, requireWorkspaceMember, requireWorkspaceRole, getTargetWorkspaceMembership } from "@/lib/db/auth";
import { newId } from "@/lib/id";

export async function assignProjectMemberAction(data: {
  projectId: string;
  userId: string;
  role: "lead" | "contributor" | "reviewer" | "viewer";
  replacementUserId?: string;
}) {
  try {
    const currentUser = await requireUser();

    if (!data.projectId || !data.userId) {
      return { success: false, error: "Project ID and User ID are required." };
    }

    const VALID_ROLES = ["lead", "contributor", "reviewer", "viewer"];
    if (!VALID_ROLES.includes(data.role)) {
      return { success: false, error: `Invalid project role: ${data.role}` };
    }

    // 100% synchronous execution of all authorization, state reads, lead invariants, and writes inside one transaction
    await db.transaction(async (tx) => {
      // 1. Look up project
      const [project] = await tx
        .select({ id: projects.id, workspaceId: projects.workspaceId })
        .from(projects)
        .where(eq(projects.id, data.projectId))
        .limit(1);
      if (!project) {
        throw new Error("Project not found.");
      }

      // 2. Caller authorization: must be workspace owner/admin or current project lead
      const [callerWs] = await tx
        .select({ role: workspaceMembers.role })
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, project.workspaceId), eq(workspaceMembers.userId, currentUser.id)))
        .limit(1);
      if (!callerWs) {
        throw new Error("You are not a member of this workspace.");
      }

      const isWsAdmin = callerWs.role === "owner" || callerWs.role === "admin";
      const [callerProj] = await tx
        .select({ role: projectMembers.role })
        .from(projectMembers)
        .where(and(eq(projectMembers.projectId, data.projectId), eq(projectMembers.userId, currentUser.id)))
        .limit(1);
      const isProjectLead = callerProj?.role === "lead";

      if (!isWsAdmin && !isProjectLead) {
        throw new Error("Permission denied. Only workspace owners, admins, or the current project lead can manage the project roster.");
      }

      // 3. Starting lead invariant check: project must start with exactly 1 lead
      const startingLeads = await tx
        .select({ id: projectMembers.id, userId: projectMembers.userId, name: projectMembers.name, role: projectMembers.role })
        .from(projectMembers)
        .where(and(eq(projectMembers.projectId, data.projectId), eq(projectMembers.role, "lead")));

      if (startingLeads.length !== 1) {
        throw new Error("Project invariant violation: project must start with exactly one lead.");
      }
      const currentLead = startingLeads[0];

      // 4. Target user validation: must belong to this workspace
      const [targetWs] = await tx
        .select({ id: workspaceMembers.id })
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, project.workspaceId), eq(workspaceMembers.userId, data.userId)))
        .limit(1);
      if (!targetWs) {
        throw new Error("User is not a member of this workspace.");
      }

      const [targetUser] = await tx
        .select({ id: users.id, name: users.name, avatar: users.avatar })
        .from(users)
        .where(eq(users.id, data.userId))
        .limit(1);
      if (!targetUser) {
        throw new Error("User not found.");
      }

      const [targetMember] = await tx
        .select({ id: projectMembers.id, role: projectMembers.role })
        .from(projectMembers)
        .where(and(eq(projectMembers.projectId, data.projectId), eq(projectMembers.userId, data.userId)))
        .limit(1);

      const initials =
        (targetUser.name.split(" ")[0]?.[0] ?? "") +
        (targetUser.name.split(" ")[1]?.[0] ?? targetUser.name[1] ?? "").toUpperCase();
      const color = targetUser.avatar || "bg-violet-500";

      // 5. Apply role changes
      if (data.role === "lead") {
        // Ordinary lead transfer / promotion
        if (data.userId !== currentLead.userId) {
          // Demote current lead to contributor
          await tx
            .update(projectMembers)
            .set({ role: "contributor" })
            .where(eq(projectMembers.id, currentLead.id));

          // Promote or insert target user as lead
          if (targetMember) {
            await tx
              .update(projectMembers)
              .set({ role: "lead" })
              .where(eq(projectMembers.id, targetMember.id));
          } else {
            const id = `pm-${data.projectId}-${data.userId}`;
            await tx.insert(projectMembers).values({
              id,
              projectId: data.projectId,
              userId: data.userId,
              name: targetUser.name,
              role: "lead",
              initials: initials || "TM",
              color,
            });
          }
        }
      } else {
        // Assigning a non-lead role
        if (data.userId === currentLead.userId) {
          // Demotion of the sole project lead!
          if (!data.replacementUserId) {
            throw new Error("Cannot demote the sole project lead without promoting a replacement lead in the same transaction.");
          }
          if (data.replacementUserId === data.userId) {
            throw new Error("Replacement lead must be a different user.");
          }

          const [repWs] = await tx
            .select({ id: workspaceMembers.id })
            .from(workspaceMembers)
            .where(and(eq(workspaceMembers.workspaceId, project.workspaceId), eq(workspaceMembers.userId, data.replacementUserId)))
            .limit(1);
          if (!repWs) {
            throw new Error("Replacement user is not a member of this workspace.");
          }

          const [repUser] = await tx
            .select({ id: users.id, name: users.name, avatar: users.avatar })
            .from(users)
            .where(eq(users.id, data.replacementUserId))
            .limit(1);
          if (!repUser) {
            throw new Error("Replacement user not found.");
          }

          const [repMember] = await tx
            .select({ id: projectMembers.id, role: projectMembers.role })
            .from(projectMembers)
            .where(and(eq(projectMembers.projectId, data.projectId), eq(projectMembers.userId, data.replacementUserId)))
            .limit(1);

          const repInitials =
            (repUser.name.split(" ")[0]?.[0] ?? "") +
            (repUser.name.split(" ")[1]?.[0] ?? repUser.name[1] ?? "").toUpperCase();
          const repColor = repUser.avatar || "bg-violet-500";

          // Promote replacement to lead
          if (repMember) {
            await tx
              .update(projectMembers)
              .set({ role: "lead" })
              .where(eq(projectMembers.id, repMember.id));
          } else {
            const repId = `pm-${data.projectId}-${data.replacementUserId}`;
            await tx.insert(projectMembers).values({
              id: repId,
              projectId: data.projectId,
              userId: data.replacementUserId,
              name: repUser.name,
              role: "lead",
              initials: repInitials || "TM",
              color: repColor,
            });
          }

          // Demote target (current lead) to requested non-lead role
          await tx
            .update(projectMembers)
            .set({ role: data.role })
            .where(eq(projectMembers.id, currentLead.id));
        } else {
          // Target is not current lead: update or insert non-lead role
          if (targetMember) {
            await tx
              .update(projectMembers)
              .set({ role: data.role })
              .where(eq(projectMembers.id, targetMember.id));
          } else {
            const id = `pm-${data.projectId}-${data.userId}`;
            await tx.insert(projectMembers).values({
              id,
              projectId: data.projectId,
              userId: data.userId,
              name: targetUser.name,
              role: data.role,
              initials: initials || "TM",
              color,
            });
          }
        }
      }

      // 6. Ending lead invariant check: project must end with exactly 1 lead
      const endingLeadsRes = await tx.execute(
        sql`SELECT COUNT(*) as cnt FROM project_members WHERE project_id = ${data.projectId} AND role = 'lead'`
      );
      const endingLeads = Number((endingLeadsRes[0] as unknown as { cnt: number | string }).cnt);

      if (endingLeads !== 1) {
        throw new Error("Project invariant violation: project must end with exactly one lead.");
      }

      // 7. Insert audit activity log
      await tx.insert(projectActivity).values({
        id: newId("pa"),
        projectId: data.projectId,
        content: `${targetUser.name} was assigned as ${data.role}.`,
        createdAt: new Date().toISOString(),
      });
    });

    safeRevalidatePath("/projects");
    safeRevalidatePath(`/projects/${data.projectId}`);
    return { success: true };
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message };
    }
    if (isUniqueConstraintError(err)) {
      return { success: false, error: "User is already assigned to this project." };
    }
    return { success: false, error: err instanceof Error ? err.message : "Failed to assign project member." };
  }
}

export async function removeProjectMemberAction(projectId: string, memberId: string) {
  try {
    const currentUser = await requireUser();

    if (!projectId || !memberId) {
      return { success: false, error: "Project ID and Member ID are required." };
    }

    const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!project) {
      return { success: false, error: "Project not found." };
    }

    // Verify caller is a workspace member
    const { membership: callerWsMembership } = await requireWorkspaceMember(project.workspaceId);

    const isWsAdmin = callerWsMembership.role === "owner" || callerWsMembership.role === "admin";
    const [callerProjectRole] = await db
      .select()
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, currentUser.id)))
      .limit(1);
    const isProjectLead = callerProjectRole?.role === "lead";

    if (!isWsAdmin && !isProjectLead) {
      return {
        success: false,
        error: "Permission denied. Only workspace owners, admins, or the current project lead can manage the project roster.",
      };
    }

    // Scoped member lookup: membership ID must belong to this specific project
    const [member] = await db
      .select()
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.id, memberId)))
      .limit(1);

    if (!member) {
      return { success: false, error: "Project member not found in this project." };
    }

    // Sole-Lead Protection: cannot remove the project lead
    if (member.role === "lead") {
      return {
        success: false,
        error: "Cannot remove the project lead. Reassign the project lead before removing.",
      };
    }

    await db
      .delete(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.id, memberId)));

    safeRevalidatePath("/projects");
    safeRevalidatePath(`/projects/${projectId}`);
    return { success: true };
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: err instanceof Error ? err.message : "Failed to remove project member." };
  }
}

export async function createProjectAction(data: {
  workspaceId?: string;
  name: string;
  owner?: string;
  ownerUserId?: string;
  status?: string;
  due?: string;
  progress?: number;
  overview?: string;
  members?: { userId?: string; name: string; role: string }[];
}) {
  try {
    const currentUser = await requireUser();
    const wsId = data.workspaceId ?? (await getActiveWorkspaceId());

    // Check workspace permission (viewers cannot create projects)
    await requireWorkspaceRole(wsId, ["owner", "admin", "member"]);

    const trimmedName = data.name?.trim();
    if (!trimmedName) {
      return { success: false, error: "Project name is required." };
    }

    const VALID_ROLES = ["lead", "contributor", "reviewer", "viewer"];

    // Owner / Lead user validation
    const leadUserId = data.ownerUserId || currentUser.id;
    const leadMembership = await getTargetWorkspaceMembership(wsId, leadUserId);
    if (!leadMembership) {
      return { success: false, error: "Project lead must be a member of this workspace." };
    }

    const [leadUser] = await db.select().from(users).where(eq(users.id, leadUserId)).limit(1);
    const leadName = leadUser?.name || data.owner?.trim() || currentUser.name;
    const leadColor = leadUser?.avatar || "bg-violet-500";
    const leadInitials =
      (leadName.split(" ")[0]?.[0] ?? "") +
      (leadName.split(" ")[1]?.[0] ?? leadName[1] ?? "").toUpperCase() || "PL";

    // Validate members roster
    const rosterToInsert: {
      userId: string | null;
      name: string;
      role: "lead" | "contributor" | "reviewer" | "viewer";
      initials: string;
      color: string;
    }[] = [];

    // Lead is always index 0
    rosterToInsert.push({
      userId: leadUserId,
      name: leadName,
      role: "lead",
      initials: leadInitials,
      color: leadColor,
    });

    const seenUserIds = new Set<string>([leadUserId]);

    if (data.members && data.members.length > 0) {
      for (const m of data.members) {
        if (!m.userId || !m.userId.trim()) {
          return {
            success: false,
            error: "Member roster entries must have a valid user ID.",
          };
        }

        const memberUserId = m.userId.trim();

        // Check if secondary lead is attempted
        if (m.role === "lead") {
          return {
            success: false,
            error: "Project can only have one lead. Additional members cannot be assigned the lead role during creation.",
          };
        }

        const memberRole = (m.role || "contributor") as "lead" | "contributor" | "reviewer" | "viewer";
        if (!VALID_ROLES.includes(memberRole)) {
          return { success: false, error: `Invalid project role: ${m.role}` };
        }

        // Check duplicate
        if (seenUserIds.has(memberUserId)) {
          return { success: false, error: `Duplicate member in roster: ${memberUserId}` };
        }

        // Verify user belongs to workspace
        const mWs = await getTargetWorkspaceMembership(wsId, memberUserId);
        if (!mWs) {
          return { success: false, error: `Member ${m.name || memberUserId} must belong to this workspace.` };
        }

        const [mUser] = await db.select().from(users).where(eq(users.id, memberUserId)).limit(1);
        if (!mUser) {
          return { success: false, error: `User ${memberUserId} not found.` };
        }

        seenUserIds.add(memberUserId);

        const memberName = mUser.name || m.name?.trim() || "Team Member";
        const memberInitials =
          (memberName.split(" ")[0]?.[0] ?? "") +
          (memberName.split(" ")[1]?.[0] ?? memberName[1] ?? "").toUpperCase();
        const memberColor = mUser.avatar || "bg-cyan-500";

        rosterToInsert.push({
          userId: memberUserId,
          name: memberName,
          role: memberRole,
          initials: memberInitials || "TM",
          color: memberColor,
        });
      }
    }

    const projectId = newId("project");
    const now = new Date().toISOString();

    // Atomic execution of project creation + roster insertion + initial activity in single transaction
    await db.transaction(async (tx) => {
      await tx.insert(projects).values({
        id: projectId,
        workspaceId: wsId,
        name: trimmedName,
        owner: leadName,
        ownerUserId: leadUserId,
        status: data.status || "Planning",
        due: data.due || "Next week",
        progress: data.progress ?? 0,
        overview: data.overview?.trim() || "Add project context, timeline, and key milestones.",
        createdAt: now,
      });

      for (let i = 0; i < rosterToInsert.length; i++) {
        const item = rosterToInsert[i];
        await tx.insert(projectMembers).values({
          id: `pm-${projectId}-${i}`,
          projectId,
          userId: item.userId,
          name: item.name,
          role: item.role,
          initials: item.initials,
          color: item.color,
        });
      }

      await tx.insert(projectActivity).values({
        id: newId("pa"),
        projectId,
        content: `${currentUser.name} created project '${trimmedName}'.`,
        createdAt: now,
      });
    });

    safeRevalidatePath("/projects");
    safeRevalidatePath("/");
    return { success: true, id: projectId };
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message };
    }
    if (isUniqueConstraintError(err)) {
      return { success: false, error: "A project member or project with this identity already exists." };
    }
    return { success: false, error: err instanceof Error ? err.message : "Failed to create project." };
  }
}

export async function updateProjectAction(
  id: string,
  data: {
    name?: string;
    owner?: string;
    ownerUserId?: string;
    status?: string;
    due?: string;
    progress?: number;
    overview?: string;
  }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { success: false, error: "Unauthorized." };

  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!project) return { success: false, error: "Project not found." };

  const [wsMembership] = await db
    .select()
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, project.workspaceId), eq(workspaceMembers.userId, currentUser.id)))
    .limit(1);

  if (!wsMembership || wsMembership.role === "viewer") {
    return { success: false, error: "Permission denied." };
  }

  let resolvedOwner: string | undefined;
  let resolvedOwnerUserId: string | null | undefined;

  if (data.ownerUserId !== undefined) {
    const [target] = await db
      .select({ id: users.id, name: users.name })
      .from(workspaceMembers)
      .innerJoin(users, eq(workspaceMembers.userId, users.id))
      .where(and(eq(workspaceMembers.workspaceId, project.workspaceId), eq(users.id, data.ownerUserId)))
      .limit(1);

    if (!target) {
      return { success: false, error: "Project owner must be an active member of this workspace." };
    }
    resolvedOwner = target.name;
    resolvedOwnerUserId = target.id;
  } else if (data.owner !== undefined) {
    const rawOwner = data.owner.trim();
    const matches = await db
      .select({ id: users.id, name: users.name })
      .from(workspaceMembers)
      .innerJoin(users, eq(workspaceMembers.userId, users.id))
      .where(and(eq(workspaceMembers.workspaceId, project.workspaceId), eq(users.name, rawOwner)));

    if (matches.length === 0) {
      return { success: false, error: "Project owner must be an active member of this workspace." };
    }
    if (matches.length > 1) {
      return { success: false, error: "Multiple workspace members match this name. Ambiguous owner change rejected." };
    }
    resolvedOwner = matches[0].name;
    resolvedOwnerUserId = matches[0].id;
  }

  const updateData: Record<string, unknown> = {
    ...(data.name ? { name: data.name.trim() } : {}),
    ...(resolvedOwner !== undefined ? { owner: resolvedOwner, ownerUserId: resolvedOwnerUserId } : {}),
    ...(data.status ? { status: data.status } : {}),
    ...(data.due ? { due: data.due } : {}),
    ...(data.progress !== undefined ? { progress: Math.min(100, Math.max(0, data.progress)) } : {}),
    ...(data.overview !== undefined ? { overview: data.overview.trim() } : {}),
  };

  if (Object.keys(updateData).length > 0) {
    await db.update(projects).set(updateData).where(eq(projects.id, id));
  }

  if (data.status && data.status !== project.status) {
    await db.insert(projectActivity).values({
      id: newId("pa"),
      projectId: id,
      content: `Status updated to ${data.status} by ${currentUser.name}.`,
      createdAt: new Date().toISOString(),
    });
  }

  safeRevalidatePath("/projects");
  safeRevalidatePath(`/projects/${id}`);
  safeRevalidatePath("/");
  return { success: true };
}

export async function deleteProjectAction(id: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { success: false, error: "Unauthorized." };

  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!project) return { success: false, error: "Project not found." };

  const [wsMembership] = await db
    .select()
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, project.workspaceId), eq(workspaceMembers.userId, currentUser.id)))
    .limit(1);

  if (!wsMembership) {
    return { success: false, error: "Only workspace owners, admins, or the project lead can delete this project." };
  }

  const isWsAdmin = wsMembership.role === "owner" || wsMembership.role === "admin";
  const [leadMember] = await db
    .select({ id: projectMembers.id })
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, id), eq(projectMembers.userId, currentUser.id), eq(projectMembers.role, "lead")))
    .limit(1);
  const isLeadMember = Boolean(leadMember);
  const isProjectOwner = project.ownerUserId ? project.ownerUserId === currentUser.id : false;

  if (!isWsAdmin && !isLeadMember && !isProjectOwner) {
    return { success: false, error: "Only workspace owners, admins, or the project lead can delete this project." };
  }

  await db.transaction(async (tx) => {
    await tx.delete(projectMembers).where(eq(projectMembers.projectId, id));
    await tx.delete(projectActivity).where(eq(projectActivity.projectId, id));
    await tx
      .update(tasks)
      .set({ projectId: null, projectName: "General" })
      .where(eq(tasks.projectId, id));
    await tx.delete(projects).where(eq(projects.id, id));
  });

  safeRevalidatePath("/projects");
  safeRevalidatePath("/");
  return { success: true };
}
