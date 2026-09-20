import { ChevronDown, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useRelativeTime } from "@/common/hooks/use-relative-time";
import { cn } from "@/common/lib/utils";
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

	if (status.alerts === "unconfigured") {
		return (
			<Banner tone="warning" title="Syncing decisions without alert evidence">
				<span className="text-xs">{status.alertError}</span>
				<span className="text-xs">
					Add watcher credentials to see which requests, ports or usernames
					triggered each decision.
				</span>
			</Banner>
		);
	}

	if (status.alerts === "failing") {
		return (
			<Banner tone="warning" title="Cannot fetch alert evidence">
				<span className="font-mono text-xs break-all">{status.alertError}</span>
				<span className="text-xs">
					Decisions are still syncing. Expanded rows and ASN data will be empty
					until this recovers.
				</span>
			</Banner>
		);
	}

	return null;
}

/** One line by default, detail on tap. */
function Banner({
	tone,
	title,
	children,
}: Readonly<{
	tone: "warning" | "error";
	title: string;
	children: React.ReactNode;
}>) {
	const [open, setOpen] = useState(false);
	const toneClass =
		tone === "error"
			? "border-destructive/40 bg-destructive/10 text-destructive"
			: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400";

	return (
		<div
			role="status"
			data-slot="sync-banner"
			className={cn("shrink-0 border-b text-sm", toneClass)}
		>
			<button
				type="button"
				aria-expanded={open}
				onClick={() => setOpen((value) => !value)}
				className="flex w-full items-center gap-2 px-4 py-2 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
			>
				<TriangleAlert className="size-4 shrink-0" />
				<span className="min-w-0 flex-1 truncate font-medium">{title}</span>
				<ChevronDown
					className={cn(
						"size-4 shrink-0 transition-transform",
						open && "rotate-180",
					)}
				/>
			</button>
			{open && (
				<div className="flex flex-col gap-0.5 px-4 pb-2 pl-10">{children}</div>
			)}
		</div>
	);
}
