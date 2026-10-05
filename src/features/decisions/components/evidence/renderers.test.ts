import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { alertDetailFromRow } from "@/features/decisions/api/alert-detail";
import { pfRow } from "@/features/decisions/api/alert-detail.fixture";
import { AlertEvidence } from "./alert-evidence";
import { pfEvidence } from "./pf-evidence";
import { sshEvidence } from "./ssh-evidence";

describe("mixed alert renderers", () => {
	const alert = {
		...alertDetailFromRow(pfRow),
		entryType: "paths" as const,
		entries: ["/http-only"],
	};

	it("does not label HTTP paths as firewall ports", () => {
		const html = renderToStaticMarkup(
			createElement(pfEvidence.Component, { alert, events: [] }),
		);
		expect(html).not.toContain("/http-only");
		expect(html).not.toContain("Ports probed");
	});

	it("uses SSH events for usernames when the primary source is HTTP", () => {
		const html = renderToStaticMarkup(
			createElement(sshEvidence.Component, {
				alert,
				events: [{ ...alert.events[0], fields: { kind: "ssh", user: "root" } }],
			}),
		);
		expect(html).toContain("root");
		expect(html).not.toContain("/http-only");
	});
});

describe("alert header", () => {
	it("names a trigger scenario instead of an empty bucket", () => {
		const alert = alertDetailFromRow({
			...pfRow,
			capacity: 0,
			leakspeed: "0s",
		});
		const html = renderToStaticMarkup(
			createElement(AlertEvidence, { alert, hostIp: "203.0.113.1" }),
		);
		expect(html).toContain("trigger");
		expect(html).not.toContain("0 leaking");
	});
});
