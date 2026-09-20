import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/common/auth/auth.middleware";

export const getSyncStatusFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async () => {
		const { getSyncStatus } = await import("@/features/sync/lib/status");
		return getSyncStatus();
	});

export type SyncStatus = Awaited<ReturnType<typeof getSyncStatusFn>>;

export const syncStatusQueryOptions = {
	queryKey: ["sync-status"],
	queryFn: () => getSyncStatusFn(),
	staleTime: Number.POSITIVE_INFINITY,
};
