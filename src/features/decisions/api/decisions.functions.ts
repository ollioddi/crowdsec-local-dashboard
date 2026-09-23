import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/common/auth/auth.middleware";
import { logger } from "@/common/lib/logging/logger";
import type { AlertDetail } from "@/features/decisions/api/alert-detail";
import type { DecisionsPayload } from "@/features/decisions/api/decisions.types";

/**
 * Get all decisions from the database.
 * The background sync loop keeps the DB in sync with LAPI.
 *
 * Hosts come back as a separate lookup rather than embedded per row; see
 * `joinDecisionHosts` for the client-side join.
 */
export const getDecisionsFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async (): Promise<DecisionsPayload> => {
		const { queryDecisionsPayload } = await import(
			"@/features/decisions/api/decisions-query.server"
		);
		return queryDecisionsPayload();
	});

/**
 * Fetch full alert data (including parsed events) for a single decision.
 * Intended for the expanded row, fetched lazily on expand.
 */
export const getDecisionAlertsFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(z.object({ decisionId: z.number() }))
	.handler(async ({ data }): Promise<AlertDetail[]> => {
		const { prisma } = await import("@/common/lib/db");
		const { alertDetailFromRow } = await import(
			"@/features/decisions/api/alert-detail"
		);

		const decision = await prisma.decision.findUnique({
			where: { id: data.decisionId },
			include: { alerts: true },
		});
		return decision?.alerts.map(alertDetailFromRow) ?? [];
	});

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
