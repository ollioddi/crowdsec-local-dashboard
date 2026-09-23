import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { syncScreenshot } from "./sync-docs.mjs";

test("a pending screenshot becomes a real capture without changing its source reference", async (t) => {
	const dir = await mkdtemp(path.join(os.tmpdir(), "docs-screenshot-"));
	t.after(() => rm(dir, { recursive: true, force: true }));
	const source = path.join(dir, "pending.png");
	const output = path.join(dir, "public", "pending.png");
	assert.equal(await syncScreenshot(source, output), false);
	assert.match(await readFile(`${output}.svg`, "utf8"), /Screenshot pending/);
	await writeFile(source, "first capture");
	assert.equal(await syncScreenshot(source, output), true);
	assert.equal(await readFile(output, "utf8"), "first capture");
	// Equal byte lengths do not mean a screenshot is unchanged.
	await writeFile(source, "later capture");
	await syncScreenshot(source, output);
	assert.equal(await readFile(output, "utf8"), "later capture");
});

test("errors other than a missing screenshot are not treated as placeholders", async (t) => {
	const dir = await mkdtemp(path.join(os.tmpdir(), "docs-screenshot-"));
	t.after(() => rm(dir, { recursive: true, force: true }));
	await assert.rejects(syncScreenshot(dir, path.join(dir, "output")), {
		code: "EISDIR",
	});
});
