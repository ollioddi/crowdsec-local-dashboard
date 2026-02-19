import * as z from "zod";

export const AlertSchema = z.object({
	id: z.number().int(),
	scenario: z.string(),
	message: z.string(),
	createdAt: z.date(),
	paths: z.string().default("[]"),
	hostIp: z.string(),
	events: z.string().default("[]"),
});

export type AlertType = z.infer<typeof AlertSchema>;
