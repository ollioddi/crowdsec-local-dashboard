import type { Row } from "@tanstack/react-table";
import { ExternalLink, Trash2 } from "lucide-react";
import { RelativeTime } from "@/components/relative-dates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DecisionWithHost } from "@/lib/decisions.functions";

function originVariant(origin: string) {
	switch (origin.toLowerCase()) {
		case "cscli":
			return "outline" as const;
		case "capi":
			return "secondary" as const;
		default:
			return "default" as const;
	}
}

interface DecisionExpandedRowProps {
	row: Row<DecisionWithHost>;
	onDelete: (id: number) => void;
}

export function DecisionExpandedRow({
	row,
	onDelete,
}: Readonly<DecisionExpandedRowProps>) {
	const decision = row.original;

	return (
		<div className="px-1 py-2 space-y-4">
			<div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
				<div className="col-span-2">
					<p className="text-xs font-medium text-muted-foreground mb-0.5">
						Scenario
					</p>
					<span className="font-medium break-all">
						{decision.scenario.replace("crowdsecurity/", "")}
					</span>
				</div>
				<div>
					<p className="text-xs font-medium text-muted-foreground mb-0.5">
						Origin
					</p>
					<Badge variant={originVariant(decision.origin)}>
						{decision.origin}
					</Badge>
				</div>
				<div>
					<p className="text-xs font-medium text-muted-foreground mb-0.5">
						Country
					</p>
					<span>{decision.host.country ?? "-"}</span>
				</div>
				<div>
					<p className="text-xs font-medium text-muted-foreground mb-0.5">
						Duration
					</p>
					<span>{decision.duration}</span>
				</div>
				<div>
					<p className="text-xs font-medium text-muted-foreground mb-0.5">
						Expires
					</p>
					<RelativeTime date={decision.expiresAt} />
				</div>
			</div>
			<div className="flex gap-2">
				{decision.active && (
					<Button
						variant="destructive"
						size="sm"
						className="flex-1"
						onClick={() => onDelete(decision.id)}
					>
						<Trash2 className="mr-1.5 size-4" />
						Delete
					</Button>
				)}
				<Button
					variant="default"
					size="sm"
					className="flex-1"
					onClick={() =>
						window.open(
							`https://app.crowdsec.net/cti/${decision.hostIp}`,
							"_blank",
						)
					}
				>
					<ExternalLink className="mr-1.5 size-4" />
					CrowdSec CTI
				</Button>
			</div>
		</div>
	);
}
