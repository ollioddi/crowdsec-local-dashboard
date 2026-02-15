import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { ExternalLink } from "lucide-react";
import { RelativeTime } from "@/components/relative-dates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { HostWithCount } from "@/lib/hosts.functions";
import { IPCopyBadge } from "../users/ip-badge";

export const columns: ColumnDef<HostWithCount>[] = [
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
		filterFn: "arrIncludesSome",
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
