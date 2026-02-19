import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	DecisionOriginSchema,
	DecisionTypeSchema,
} from "./crowdsec-lapi/types";

/**
 * Get all decisions from the database.
 * The background sync loop keeps the DB in sync with LAPI.
 */
export const getDecisionsFn = createServerFn({ method: "GET" }).handler(
	async () => {
		const { prisma } = await import("@/db");
		const rows = await prisma.decision.findMany({
			include: {
				host: true,
				alerts: { select: { id: true, paths: true, scenario: true } },
			},
			orderBy: { createdAt: "desc" },
		});
		return rows.map((d) => ({
			...d,
			alerts: d.alerts.map((a) => ({
				id: a.id,
				scenario: a.scenario,
				paths: JSON.parse(a.paths) as string[],
			})),
		}));
	},
);

export type DecisionWithHost = Awaited<
	ReturnType<typeof getDecisionsFn>
>[number];

/**
 * Fetch full alert data (including parsed events) for a single decision.
 * Intended for the expanded row — fetched lazily on expand.
 */
export const getDecisionAlertsFn = createServerFn({ method: "GET" })
	.inputValidator(z.object({ decisionId: z.number() }))
	.handler(async ({ data }) => {
		const { prisma } = await import("@/db");
		const { parseAlertEvent } = await import("@/lib/parse-alert-event");

		const decision = await prisma.decision.findUnique({
			where: { id: data.decisionId },
			include: { alerts: true },
		});
		if (!decision?.alerts.length) return [];

		type AlertEventRaw = import("@/lib/crowdsec-lapi/types").AlertEvent;

		return decision.alerts.map((alert) => ({
			id: alert.id,
			scenario: alert.scenario,
			message: alert.message,
			createdAt: alert.createdAt,
			paths: JSON.parse(alert.paths) as string[],
			events: (JSON.parse(alert.events) as AlertEventRaw[]).map(
				parseAlertEvent,
			),
		}));
	});

export type DecisionAlertDetail = Awaited<
	ReturnType<typeof getDecisionAlertsFn>
>[number];

/**
 * Delete a decision from LAPI and mark inactive in DB.
 */
export const deleteDecisionFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({ id: z.number() }))
	.handler(async ({ data }) => {
		const { prisma } = await import("@/db");
		const { getLapiClient } = await import("@/lib/crowdsec-lapi");
		const { syncDecisions } = await import("@/lib/crowdsec-lapi/sync");

		console.log(`[decision-delete] Deleting decision ${data.id} from LAPI…`);

		const client = getLapiClient();

		try {
			const result = await client.deleteDecisionById(data.id);
			console.log(
				`[decision-delete] LAPI confirmed: nbDeleted=${result.nbDeleted}`,
			);

			// Mark inactive in DB immediately so the UI doesn't show stale data
			await prisma.decision.update({
				where: { id: data.id },
				data: { active: false },
			});
			console.log(
				`[decision-delete] Marked decision ${data.id} inactive in DB`,
			);

			// Do a full sync (startup=true) so the DB matches LAPI's complete state
			// A delta sync would miss the delete since it just happened
			console.log(
				"[decision-delete] Triggering full sync (forceFullSync=true)…",
			);
			await syncDecisions({ forceFullSync: true });
			console.log("[decision-delete] Sync complete");

			return result;
		} catch (error) {
			console.error(
				`[decision-delete] Failed to delete decision ${data.id}:`,
				error instanceof Error ? error.message : error,
			);
			throw error;
		}
	});

const decisionHistoryFiltersSchema = z
	.object({
		hostIp: z.string().optional(),
		active: z.boolean().optional(),
		origin: DecisionOriginSchema.optional(),
		type: DecisionTypeSchema.optional(),
	})
	.optional();

/**
 * Query historical decisions from DB (including inactive).
 */
export const getDecisionHistoryFn = createServerFn({ method: "GET" })
	.inputValidator(decisionHistoryFiltersSchema)
	.handler(async ({ data: filters }) => {
		const { prisma } = await import("@/db");
		return prisma.decision.findMany({
			where: {
				...(filters?.hostIp && { hostIp: filters.hostIp }),
				...(filters?.active !== undefined && { active: filters.active }),
				...(filters?.origin && { origin: filters.origin }),
				...(filters?.type && { type: filters.type }),
			},
			include: { host: true },
			orderBy: { createdAt: "desc" },
		});
	});
