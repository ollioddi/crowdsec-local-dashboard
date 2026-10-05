import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PostfixEventFields } from "@/common/parsing/types";
import { alertDetailFromRow } from "@/features/decisions/api/alert-detail";
import { pfRow } from "@/features/decisions/api/alert-detail.fixture";
import { postfixEvidence } from "./postfix-evidence";

const alert = alertDetailFromRow(pfRow);

function render(...services: string[]) {
	const events = services.map((service, i) => ({
		...alert.events[0],
		id: `event-${i}`,
		fields: { kind: "postfix", service } satisfies PostfixEventFields,
	}));
	return renderToStaticMarkup(
		createElement(postfixEvidence.Component, { alert, events }),
	);
}

describe("postfix summary slots", () => {
	it("keeps action and category visible when a violation supplies the tag", () => {
		const html = renderToStaticMarkup(
			createElement(postfixEvidence.Component, {
				alert,
				events: [
					{
						...alert.events[0],
						fields: {
							kind: "postfix",
							service: "postscreen",
							violation: "pregreet",
							action: "reject",
							category: "spam",
						},
					},
				],
			}),
		);
		expect(html).toContain("pregreet");
		expect(html).toContain("reject");
		expect(html).toContain("spam");
	});
	it("shows only what postscreen can know for a postscreen alert", () => {
		const html = render("postscreen");
		expect(html).toContain("Client sent");
		expect(html).not.toContain("Disconnected after");
		expect(html).not.toContain("Commands");
	});

	it("shows only what smtpd can know for an smtpd alert", () => {
		const html = render("postfix");
		expect(html).not.toContain("Client sent");
		expect(html).toContain("Disconnected after");
		expect(html).toContain("Commands");
	});

	it("shows every slot when both programs logged events", () => {
		const html = render("postscreen", "postfix");
		expect(html).toContain("Client sent");
		expect(html).toContain("Disconnected after");
	});
});
