import { cn } from "cn";
import { useOnline } from "@/common/hooks/use-online";
import { useRelativeTime } from "@/common/hooks/use-relative-time";
import type { SSEStatus } from "@/common/hooks/use-sse-connection";

interface LiveIndicatorProps {
	status: SSEStatus;
	/** When the data last changed, from the query cache. */
	updatedAt?: number;
}

const STATES = {
	offline: { dot: "bg-muted-foreground", label: "Offline" },
	connecting: { dot: "bg-amber-500", label: "Connecting" },
	live: { dot: "bg-green-500", label: "Live" },
	down: { dot: "bg-red-500", label: "Disconnected" },
} as const;

/** The browser's offline verdict wins over whatever the stream last said. */
export function LiveIndicator({
	status,
	updatedAt,
}: Readonly<LiveIndicatorProps>) {
	const online = useOnline();
	const state = STATES[online ? status : "offline"];
	const updated = useRelativeTime(updatedAt ? new Date(updatedAt) : null, {
		precise: true,
	});

	return (
		<div
			className="flex items-center gap-1.5 text-sm text-muted-foreground"
			aria-live="polite"
		>
			<span
				className={cn("inline-block size-2 shrink-0 rounded-full", state.dot)}
			/>
			<span>{state.label}</span>
			{updatedAt ? (
				<span className="hidden text-xs sm:inline">· updated {updated}</span>
			) : null}
		</div>
	);
}
