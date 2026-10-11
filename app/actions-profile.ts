"use server";

import { safeRevalidatePath } from "./actions-shared";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/db/auth";

export async function updateUserProfileAction(data: {
  name: string;
  username?: string;
  bio?: string;
  avatar?: string;
}) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized. Please log in first." };
    }

    const trimmedName = data.name.trim();
    if (!trimmedName) {
      return { success: false, error: "Name cannot be empty." };
    }

    let cleanUsername: string | null | undefined = undefined;
    if (data.username !== undefined) {
      const sanitized = data.username.trim().replace(/^@/, "").toLowerCase();
      cleanUsername = sanitized || null;
      if (cleanUsername && cleanUsername !== user.username) {
        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.username, cleanUsername))
          .limit(1);
        if (existingUser && existingUser.id !== user.id) {
          return { success: false, error: "Username is already taken by another account." };
        }
      }
    }

    await db
      .update(users)
      .set({
        name: trimmedName,
        ...(cleanUsername !== undefined ? { username: cleanUsername } : {}),
        ...(data.bio !== undefined ? { bio: data.bio.trim() } : {}),
        ...(data.avatar !== undefined ? { avatar: data.avatar } : {}),
      })
      .where(eq(users.id, user.id));

    safeRevalidatePath("/");
    safeRevalidatePath("/settings");
    safeRevalidatePath("/preferences");
    safeRevalidatePath("/start");
    safeRevalidatePath("/projects");
    safeRevalidatePath("/tasks");
    safeRevalidatePath("/messages");
    return { success: true };
  } catch (error) {
    console.error("Failed to update user profile:", error);
    return { success: false, error: "Failed to update user profile." };
  }
}
