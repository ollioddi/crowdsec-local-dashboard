import { useRelativeTime } from "@/common/hooks/use-relative-time";
import { cn } from "@/common/lib/utils";

interface LiveIndicatorProps {
	connected: boolean;
	/** When the data last changed, from the query cache. */
	updatedAt?: number;
}

export function LiveIndicator({
	connected,
	updatedAt,
}: Readonly<LiveIndicatorProps>) {
	const updated = useRelativeTime(updatedAt ? new Date(updatedAt) : null, {
		precise: true,
	});

	return (
		<div className="flex items-center gap-1.5 text-sm text-muted-foreground">
			<span
				className={cn(
					"inline-block size-2 shrink-0 rounded-full",
					connected ? "bg-green-500" : "bg-red-500",
				)}
			/>
			<span>{connected ? "Live" : "Disconnected"}</span>
			{updatedAt ? (
				<span className="hidden text-xs sm:inline">· updated {updated}</span>
			) : null}
		</div>
	);
}
