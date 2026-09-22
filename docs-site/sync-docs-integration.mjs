import path from "node:path";
import { fileURLToPath } from "node:url";
import { syncDocs } from "./scripts/sync-docs.mjs";

const docsDir = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../docs",
);

/**
 * `astro dev` watches the generated collection, not ../docs, so editing a page
 * did nothing until the server restarted. Re-run the sync on a change and the
 * write into the collection triggers the usual hot reload.
 */
export default function syncDocsOnChange() {
	return {
		name: "sync-docs-on-change",
		hooks: {
			"astro:server:setup": ({ server, logger }) => {
				server.watcher.add(docsDir);
				const resync = async (file) => {
					if (!file.startsWith(docsDir)) return;
					try {
						await syncDocs();
						logger.info(`synced ${path.relative(docsDir, file)}`);
					} catch (error) {
						logger.error(error.message);
					}
				};
				server.watcher.on("change", resync);
				server.watcher.on("add", resync);
				server.watcher.on("unlink", resync);
			},
		},
	};
}
