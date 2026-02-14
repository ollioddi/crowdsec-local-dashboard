import * as z from "zod";
// prettier-ignore
export const HostModelSchema = z
	.object({
		id: z.string(),
		ip: z.string(),
		scope: z.string(),
		firstSeen: z.date(),
		lastSeen: z.date(),
		totalBans: z.number().int(),
		country: z.string().nullable(),
		asNumber: z.string().nullable(),
		asName: z.string().nullable(),
		latitude: z.number().nullable(),
		longitude: z.number().nullable(),
		decisions: z.array(z.unknown()),
	})
	.strict();

export type HostPureType = z.infer<typeof HostModelSchema>;
