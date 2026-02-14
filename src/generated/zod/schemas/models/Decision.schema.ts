import * as z from "zod";
import { DecisionOriginSchema } from "../enums/DecisionOrigin.schema";
import { DecisionTypeSchema } from "../enums/DecisionType.schema";

export const DecisionSchema = z.object({
	id: z.number().int(),
	hostIp: z.string(),
	type: DecisionTypeSchema,
	origin: DecisionOriginSchema,
	scenario: z.string(),
	duration: z.string(),
	createdAt: z.date(),
	expiresAt: z.date().nullish(),
	active: z.boolean().default(true),
});

export type DecisionType = z.infer<typeof DecisionSchema>;
