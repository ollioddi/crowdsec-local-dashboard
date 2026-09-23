import * as z from 'zod';
import { AlertEntryTypeSchema } from '../../enums/AlertEntryType.schema';
// prettier-ignore
export const AlertModelSchema = z.object({
    id: z.number().int(),
    scenario: z.string(),
    message: z.string(),
    createdAt: z.date(),
    entries: z.string(),
    entryType: AlertEntryTypeSchema,
    startAt: z.date().nullable(),
    stopAt: z.date().nullable(),
    eventsCount: z.number().int().nullable(),
    hostIp: z.string(),
    host: z.unknown(),
    decisions: z.array(z.unknown()),
    integration: z.string().nullable(),
    machineId: z.string().nullable(),
    uuid: z.string().nullable(),
    scenarioVersion: z.string().nullable(),
    capacity: z.number().int().nullable(),
    leakspeed: z.string().nullable(),
    simulated: z.boolean(),
    remediation: z.boolean().nullable(),
    sourceScope: z.string().nullable(),
    sourceRange: z.string().nullable(),
    events: z.string(),
    meta: z.string()
}).strict();

export type AlertPureType = z.infer<typeof AlertModelSchema>;
