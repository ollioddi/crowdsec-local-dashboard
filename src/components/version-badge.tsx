import { useQuery } from "@tanstack/react-query";
import { ArrowUpCircle, Tag } from "lucide-react";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { APP_VERSION, isNewerVersion, RELEASES_URL } from "@/lib/version";
import {
	type VersionInfo,
	versionInfoQueryOptions,
} from "@/lib/version.functions";

/** Running version in the sidebar footer, with a link to the newest tagged release. */
export function VersionBadge() {
	const { data } = useQuery(versionInfoQueryOptions);
	const release = describeRelease(data);
	const Icon = release.updateAvailable ? ArrowUpCircle : Tag;

	return (
		<SidebarMenuButton
			asChild
			className={cn(
				"h-auto py-1.5",
				release.updateAvailable ? "text-primary" : "text-muted-foreground",
			)}
			size="sm"
			tooltip={release.tooltip}
		>
			<a href={release.url} rel="noreferrer" target="_blank">
				<Icon />
				<span className="flex min-w-0 flex-col leading-tight">
					<span className="truncate">{APP_VERSION}</span>
					{release.detail && (
						<span className="truncate text-xs">{release.detail}</span>
					)}
				</span>
			</a>
		</SidebarMenuButton>
	);
}

type ReleaseView = {
	updateAvailable: boolean;
	detail?: string;
	tooltip: string;
	url: string;
};

function describeRelease(info: VersionInfo | undefined): ReleaseView {
	const latest = info?.latest;
	if (!latest) {
		return { updateAvailable: false, tooltip: APP_VERSION, url: RELEASES_URL };
	}
	const updateAvailable = isNewerVersion(latest.version, info.current);
	const detail = updateAvailable
		? `Update available: ${latest.version}`
		: `Latest release: ${latest.version}`;
	return {
		updateAvailable,
		detail,
		tooltip: `${APP_VERSION} · ${detail}`,
		url: latest.url,
	};
}
