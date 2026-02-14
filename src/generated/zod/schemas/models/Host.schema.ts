import * as z from "zod";

export const HostSchema = z.object({
	id: z.string(),
	ip: z.string(),
	scope: z.string().default("Ip"),
	firstSeen: z.date(),
	lastSeen: z.date(),
	totalBans: z.number().int(),
	country: z.string().nullish(),
	asNumber: z.string().nullish(),
	asName: z.string().nullish(),
	latitude: z.number().nullish(),
	longitude: z.number().nullish(),
});

export type HostType = z.infer<typeof HostSchema>;
