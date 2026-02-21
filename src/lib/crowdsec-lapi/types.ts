import z from "zod";

// Re-export Prisma-generated Zod enums — single source of truth
export {
	type DecisionOrigin,
	DecisionOriginSchema,
	type DecisionType,
	DecisionTypeSchema,
} from "@/generated/zod/schemas";

import type { DecisionOrigin, DecisionType } from "@/generated/zod/schemas";

export const LapiConfigSchema = z.object({
	url: z.url(),
	bouncerApiToken: z.string().min(1),
	machineId: z.string().min(1).optional(),
	machinePassword: z.string().min(1).optional(),
});

export type LapiConfig = z.infer<typeof LapiConfigSchema>;

export type OkConnectionHealth = {
	status: "OK";
	error: null;
};

export type ErrorConnectionHealth = {
	status: "ERROR";
	error:
		| "INVALID_API_TOKEN"
		| "SECURITY_ENGINE_SERVER_ERROR"
		| "SECURITY_ENGINE_UNREACHABLE"
		| "UNEXPECTED_STATUS";
};

export type ConnectionHealth = OkConnectionHealth | ErrorConnectionHealth;

export type CrowdSecDecision = {
	id: number;
	origin: DecisionOrigin;
	type: DecisionType;
	scope: string;
	value: string;
	duration: string;
	until?: string;
	scenario: string;
	simulated: boolean;
};

export type WatcherAuthResponse = {
	code: number;
	expire: string;
	token: string;
};

export type DecisionStreamResponse = {
	new: CrowdSecDecision[] | null;
	deleted: CrowdSecDecision[] | null;
};

export type DeleteDecisionResponse = {
	nbDeleted: string;
};

export type AlertEvent = {
	timestamp: string;
	meta: Array<{ key: string; value: string }>;
};

export type CrowdSecAlert = {
	id: number;
	scenario: string;
	message: string;
	events_count: number;
	start_at: string;
	stop_at: string;
	created_at: string;
	source: {
		scope: string;
		value: string;
		ip?: string;
		range?: string;
		as_name?: string;
		as_number?: string;
		cn?: string;
		latitude?: number;
		longitude?: number;
	};
	events: AlertEvent[];
	decisions: CrowdSecDecision[];
};

export type AlertFilters = {
	scope?: string;
	value?: string;
	ip?: string;
	range?: string;
	scenario?: string;
	since?: string;
	until?: string;
	limit?: number;
	has_active_decision?: boolean;
};
