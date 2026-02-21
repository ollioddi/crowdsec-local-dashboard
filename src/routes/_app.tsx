import {
	createFileRoute,
	Outlet,
	redirect,
	useLoaderData,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SessionProvider } from "@/context/session-provider";
import { ThemeProvider } from "@/context/theme-provider";
import { getSessionFn } from "@/lib/auth/auth.functions";

export const Route = createFileRoute("/_app")({
	component: AppLayout,
	loader: async () => {
		const session = await getSessionFn();
		if (!session) {
			throw redirect({ to: "/login" });
		}
		return { session };
	},
});

const AppShell = ({ children }: Readonly<{ children: ReactNode }>) => {
	const { session } = useLoaderData({ from: "/_app" });

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
