import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import type { DataTableColumnDef } from "@/common/components/data-table/table-features";
import { IPCopyBadge } from "@/common/components/ip-badge";
import { RelativeTime } from "@/common/components/relative-dates";
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import { countryFlag } from "@/common/lib/country-flag";
import type { HostWithCount } from "@/features/hosts/api/hosts.functions";

/** A host with no active decisions links to its expired ones, not an empty list */
export function hostDecisions(host: HostWithCount) {
	const hasActive = host._count.decisions > 0;
	const hasHistory = host.totalBans > 0;
	const status = {
		operator: "isAnyOf" as const,
		value: [hasActive ? "Active" : "Expired"],
	};

	return {
		label: decisionsLabel(hasActive, hasHistory),
		link: {
			to: "/decisions" as const,
			search: {
				filters: {
					hostIp: { operator: "equals" as const, value: host.ip },
					...(hasActive || hasHistory ? { status } : {}),
				},
			},
		},
	};
}

function decisionsLabel(hasActive: boolean, hasHistory: boolean) {
	if (hasActive) return "View active decisions";
	if (hasHistory) return "View expired decisions";
	return "View decisions";
}

export const columns: DataTableColumnDef<HostWithCount>[] = [
	{
		accessorKey: "ip",
		header: "Host",
		meta: { sortable: true, filter: "text", globalFilter: true, card: "title" },
		cell: ({ row }) => (
			<span className="flex items-center gap-2">
				<span title={row.original.country ?? undefined}>
					{countryFlag(row.original.country)}
				</span>
				<IPCopyBadge ip={row.original.ip} />
			</span>
		),
	},
	{
		id: "activeDecisions",
		accessorFn: (row) => row._count.decisions,
		header: "Active",
		size: 90,
		meta: { sortable: true, filter: "number" },
		cell: ({ row }) => {
			const count = row.original._count.decisions;
			return (
				<Badge variant={count > 0 ? "destructive" : "secondary"}>{count}</Badge>
			);
		},
	},
	{
		accessorKey: "totalBans",
		header: "Total bans",
		size: 110,
		meta: { sortable: true, filter: "number" },
	},
	{
		id: "country",
		accessorFn: (row) => row.country ?? "",
		header: "Country",
		meta: { filterOnly: true, filter: "select", sortable: true },
	},
	{
		accessorKey: "firstSeen",
		header: "First seen",
		meta: { sortable: true, filter: "date" },
		cell: ({ row }) => <RelativeTime date={row.original.firstSeen} />,
	},
	{
		accessorKey: "lastSeen",
		header: "Last seen",
		meta: { sortable: true, filter: "date" },
		cell: ({ row }) => <RelativeTime date={row.original.lastSeen} />,
	},
	{
		id: "actions",
		size: 60,
		cell: ({ row }) => {
			const { label, link } = hostDecisions(row.original);
			return (
				<Button variant="ghost" size="icon-sm" asChild>
					<Link {...link} aria-label={label}>
						<ExternalLink className="size-4" />
					</Link>
				</Button>
			);
		},
	},
];
