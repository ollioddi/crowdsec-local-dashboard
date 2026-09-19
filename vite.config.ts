import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	plugins: [
		// Enhanced logs rewrite server console output as two-line "LOG file:line" blocks
		devtools({ enhancedLogs: { enabled: false } }),
		nitro({
			rollupConfig: {
				// Packages that must not be bundled into the server output:
				// - geoip-country: CJS-only, causes ERR_AMBIGUOUS_MODULE_SYNTAX
				// - better-sqlite3: native .node addon, needs real node_modules path
				// - @prisma/adapter-better-sqlite3: instantiates better-sqlite3
				// - bindings: resolves native addon paths relative to package dir
				external: [
					"geoip-country",
					"better-sqlite3",
					"@prisma/adapter-better-sqlite3",
					"bindings",
				],
			},
		}),
		tailwindcss(),
		tanstackStart(),
		viteReact({
			compiler: true,
		}),
	],
});

export default config;
