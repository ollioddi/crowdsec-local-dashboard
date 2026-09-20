import { createFileRoute } from "@tanstack/react-router";
import { getOidcConfigFn, isFirstSetupFn } from "@/common/auth/auth.functions";
import { LoginPage } from "@/features/auth/pages/login-page";

export const Route = createFileRoute("/login")({
	component: LoginPage,
	loader: async () => {
		const [isFirstSetup, oidcConfig] = await Promise.all([
			isFirstSetupFn(),
			getOidcConfigFn(),
		]);
		return { isFirstSetup, oidcConfig };
	},
});
