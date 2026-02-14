import * as z from "zod";
// prettier-ignore
export const UserModelSchema = z
	.object({
		id: z.string(),
		name: z.string(),
		email: z.string(),
		createdAt: z.date(),
		updatedAt: z.date(),
		username: z.string().nullable(),
		displayUsername: z.string().nullable(),
		sessions: z.array(z.unknown()),
		accounts: z.array(z.unknown()),
	})
	.strict();

export type UserPureType = z.infer<typeof UserModelSchema>;
