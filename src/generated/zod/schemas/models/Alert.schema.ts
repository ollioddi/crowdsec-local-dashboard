import * as z from "zod";
import { AlertEntryTypeSchema } from "../enums/AlertEntryType.schema";

export const AlertSchema = z.object({
	id: z.number().int(),
	scenario: z.string(),
	message: z.string(),
	createdAt: z.date(),
	entries: z.string().default("[]"),
	entryType: AlertEntryTypeSchema.default("none"),
	hostIp: z.string(),
	events: z.string().default("[]"),
});

export type AlertType = z.infer<typeof AlertSchema>;
