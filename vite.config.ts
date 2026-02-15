import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import viteTsConfigPaths from "vite-tsconfig-paths";

const config = defineConfig({
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
	},
	plugins: [
		devtools(),
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
		// this is the plugin that enables path aliases
		viteTsConfigPaths({
			projects: ["./tsconfig.json"],
		}),
		tailwindcss(),
		tanstackStart(),
		viteReact({
			babel: {
				plugins: ["babel-plugin-react-compiler"],
			},
		}),
		VitePWA({
			registerType: "autoUpdate",
			manifest: false, // use public/manifest.json
			workbox: {
				globPatterns: ["**/*.{js,css,html,png,svg,ico,woff,woff2}"],
				navigateFallbackDenylist: [/^\/api/, /^\/sse/],
				runtimeCaching: [
					{
						urlPattern: /^https?.*/,
						handler: "NetworkFirst",
						options: {
							cacheName: "network-first-cache",
							networkTimeoutSeconds: 10,
						},
					},
				],
			},
		}),
	],
});

export default config;
