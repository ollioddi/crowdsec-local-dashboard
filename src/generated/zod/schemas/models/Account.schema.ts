import * as z from "zod";

export const AccountSchema = z.object({
	id: z.string(),
	accountId: z.string(),
	providerId: z.string(),
	userId: z.string(),
	accessToken: z.string().nullish(),
	refreshToken: z.string().nullish(),
	idToken: z.string().nullish(),
	accessTokenExpiresAt: z.date().nullish(),
	refreshTokenExpiresAt: z.date().nullish(),
	scope: z.string().nullish(),
	password: z.string().nullish(),
	createdAt: z.date(),
	updatedAt: z.date(),
});

export type AccountType = z.infer<typeof AccountSchema>;
