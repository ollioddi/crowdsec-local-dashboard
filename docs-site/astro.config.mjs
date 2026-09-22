import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import remarkAdmonitions from "remark-github-admonitions-to-directives";
import starlightChangelogs from "starlight-changelogs";
import starlightImageZoom from "starlight-image-zoom";
import starlightLinksValidator from "starlight-links-validator";
import starlightVersions from "starlight-versions";
import { base, repo, site, versions } from "./site.config.mjs";
import syncDocsOnChange from "./sync-docs-integration.mjs";

const plugins = [
	starlightChangelogs(),
	starlightImageZoom(),
	...(versions.length ? [starlightVersions({ versions })] : []),
	// Last, so it sees every route the other plugins added.
	starlightLinksValidator(),
];

export default defineConfig({
	site,
	base,
	// Starlight renders GitHub's alert syntax literally. This turns it into the
	// directives its asides understand, for docs pages and release bodies alike.
	// GitHub has five alert types and Starlight four, so the two it lacks fold
	// onto caution rather than the plugin's default of an unhandled "info".
	markdown: {
		remarkPlugins: [
			[
				remarkAdmonitions,
				{
					mapping: {
						NOTE: "note",
						TIP: "tip",
						IMPORTANT: "caution",
						WARNING: "caution",
						CAUTION: "danger",
					},
				},
			],
		],
	},
	integrations: [
		syncDocsOnChange(),
		starlight({
			title: "CrowdSec Local Dashboard",
			plugins,
			logo: {
				light: "./src/assets/shield-light.svg",
				dark: "./src/assets/shield-dark.svg",
			},
			favicon: "/favicon.svg",
			customCss: ["./src/styles/app-theme.css"],
			components: {
				MarkdownContent: "./src/components/MarkdownContent.astro",
			},
			head: [
				{
					tag: "link",
					attrs: { rel: "preconnect", href: "https://fonts.googleapis.com" },
				},
				{
					tag: "link",
					attrs: {
						rel: "preconnect",
						href: "https://fonts.gstatic.com",
						crossorigin: true,
					},
				},
				{
					tag: "link",
					attrs: {
						rel: "stylesheet",
						href: "https://fonts.googleapis.com/css2?family=Inter:wght@400..700&family=JetBrains+Mono:wght@400..600&display=swap",
					},
				},
			],
			// GitHub renders ```env fences fine; Shiki needs telling.
			expressiveCode: { shiki: { langAlias: { env: "ini" } } },
			description:
				"Self-hosted dashboard for viewing and managing CrowdSec decisions.",
			social: [{ icon: "github", label: "GitHub", href: repo }],
			editLink: { baseUrl: `${repo}/edit/main/docs/` },
			sidebar: [
				{
					label: "Start here",
					items: [
						{ label: "Overview", slug: "" },
						{ label: "CrowdSec LAPI setup", slug: "lapi-setup" },
						{ label: "Configuration", slug: "configuration" },
						{ label: "Deployment", slug: "deployment" },
						{ label: "SSO / OIDC setup", slug: "sso" },
					],
				},
				{
					label: "Using it",
					items: [
						{
							label: "Getting the most out of it",
							slug: "using-the-dashboard",
						},
						{ label: "Integrations", slug: "integrations" },
						{ label: "Troubleshooting", slug: "troubleshooting" },
					],
				},
				{
					label: "Releases",
					items: [{ label: "Changelog", link: "changelog" }],
				},
				{
					label: "Working on it",
					items: [
						{ label: "Contributing", slug: "contributing" },
						{ label: "Releasing", slug: "releasing" },
					],
				},
			],
		}),
	],
});
