// Prepends a published release's notes to CHANGELOG.md.
// Usage: node .github/scripts/update-changelog.mjs <tag> <notes-file>
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const [tag, notesFile] = process.argv.slice(2);
if (!tag || !notesFile) {
	console.error("usage: update-changelog.mjs <tag> <notes-file>");
	process.exit(1);
}

const REPO = "https://github.com/ollioddi/crowdsec-local-dashboard";
const HEADER = `# Changelog

All notable changes to this project are listed here. Each entry is the body of
the corresponding GitHub release: a hand-written summary followed by the list
generated from commits.
`;

const notes = readFileSync(notesFile, "utf8")
	.replace(/\r\n/g, "\n")
	.replace(/<!--[\s\S]*?-->\n?/g, "")
	.replace(/\n{3,}/g, "\n\n")
	// Release bodies start at H2; nest them under the version heading
	.replace(/^(#{2,5}) /gm, "#$1 ")
	.trim();

const date = new Date().toISOString().slice(0, 10);
const section = `## [${tag}](${REPO}/releases/tag/${tag}) - ${date}\n\n${notes}\n`;

const existing = existsSync("CHANGELOG.md")
	? readFileSync("CHANGELOG.md", "utf8")
	: HEADER;

if (existing.includes(`## [${tag}]`)) {
	console.log(`CHANGELOG.md already has an entry for ${tag}, nothing to do`);
	process.exit(0);
}

const firstEntry = existing.indexOf("\n## ");
const updated =
	firstEntry === -1
		? `${existing.trimEnd()}\n\n${section}`
		: `${existing.slice(0, firstEntry + 1)}${section}\n${existing.slice(firstEntry + 1)}`;

writeFileSync("CHANGELOG.md", updated);
console.log(`Added ${tag} to CHANGELOG.md`);
