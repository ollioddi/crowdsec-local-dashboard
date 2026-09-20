import { createServerFn } from "@tanstack/react-start";
import z from "zod";
import { authMiddleware } from "@/common/auth/auth.middleware";
import { LOCAL_EMAIL_DOMAIN } from "@/common/auth/email-domains";
import { logger } from "@/common/lib/logging/logger";

export const getUsersFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async () => {
		const { prisma } = await import("@/common/lib/db");
		const users = await prisma.user.findMany({
			orderBy: { createdAt: "asc" },
			select: {
				id: true,
				name: true,
				email: true,
				username: true,
				displayUsername: true,
				createdAt: true,
				accounts: { select: { providerId: true } },
			},
		});
		return users;
	});

export type UserRow = Awaited<ReturnType<typeof getUsersFn>>[number];

export const createUserSchema = z.object({
	username: z.string().min(1, "Username is required"),
	password: z.string().min(4, "Password must be at least 4 characters"),
	email: z.union([z.email("Invalid email address"), z.literal("")]),
});

export const createUserFn = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(createUserSchema)
	.handler(async ({ data }) => {
		const { prisma } = await import("@/common/lib/db");
		const { createUserAccount } = await import(
			"@/common/auth/create-user-account.server"
		);
		const { username, password, email } = data;
		const usernameLower = username.toLowerCase();

		const existing = await prisma.user.findFirst({
			where: { username: usernameLower },
		});
		if (existing) {
			return { error: "Username already exists" };
		}

		await createUserAccount(
			usernameLower,
			password,
			email || `${usernameLower}${LOCAL_EMAIL_DOMAIN}`,
		);

		return { success: true, username: usernameLower };
	});

const deleteUserSchema = z.object({
	id: z.string(),
});

export const deleteUserFn = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(deleteUserSchema)
	.handler(async ({ data, context }) => {
		const { prisma } = await import("@/common/lib/db");

		if (data.id === context.session.user.id) {
			return { error: "Cannot delete your own account" };
		}

		const firstUser = await prisma.user.findFirst({
			orderBy: { createdAt: "asc" },
			select: { id: true },
		});
		if (data.id === firstUser?.id) {
			return { error: "Cannot delete the admin user" };
		}

		const deleted = await prisma.user.delete({
			where: { id: data.id },
			select: { username: true },
		});
		logger("users").info("User {username} deleted by {by}", {
			username: deleted.username,
			by: context.session.user.name,
		});
		return { success: true };
	});
