import { ExternalLink, Trash2 } from "lucide-react";
import type { DataTableColumnDef } from "@/common/components/data-table/table-features";
import { IPLinkBadge } from "@/common/components/ip-badge";
import { RelativeTime } from "@/common/components/relative-dates";
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import { countryFlag } from "@/common/lib/country-flag";
import type { DecisionWithHost } from "@/features/decisions/api/decisions.functions";

export function shortScenario(scenario: string) {
	return scenario.replace(/^(crowdsecurity|firewallservices)\//, "");
}

function typeVariant(type: string) {
	switch (type.toLowerCase()) {
		case "ban":
			return "destructive" as const;
		case "captcha":
			return "secondary" as const;
		default:
			return "outline" as const;
	}
}

export function createColumns(
	onDelete: (id: number, collapse?: () => void) => void,
	deletingId: number | undefined,
): DataTableColumnDef<DecisionWithHost>[] {
	return [
		{
			accessorKey: "hostIp",
			header: "Host",
			meta: {
				sortable: true,
				filter: "text",
				globalFilter: true,
				card: "title",
			},
			cell: ({ row }) => (
				<span className="flex items-center gap-2">
					<span title={row.original.host.country ?? undefined}>
						{countryFlag(row.original.host.country)}
					</span>
					<IPLinkBadge ip={row.original.hostIp} />
				</span>
			),
		},
		{
			accessorKey: "type",
			header: "Decision",
			size: 150,
			meta: { filter: "select", card: "badge" },
			cell: ({ row }) => (
				<span className="flex flex-wrap items-center gap-1">
					<Badge variant={typeVariant(row.original.type)}>
						{row.original.type}
					</Badge>
					{!row.original.active && <Badge variant="outline">expired</Badge>}
				</span>
			),
		},
		{
			id: "status",
			accessorFn: (row) => (row.active ? "Active" : "Expired"),
			header: "Status",
			meta: { filterOnly: true, filter: "select", sortable: true },
		},
		{
			accessorKey: "scenario",
			header: "Scenario",
			meta: { sortable: true, filter: "text", globalFilter: true },
			cell: ({ row }) => {
				const entries = new Set(row.original.alerts.flatMap((a) => a.entries));
				return (
					<span className="flex min-w-0 flex-col">
						<span
							className="truncate font-medium"
							title={row.original.scenario}
						>
							{shortScenario(row.original.scenario)}
						</span>
						<span className="truncate text-xs text-muted-foreground">
							via {row.original.origin}
							{entries.size > 0 &&
								` · ${entries.size} entr${entries.size === 1 ? "y" : "ies"}`}
						</span>
					</span>
				);
			},
		},
		{
			accessorKey: "origin",
			header: "Origin",
			meta: { filterOnly: true, filter: "select" },
		},
		{
			id: "country",
			accessorFn: (row) => row.host.country ?? "",
			header: "Country",
			meta: { filterOnly: true, filter: "select", sortable: true },
		},
		{
			accessorKey: "expiresAt",
			header: "Expires",
			size: 170,
			meta: { sortable: true, filter: "date" },
			cell: ({ row }) =>
				row.original.active ? (
					<span className="flex flex-col">
						<RelativeTime date={row.original.expiresAt} />
						<span className="text-xs text-muted-foreground">
							{row.original.duration}
						</span>
					</span>
				) : (
					<span className="text-muted-foreground">—</span>
				),
		},
		{
			accessorKey: "createdAt",
			header: "Created",
			meta: { filterOnly: true, filter: "date", sortable: true },
		},
		{
			id: "actions",
			size: 90,
			cell: ({ row }) => {
				const decision = row.original;
				return (
					<span className="flex items-center justify-end gap-1">
						{decision.active && (
							<Button
								variant="ghost"
								size="icon-sm"
								aria-label="Delete decision"
								loading={deletingId === decision.id}
								onClick={() => onDelete(decision.id)}
							>
								<Trash2 className="size-4" />
							</Button>
						)}
						<Button variant="ghost" size="icon-sm" asChild>
							<a
								href={`https://app.crowdsec.net/cti/${decision.hostIp}`}
								target="_blank"
								rel="noreferrer"
								aria-label="View in CrowdSec CTI"
							>
								<ExternalLink className="size-4" />
							</a>
						</Button>
					</span>
				);
			},
		},
	];
}
