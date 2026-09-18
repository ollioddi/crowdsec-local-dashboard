import * as z from 'zod';
// prettier-ignore
export const SessionModelSchema = z.object({
    id: z.string(),
    expiresAt: z.date(),
    token: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
    ipAddress: z.string().nullable(),
    userAgent: z.string().nullable(),
    userId: z.string(),
    user: z.unknown()
}).strict();

export type SessionPureType = z.infer<typeof SessionModelSchema>;
