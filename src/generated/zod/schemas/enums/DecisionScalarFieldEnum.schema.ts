import * as z from 'zod';

export const DecisionScalarFieldEnumSchema = z.enum(['id', 'hostIp', 'type', 'origin', 'scenario', 'duration', 'scope', 'simulated', 'createdAt', 'expiresAt', 'active'])

export type DecisionScalarFieldEnum = z.infer<typeof DecisionScalarFieldEnumSchema>;