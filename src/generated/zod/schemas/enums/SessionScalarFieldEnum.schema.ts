import * as z from 'zod';

export const SessionScalarFieldEnumSchema = z.enum(['id', 'expiresAt', 'token', 'createdAt', 'updatedAt', 'ipAddress', 'userAgent', 'userId'])

export type SessionScalarFieldEnum = z.infer<typeof SessionScalarFieldEnumSchema>;