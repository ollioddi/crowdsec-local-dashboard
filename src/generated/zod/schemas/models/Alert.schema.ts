import * as z from 'zod';
import { AlertEntryTypeSchema } from '../enums/AlertEntryType.schema';

export const AlertSchema = z.object({
  id: z.number().int(),
  scenario: z.string(),
  message: z.string(),
  createdAt: z.date(),
  entries: z.string().default("[]"),
  entryType: AlertEntryTypeSchema.default("none"),
  startAt: z.date().nullish(),
  stopAt: z.date().nullish(),
  eventsCount: z.number().int().nullish(),
  hostIp: z.string(),
  integration: z.string().nullish(),
  machineId: z.string().nullish(),
  uuid: z.string().nullish(),
  scenarioVersion: z.string().nullish(),
  capacity: z.number().int().nullish(),
  leakspeed: z.string().nullish(),
  simulated: z.boolean(),
  remediation: z.boolean().nullish(),
  sourceScope: z.string().nullish(),
  sourceRange: z.string().nullish(),
  events: z.string().default("[]"),
  meta: z.string().default("{}"),
});

export type AlertType = z.infer<typeof AlertSchema>;
