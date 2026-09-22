import { defineCollection } from "astro:content";
import { docsLoader, i18nLoader } from "@astrojs/starlight/loaders";
import { docsSchema, i18nSchema } from "@astrojs/starlight/schema";
import { changelogsLoader } from "starlight-changelogs/loader";

export const collections = {
	docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
	// Starlight looks this collection up whether or not the site is translated,
	// and Astro 7 warns on every build when it is missing. en.json holds no
	// overrides; it exists so the lookup finds something.
	i18n: defineCollection({ loader: i18nLoader(), schema: i18nSchema() }),
	// The release body is the changelog. Reading the API means editing a
	// published release updates the site, with no second copy to keep in sync.
	changelogs: defineCollection({
		loader: changelogsLoader([
			{
				provider: "github",
				owner: "ollioddi",
				repo: "crowdsec-local-dashboard",
				base: "changelog",
				title: "Changelog",
				token: import.meta.env.GH_API_TOKEN,
			},
		]),
	}),
};
