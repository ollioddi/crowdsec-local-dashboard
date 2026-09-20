import { RefreshCw } from "lucide-react";
import { cn } from "@/common/lib/utils";

/** Pushed into view by the pull itself. */
export function PullToRefreshIndicator({
	distance,
	progress,
	refreshing,
}: Readonly<{ distance: number; progress: number; refreshing: boolean }>) {
	if (distance === 0 && !refreshing) return null;

	return (
		<div
			className="flex items-center justify-center overflow-hidden"
			style={{ height: distance }}
			aria-live="polite"
		>
			<span className="flex items-center gap-2 text-xs text-muted-foreground">
				<RefreshCw
					className={cn("size-4", refreshing && "animate-spin")}
					style={
						refreshing
							? undefined
							: { transform: `rotate(${progress * 270}deg)` }
					}
				/>
				{refreshing
					? "Refreshing…"
					: progress >= 1
						? "Release to refresh"
						: "Pull to refresh"}
			</span>
		</div>
	);
}
