import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	createFileRoute,
	Outlet,
	redirect,
	useLoaderData,
	useRouter,
} from "@tanstack/react-router";
import { type ReactNode, useCallback, useEffect } from "react";
import { getSessionFn } from "@/common/auth/auth.functions";
import { AppSidebar } from "@/common/components/app-sidebar";
import { OfflineBanner } from "@/common/components/offline-banner";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/common/components/ui/sidebar";
import { Toaster } from "@/common/components/ui/sonner";
import { TooltipProvider } from "@/common/components/ui/tooltip";
import { SessionProvider } from "@/common/context/session-provider";
import { ThemeProvider } from "@/common/context/theme-provider";
import { useSSEConnection } from "@/common/hooks/use-sse-connection";
import {
	type SyncStatus,
	syncStatusQueryOptions,
} from "@/features/sync/api/sync-status.functions";
import { SyncStatusBanner } from "@/features/sync/components/sync-status-banner";

export const Route = createFileRoute("/_app")({
	component: AppLayout,
	// Server functions check the session themselves; re-running this per
	// navigation tore down the whole shell when offline
	staleTime: Infinity,
	loader: async ({ context }) => {
		const session = await getSessionFn();
		if (!session) {
			throw redirect({ to: "/login" });
		}
		await context.queryClient.query({
			...syncStatusQueryOptions,
			staleTime: "static",
		});
		return { session };
	},
});

const AppShell = ({ children }: Readonly<{ children: ReactNode }>) => {
	const { session } = useLoaderData({ from: "/_app" });
	const queryClient = useQueryClient();
	const { data: syncStatus } = useQuery(syncStatusQueryOptions);
	const handleSyncStatus = useCallback(
		(status: SyncStatus) => queryClient.setQueryData(["sync-status"], status),
		[queryClient],
	);
	useSSEConnection<SyncStatus>("/sse/sync-status", handleSyncStatus);

	// Route components are code-split; fetching them now means a page never
	// visited still opens offline instead of failing on its chunk
	const router = useRouter();
	useEffect(() => {
		for (const route of Object.values(router.routesById)) {
			if (route.id.startsWith("/_app/")) router.loadRouteChunk(route);
		}
	}, [router]);

	useEffect(() => {
		let hiddenAt = 0;
		const THRESHOLD_MS = 30_000;

		const handleVisibility = () => {
			if (document.visibilityState === "hidden") {
				hiddenAt = Date.now();
			} else if (document.visibilityState === "visible") {
				if (Date.now() - hiddenAt > THRESHOLD_MS) {
					queryClient.invalidateQueries();
				}
			}
		};

		document.addEventListener("visibilitychange", handleVisibility);
		return () =>
			document.removeEventListener("visibilitychange", handleVisibility);
	}, [queryClient]);

	return (
		<ThemeProvider storageKey="crowdsec-dashboard-theme">
			<TooltipProvider>
				<SessionProvider session={session}>
					<SidebarProvider>
						<Toaster position="top-right" />
						<AppSidebar />
						<SidebarInset>
							<header className="flex h-12 shrink-0 items-center gap-2 border-b px-2 pt-[env(safe-area-inset-top)] sm:px-4">
								<SidebarTrigger className="-ml-1 size-9 sm:size-8" />
							</header>
							<OfflineBanner />
							<SyncStatusBanner status={syncStatus} />
							<div className="flex min-h-0 flex-1 flex-col">{children}</div>
						</SidebarInset>
					</SidebarProvider>
				</SessionProvider>
			</TooltipProvider>
		</ThemeProvider>
	);
};

function AppLayout() {
	return (
		<AppShell>
			<Outlet />
		</AppShell>
	);
}
