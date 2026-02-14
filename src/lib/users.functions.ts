import { createServerFn } from "@tanstack/react-start";
import z from "zod";

export const getUsersFn = createServerFn({ method: "GET" }).handler(
	async () => {
		const { prisma } = await import("@/db");
		const users = await prisma.user.findMany({
			orderBy: { createdAt: "asc" },
			select: {
				id: true,
				name: true,
				email: true,
				username: true,
				displayUsername: true,
				createdAt: true,
			},
		});
		return users;
	},
);

export type UserRow = Awaited<ReturnType<typeof getUsersFn>>[number];

/** Placeholder email domains used when a user has no real email address. */
export const SETUP_EMAIL_DOMAIN = "@setup.internal";
export const LOCAL_EMAIL_DOMAIN = "@local.internal";

export const createUserSchema = z.object({
	username: z.string().min(1, "Username is required"),
	password: z.string().min(4, "Password must be at least 4 characters"),
	email: z.union([z.email("Invalid email address"), z.literal("")]),
});

export const createUserFn = createServerFn({ method: "POST" })
	.inputValidator(createUserSchema)
	.handler(async ({ data }) => {
		const { prisma } = await import("@/db");
		const { createUserAccount } = await import("@/lib/users.server");
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

		return { success: true };
	});

const deleteUserSchema = z.object({
	id: z.string(),
});

export const deleteUserFn = createServerFn({ method: "POST" })
	.inputValidator(deleteUserSchema)
	.handler(async ({ data }) => {
		const { prisma } = await import("@/db");
		const firstUser = await prisma.user.findFirst({
			orderBy: { createdAt: "asc" },
			select: { id: true },
		});

		if (data.id === firstUser?.id) {
			return { error: "Cannot delete the admin user" };
		}

		await prisma.user.delete({ where: { id: data.id } });
		return { success: true };
	});
