import * as z from "zod";

export const SessionSchema = z.object({
	id: z.string(),
	expiresAt: z.date(),
	token: z.string(),
	createdAt: z.date(),
	updatedAt: z.date(),
	ipAddress: z.string().nullish(),
	userAgent: z.string().nullish(),
	userId: z.string(),
});

export type SessionType = z.infer<typeof SessionSchema>;
