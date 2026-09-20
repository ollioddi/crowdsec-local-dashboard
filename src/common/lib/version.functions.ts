import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/common/auth/auth.middleware";
import { APP_VERSION } from "./version";

export const getVersionInfoFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async () => {
		const { getLatestRelease } = await import(
			"@/common/lib/latest-release.server"
		);
		return {
			current: APP_VERSION,
			latest: await getLatestRelease(),
		};
	});

export type VersionInfo = Awaited<ReturnType<typeof getVersionInfoFn>>;

export const versionInfoQueryOptions = {
	queryKey: ["version-info"],
	queryFn: () => getVersionInfoFn(),
	staleTime: 60 * 60 * 1000,
};
