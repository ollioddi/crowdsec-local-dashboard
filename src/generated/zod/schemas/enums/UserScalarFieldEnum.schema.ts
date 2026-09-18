import * as z from 'zod';

export const UserScalarFieldEnumSchema = z.enum(['id', 'name', 'email', 'emailVerified', 'image', 'createdAt', 'updatedAt', 'username', 'displayUsername'])

export type UserScalarFieldEnum = z.infer<typeof UserScalarFieldEnumSchema>;