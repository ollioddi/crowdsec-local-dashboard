import { Link } from "@tanstack/react-router";
import type { Row } from "@tanstack/react-table";
import { ExternalLink } from "lucide-react";
import { RelativeTime } from "@/components/relative-dates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { HostWithCount } from "@/lib/hosts.functions";

export function HostExpandedRow({ row }: { row: Row<HostWithCount> }) {
	const host = row.original;
	const activeCount = host._count.decisions;

	return (
		<div className="px-1 py-2 space-y-4">
			<div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
				<div>
					<p className="text-xs font-medium text-muted-foreground mb-0.5">
						Active Decisions
					</p>
					<Badge variant={activeCount > 0 ? "destructive" : "secondary"}>
						{activeCount}
					</Badge>
				</div>
				<div>
					<p className="text-xs font-medium text-muted-foreground mb-0.5">
						Total Bans
					</p>
					<span className="font-medium">{host.totalBans ?? 0}</span>
				</div>
				<div>
					<p className="text-xs font-medium text-muted-foreground mb-0.5">
						First Seen
					</p>
					<RelativeTime date={host.firstSeen} />
				</div>
				<div>
					<p className="text-xs font-medium text-muted-foreground mb-0.5">
						Last Seen
					</p>
					<RelativeTime date={host.lastSeen} />
				</div>
			</div>
			<Button size="sm" asChild className="w-full">
				<Link to="/decisions" search={{ hostIp: host.ip, active: true }}>
					<ExternalLink className="mr-1.5 size-4" />
					View Decisions
				</Link>
			</Button>
		</div>
	);
}
