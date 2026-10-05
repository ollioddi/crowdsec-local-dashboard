import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import basicSsl from "@vitejs/plugin-basic-ssl";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

// Self-signed TLS for `pnpm dev` only, so the browser speaks HTTP/2 and the
// SSE streams of several tabs no longer exhaust the 6-connection HTTP/1.1 pool
const devTls = process.env.VITE_DEV_TLS === "1";

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	build: {
		rolldownOptions: {
			// "use client" and "use no memo" are for React, not the bundler
			checks: { moduleLevelDirective: false },
		},
	},
	server: devTls ? { https: {} } : {},
	plugins: [
		...(devTls ? [basicSsl()] : []),
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
