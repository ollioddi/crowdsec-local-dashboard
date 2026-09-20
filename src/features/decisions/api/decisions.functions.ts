import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/common/auth/auth.middleware";
import { logger } from "@/common/lib/logging/logger";

/**
 * Get all decisions from the database.
 * The background sync loop keeps the DB in sync with LAPI.
 */
export const getDecisionsFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async () => {
		const { prisma } = await import("@/common/lib/db");
		const rows = await prisma.decision.findMany({
			include: {
				host: true,
				alerts: {
					select: { id: true, entries: true, entryType: true, scenario: true },
				},
			},
			orderBy: { createdAt: "desc" },
		});
		return rows.map((decision) => ({
			...decision,
			alerts: decision.alerts.map((alert) => ({
				id: alert.id,
				scenario: alert.scenario,
				entries: JSON.parse(alert.entries) as string[],
				entryType: alert.entryType,
			})),
		}));
	});

export type DecisionWithHost = Awaited<
	ReturnType<typeof getDecisionsFn>
>[number];

/**
 * Fetch full alert data (including parsed events) for a single decision.
 * Intended for the expanded row — fetched lazily on expand.
 */
export const getDecisionAlertsFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(z.object({ decisionId: z.number() }))
	.handler(async ({ data }) => {
		const { prisma } = await import("@/common/lib/db");
		const { parseAlertEvent } = await import(
			"@/common/alert-types/alert-types"
		);

		const decision = await prisma.decision.findUnique({
			where: { id: data.decisionId },
			include: { alerts: true },
		});
		if (!decision?.alerts.length) return [];

		type AlertEventRaw = import("@/common/crowdsec-lapi/types").AlertEvent;

		return decision.alerts.map((alert) => ({
			id: alert.id,
			scenario: alert.scenario,
			message: alert.message,
			createdAt: alert.createdAt,
			entries: JSON.parse(alert.entries) as string[],
			entryType: alert.entryType,
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
	.middleware([authMiddleware])
	.validator(z.object({ id: z.number() }))
	.handler(async ({ data, context }) => {
		const { prisma } = await import("@/common/lib/db");
		const { getLapiClient } = await import(
			"@/common/crowdsec-lapi/get-lapi-client"
		);
		const { broadcastCurrentState } = await import(
			"@/common/lib/broadcast-state.server"
		);
		const log = logger("decisions");

		const decision = await prisma.decision.findUnique({
			where: { id: data.id },
			select: { hostIp: true },
		});
		const result = await getLapiClient().deleteDecisionById(data.id);
		log.info("Decision {id} for {ip} removed by {by}", {
			id: data.id,
			ip: decision?.hostIp,
			by: context.session.user.name,
			stillInLapi: result.deleted,
		});

		const expiresAt = new Date();
		await prisma.decision.updateMany({
			where: { id: data.id },
			data: { active: false, expiresAt },
		});
		// Other tabs and the hosts page see the change now, not at the next poll
		await broadcastCurrentState();

		return { deleted: result.deleted, expiresAt };
	});
