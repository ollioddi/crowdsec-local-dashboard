import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import {
	ConnectionError,
	ConnectionPending,
} from "@/common/components/connection-error";

// Import the generated route tree
import { routeTree } from "./routeTree.gen";

// Create a new router instance
export const getRouter = () => {
	// Loaders otherwise never retry, so a server restarting mid-navigation
	// went straight to the error view
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: 1 } },
	});

	const router = createRouter({
		routeTree,
		context: {
			queryClient,
		},

		defaultPreload: "intent",
		defaultErrorComponent: ConnectionError,
		defaultPendingComponent: ConnectionPending,
		defaultPendingMs: 500,
	});

	setupRouterSsrQueryIntegration({
		router,
		queryClient,
	});

	return router;
};
