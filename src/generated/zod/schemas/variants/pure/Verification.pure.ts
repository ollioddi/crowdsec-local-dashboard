import * as z from 'zod';
// prettier-ignore
export const VerificationModelSchema = z.object({
    id: z.string(),
    identifier: z.string(),
    value: z.string(),
    expiresAt: z.date(),
    createdAt: z.date(),
    updatedAt: z.date()
}).strict();

export type VerificationPureType = z.infer<typeof VerificationModelSchema>;
