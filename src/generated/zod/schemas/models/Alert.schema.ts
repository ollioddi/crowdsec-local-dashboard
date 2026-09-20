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
  events: z.string().default("[]"),
});

export type AlertType = z.infer<typeof AlertSchema>;
