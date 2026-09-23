// Copies ../docs into the Starlight collection, adding the frontmatter and
// absolute URLs the site needs. Nothing is ever written back to ../docs.
import {
	cp,
	mkdir,
	readdir,
	readFile,
	rm,
	stat,
	writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { base, repo } from "../site.config.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const srcDocs = path.join(root, "docs");
const outDocs = path.join(here, "../src/content/docs");
const outImages = path.join(here, "../public/images");

/**
 * Slug a docs-relative path resolves to, mirroring Starlight's routing.
 * Starlight lowercases routes, so docs/CONTRIBUTING.md serves at /contributing.
 */
function slugOf(file) {
	const slug = file.replace(/\.md$/, "");
	const dir = path.dirname(slug);
	if (path.basename(slug) !== "README") return slug.toLowerCase();
	return dir === "." ? "" : dir.toLowerCase();
}

function docUrl(target, fromDir) {
	const [file, anchor] = target.split("#");
	const rel = path.relative(srcDocs, path.resolve(fromDir, file));
	const slug = slugOf(rel);
	const trail = slug ? `${slug}/` : "";
	return `${base}/${trail}${anchor ? `#${anchor}` : ""}`;
}

/** Where a relative link lands, so a page in a subfolder can link upward. */
function isInsideDocs(target, fromDir) {
	const resolved = path.resolve(fromDir, target.split("#")[0]);
	return !path.relative(srcDocs, resolved).startsWith("..");
}

/** One pass over every link, so no rule can shadow another by ordering. */
function rewriteLinks(text, fromDir) {
	return text.replace(/\]\(([^)\s]+)\)/g, (match, target) => {
		if (/^(https?:|#|mailto:)/.test(target)) return match;
		// Anything outside docs/ is a repo file the site cannot serve.
		if (!isInsideDocs(target, fromDir)) {
			const repoPath = path.relative(root, path.resolve(fromDir, target));
			return `](${repo}/blob/main/${repoPath})`;
		}
		if (/\.md(#|$)/.test(target)) return `](${docUrl(target, fromDir)})`;
		return match;
	});
}

// Both spellings a page can use: <img src="images/x.png"> and ![alt](images/x.png),
// from any depth: a page in docs/integrations/ writes ../images/x.png.
const IMAGE_REF = /(src="|\]\()(?:\.\.\/)*images\/([^")]+)/g;

/** Screenshots live outside docs/, so they are copied into the site's public/. */
function rewriteImages(text) {
	return text.replace(
		IMAGE_REF,
		(_m, open, name) => `${open}${base}/images/${name}`,
	);
}

function referencedImages(text) {
	return [...text.matchAll(IMAGE_REF)].map(([, , name]) => name);
}

/** Starlight renders the title itself, so the H1 is lifted out of the body. */
function splitTitle(text, file) {
	const match = /^#[ \t]+(.+)\n+/.exec(text);
	if (!match)
		throw new Error(`${file}: no H1 heading to use as the page title`);
	return { title: match[1].trim(), body: text.slice(match[0].length) };
}

/**
 * Never delete and recreate the output directory. Astro's content watcher is
 * attached to it, and removing it kills hot reload for the rest of the session.
 * Writing only what changed also stops every sync touching every page.
 */
async function write(file, text) {
	try {
		if ((await readFile(file, "utf8")) === text) return;
	} catch {
		// Not written yet.
	}
	await mkdir(path.dirname(file), { recursive: true });
	await writeFile(file, text);
}

async function unchangedSize(from, to) {
	try {
		const [a, b] = await Promise.all([stat(from), stat(to)]);
		return a.size === b.size;
	} catch {
		return false;
	}
}

/** Drops files left behind by a page or screenshot that no longer exists. */
async function prune(dir, keep) {
	const entries = await readdir(dir, { recursive: true, withFileTypes: true });
	await Promise.all(
		entries
			.filter((e) => e.isFile())
			.map((e) => path.join(e.parentPath ?? e.path, e.name))
			.filter((file) => !keep.has(file))
			.map((file) => rm(file, { force: true })),
	);
}

async function renderPage(file) {
	const raw = await readFile(path.join(srcDocs, file), "utf8");
	const { title, body } = splitTitle(raw, file);
	const fromDir = path.dirname(path.join(srcDocs, file));
	const content = rewriteImages(rewriteLinks(body, fromDir));
	const slug = slugOf(file);
	return {
		out: path.join(outDocs, `${slug || "index"}.md`),
		text: `---\ntitle: ${JSON.stringify(title)}\n---\n\n${content}`,
		images: referencedImages(body),
	};
}

export async function syncDocs() {
	const entries = await readdir(srcDocs, { recursive: true });
	const files = entries.filter((entry) => entry.endsWith(".md"));

	const pages = await Promise.all(files.map(renderPage));
	await mkdir(outDocs, { recursive: true });
	await Promise.all(pages.map((page) => write(page.out, page.text)));
	await prune(outDocs, new Set(pages.map((page) => page.out)));

	// Only the screenshots the docs actually embed.
	const images = new Set(pages.flatMap((page) => page.images));
	await mkdir(outImages, { recursive: true });
	const wanted = new Set([...images].map((n) => path.join(outImages, n)));
	await Promise.all(
		[...images].map(async (name) => {
			const to = path.join(outImages, name);
			if (await unchangedSize(path.join(srcDocs, "images", name), to)) return;
			await cp(path.join(srcDocs, "images", name), to);
		}),
	);
	await prune(outImages, wanted);

	return { pages: pages.length, images: images.size };
}

// Also runs as `pnpm sync`; the dev server imports syncDocs directly.
if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(process.argv[1]).href
) {
	try {
		const { pages, images } = await syncDocs();
		console.log(`synced ${pages} pages and ${images} screenshots`);
	} catch (error) {
		console.error(error.message);
		process.exitCode = 1;
	}
}
