import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import type { DataTableColumnDef } from "@/common/components/data-table/table-features";
import { IPCopyBadge } from "@/common/components/ip-badge";
import { RelativeTime } from "@/common/components/relative-dates";
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import type { HostWithCount } from "@/features/hosts/api/hosts.functions";

export const columns: DataTableColumnDef<HostWithCount>[] = [
	{
		accessorKey: "ip",
		header: "IP Address",
		meta: {
			sortable: true,
			globalFilter: true,
			mobileHeader: "IP",
			visibleByDefault: true,
		},
		cell: ({ row }) => <IPCopyBadge ip={row.getValue("ip")} />,
	},
	{
		id: "activeDecisions",
		header: "Active",
		size: 70,
		meta: { sortable: true, mobileHeader: "#", visibleByDefault: true },
		accessorFn: (row) => row._count.decisions,
		cell: ({ row }) => {
			const count = row.getValue<number>("activeDecisions");
			return (
				<Badge variant={count > 0 ? "destructive" : "secondary"}>{count}</Badge>
			);
		},
	},
	{
		accessorKey: "totalBans",
		header: "Total Bans",
		size: 70,
		meta: {
			sortable: true,
			visibleByDefault: { desktop: true, mobile: false },
			expandedLabel: "Total Bans",
		},
	},
	{
		accessorKey: "country",
		header: "Country",
		size: 80,
		meta: {
			sortable: true,
			globalFilter: true,
			filterVariant: "select",
			mobileHeader: "Co.",
			visibleByDefault: true,
		},
		filterFn: "isOneOf",
		cell: ({ row }) => row.getValue("country") ?? "-",
	},
	{
		accessorKey: "firstSeen",
		header: "First Seen",
		meta: {
			sortable: true,
			visibleByDefault: { desktop: true, mobile: false },
			expandedLabel: "First Seen",
		},
		cell: ({ row }) => (
			<RelativeTime date={row.getValue<string>("firstSeen")} />
		),
	},
	{
		accessorKey: "lastSeen",
		header: "Last Seen",
		meta: {
			sortable: true,
			visibleByDefault: { desktop: true, mobile: false },
			expandedLabel: "Last Seen",
		},
		cell: ({ row }) => <RelativeTime date={row.getValue<string>("lastSeen")} />,
	},
	{
		id: "actions",
		meta: {
			visibleByDefault: { desktop: true, mobile: false },
			expandedLabel: "",
		},
		cell: ({ row }) => {
			const host = row.original;
			return (
				<Button variant="default" size="sm" asChild>
					<Link to="/decisions" search={{ hostIp: host.ip, active: true }}>
						<ExternalLink className="mr-1" />
						Decisions
					</Link>
				</Button>
			);
		},
	},
];
