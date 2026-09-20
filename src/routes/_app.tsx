import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	createFileRoute,
	Outlet,
	redirect,
	useLoaderData,
} from "@tanstack/react-router";
import { type ReactNode, useCallback, useEffect } from "react";
import { getSessionFn } from "@/common/auth/auth.functions";
import { AppSidebar } from "@/common/components/app-sidebar";
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
							<header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
								<SidebarTrigger className="-ml-1" />
							</header>
							<SyncStatusBanner status={syncStatus} />
							<main className="flex-1 overflow-auto">{children}</main>
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
