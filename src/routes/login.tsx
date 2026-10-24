import { createFileRoute } from "@tanstack/react-router";
import {
	getOidcConfigFn,
	getSignInWindowFn,
	isFirstSetupFn,
} from "@/common/auth/auth.functions";
import { LoginPage } from "@/features/auth/pages/login-page";

export const Route = createFileRoute("/login")({
	component: LoginPage,
	loader: async () => {
		const [isFirstSetup, oidcConfig, signInWindowSeconds] = await Promise.all([
			isFirstSetupFn(),
			getOidcConfigFn(),
			getSignInWindowFn(),
		]);
		return { isFirstSetup, oidcConfig, signInWindowSeconds };
	},
});
