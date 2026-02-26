import * as z from "zod";
import { AlertEntryTypeSchema } from "../../enums/AlertEntryType.schema";
// prettier-ignore
export const AlertModelSchema = z
	.object({
		id: z.number().int(),
		scenario: z.string(),
		message: z.string(),
		createdAt: z.date(),
		entries: z.string(),
		entryType: AlertEntryTypeSchema,
		hostIp: z.string(),
		host: z.unknown(),
		decisions: z.array(z.unknown()),
		events: z.string(),
	})
	.strict();

export type AlertPureType = z.infer<typeof AlertModelSchema>;
