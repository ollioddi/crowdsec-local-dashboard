import * as z from 'zod';

export const AlertScalarFieldEnumSchema = z.enum(['id', 'scenario', 'message', 'createdAt', 'entries', 'entryType', 'startAt', 'stopAt', 'eventsCount', 'hostIp', 'integration', 'machineId', 'uuid', 'scenarioVersion', 'capacity', 'leakspeed', 'simulated', 'remediation', 'sourceScope', 'sourceRange', 'events', 'meta'])

export type AlertScalarFieldEnum = z.infer<typeof AlertScalarFieldEnumSchema>;