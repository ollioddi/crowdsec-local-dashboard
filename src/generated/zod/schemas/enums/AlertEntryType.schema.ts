import * as z from 'zod';

export const AlertEntryTypeSchema = z.enum(['paths', 'ports', 'usernames', 'rules', 'none'])

export type AlertEntryType = z.infer<typeof AlertEntryTypeSchema>;