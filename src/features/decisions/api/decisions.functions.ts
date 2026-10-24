import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/common/auth/auth.middleware";
import { errorFields, logger } from "@/common/lib/logging/logger";
import type { AlertDetail } from "@/features/decisions/api/alert-detail";
import type { DecisionsPayload } from "@/features/decisions/api/decisions.types";

export const decisionIdSchema = z.number().int().positive();

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
	.validator(z.object({ decisionId: decisionIdSchema }))
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
	.validator(z.object({ id: decisionIdSchema }))
	.handler(async ({ data, context }) => {
		const { prisma } = await import("@/common/lib/db");
		const { getLapiClient } = await import(
			"@/common/crowdsec-lapi/get-lapi-client"
		);
		const { broadcastCurrentState } = await import(
			"@/common/lib/broadcast-state.server"
		);
		const log = logger("decisions");

		// Only decisions shown in the dashboard can be deleted
		const decision = await prisma.decision.findUnique({
			where: { id: data.id },
			select: { hostIp: true },
		});
		if (!decision) {
			throw new Error(`Decision ${data.id} is not in the dashboard`);
		}
		const { user } = context.session;
		const result = await getLapiClient()
			.deleteDecisionById(data.id)
			.catch((error: unknown) => {
				// Details go to the log, not the UI
				log.error("Deleting decision {id} failed: {errorMessage}", {
					id: data.id,
					...errorFields(error),
				});
				throw new Error(
					"Could not delete the decision in CrowdSec LAPI. See the server log.",
				);
			});
		log.info("Decision {id} for {ip} removed by {by}", {
			id: data.id,
			ip: decision.hostIp,
			by: user.username ?? user.id,
			userId: user.id,
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
