import { defineConfig } from "vitest/config";

// Separate from vite.config.ts so unit tests do not load the app's build plugins
export default defineConfig({
	resolve: { tsconfigPaths: true },
	test: {
		include: ["src/**/*.test.ts"],
	},
});
