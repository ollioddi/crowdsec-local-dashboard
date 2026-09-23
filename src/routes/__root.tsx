import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import {
	createRootRouteWithContext,
	HeadContent,
	Link,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { useEffect } from "react";
import { APP_NAME } from "@/common/lib/version";
import appCss from "../styles.css?url";

interface MyRouterContext {
	queryClient: QueryClient;
}

/** Pre-paint theme-color. ThemeProvider swaps in the exact token on hydration. */
const THEME_COLORS = { light: "#ffffff", dark: "#1a1a1a" } as const;

export const Route = createRootRouteWithContext<MyRouterContext>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				// viewport-fit=cover paints into the notch; safe-area insets pad it back
				name: "viewport",
				content: "width=device-width, initial-scale=1, viewport-fit=cover",
			},
			{ name: "application-name", content: "CrowdSec Local Dashboard" },
			{ name: "apple-mobile-web-app-capable", content: "yes" },
			{ name: "apple-mobile-web-app-title", content: "CrowdSec" },
			{
				name: "apple-mobile-web-app-status-bar-style",
				content: "black-translucent",
			},
			{ name: "mobile-web-app-capable", content: "yes" },
			// One tag: head management dedupes by name. Set by the inline script.
			{ name: "theme-color", content: THEME_COLORS.dark },
			{
				title: APP_NAME,
			},
		],
		links: [
			{
				rel: "icon",
				type: "image/png",
				sizes: "96x96",
				href: "/icons/icon-96x96.png",
			},
			{
				rel: "apple-touch-icon",
				sizes: "192x192",
				href: "/icons/icon-192x192.png",
			},
			{
				rel: "manifest",
				href: "/manifest.json",
			},
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),

	shellComponent: RootDocument,
	notFoundComponent: NotFound,
});

function NotFound() {
	return (
		<div className="flex min-h-screen items-center justify-center">
			<div className="text-center">
				<h1 className="text-4xl font-bold">404</h1>
				<p className="mt-2 text-gray-500">Page not found</p>
				<Link to="/" className="mt-4 inline-block text-sm underline">
					Go home
				</Link>
			</div>
		</div>
	);
}

/** Registered in dev too; the worker never caches Vite's dev chunks. */
function ServiceWorker() {
	useEffect(() => {
		if (!("serviceWorker" in navigator)) return;
		navigator.serviceWorker.register("/sw.js").catch(() => {
			// A worker that fails to register only costs offline support
		});
	}, []);
	return null;
}

function RootDocument({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
				{/* Inline script to set initial theme class before React hydration to prevent flash */}
				<script>
					{`(function(){
				const theme = localStorage.getItem('crowdsec-dashboard-theme');
				const documentElement = document.documentElement;
				const prefersDark = matchMedia('(prefers-color-scheme:dark)').matches;
				const dark = theme === 'dark' || ((!theme || theme === 'system') && prefersDark);
				documentElement.classList.add(dark ? 'dark' : 'light');
				documentElement.style.colorScheme = dark ? 'dark' : 'light';
				const meta = document.querySelector('meta[name="theme-color"]');
				if (meta) meta.content = dark ? '${THEME_COLORS.dark}' : '${THEME_COLORS.light}';
				})();`}
				</script>
			</head>
			<body>
				<ServiceWorker />
				{children}
				<TanStackDevtools
					config={{
						position: "bottom-right",
					}}
					plugins={[
						{
							name: "Tanstack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
						{
							name: "Tanstack Query",
							render: <ReactQueryDevtoolsPanel />,
						},
					]}
				/>
				<Scripts />
			</body>
		</html>
	);
}
