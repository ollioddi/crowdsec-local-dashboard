import { TriangleAlert } from "lucide-react";
import { useRelativeTime } from "@/common/hooks/use-relative-time";
import type { SyncStatus } from "@/features/sync/api/sync-status.functions";

export function SyncStatusBanner({
	status,
}: Readonly<{ status: SyncStatus | undefined }>) {
	const lastSuccess = useRelativeTime(status?.lastSuccessAt);
	const lastAttempt = useRelativeTime(status?.lastAttemptAt);

	if (!status) return null;

	if (!status.configured) {
		return (
			<Banner tone="warning" title="CrowdSec sync is not configured">
				Set LAPI_URL and LAPI_BOUNCER_API_TOKEN to start mirroring decisions.
			</Banner>
		);
	}

	if (status.error) {
		return (
			<Banner tone="error" title="Cannot reach CrowdSec LAPI">
				<span className="font-mono text-xs break-all">{status.error}</span>
				<span className="text-xs">
					Last successful sync: {status.lastSuccessAt ? lastSuccess : "never"}
					{" · "}last attempt {lastAttempt}
				</span>
			</Banner>
		);
	}

	return null;
}

function Banner({
	tone,
	title,
	children,
}: Readonly<{
	tone: "warning" | "error";
	title: string;
	children: React.ReactNode;
}>) {
	const toneClass =
		tone === "error"
			? "border-destructive/40 bg-destructive/10 text-destructive"
			: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400";
	return (
		<div
			role="status"
			className={`flex items-start gap-3 border-b px-4 py-2 text-sm ${toneClass}`}
		>
			<TriangleAlert className="mt-0.5 size-4 shrink-0" />
			<div className="flex flex-col gap-0.5">
				<span className="font-medium">{title}</span>
				{children}
			</div>
		</div>
	);
}
