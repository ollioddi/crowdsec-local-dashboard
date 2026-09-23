import * as z from 'zod';
import { DecisionTypeSchema } from '../../enums/DecisionType.schema';
// prettier-ignore
export const DecisionModelSchema = z.object({
    id: z.number().int(),
    hostIp: z.string(),
    host: z.unknown(),
    type: DecisionTypeSchema,
    origin: z.string(),
    uuid: z.string().nullable(),
    scenario: z.string(),
    duration: z.string(),
    scope: z.string(),
    simulated: z.boolean(),
    createdAt: z.date(),
    expiresAt: z.date().nullable(),
    active: z.boolean(),
    alerts: z.array(z.unknown())
}).strict();

export type DecisionPureType = z.infer<typeof DecisionModelSchema>;
