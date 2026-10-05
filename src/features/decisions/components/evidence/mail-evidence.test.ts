import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import dovecot from "@/common/parsing/fixtures/mailcow-dovecot.json";
import postfixCommand from "@/common/parsing/fixtures/mailcow-postfix-non-smtp-command.json";
import postfixSpam from "@/common/parsing/fixtures/mailcow-postfix-spam.json";
import postscreen from "@/common/parsing/fixtures/mailcow-postscreen.json";
import type { RawAlert } from "@/common/parsing/registry";
import { alertDetailFromRow } from "@/features/decisions/api/alert-detail";
import { pfRow } from "@/features/decisions/api/alert-detail.fixture";
import { AlertEvidence } from "./alert-evidence";

// Context values from retained mail alerts on 2026-10-05, with demo mailboxes.
function render(
	fixture: RawAlert & { scenario: string; events_count: number },
	context: Record<string, string[]> = {},
) {
	const alert = alertDetailFromRow({
		...pfRow,
		scenario: fixture.scenario,
		eventsCount: fixture.events_count,
		events: JSON.stringify(fixture.events),
		meta: JSON.stringify(
			Object.fromEntries(
				Object.entries(context).map(([key, values]) => [
					key,
					JSON.stringify(values),
				]),
			),
		),
	});
	return renderToStaticMarkup(
		createElement(AlertEvidence, { alert, hostIp: "203.0.113.7" }),
	);
}

describe("mail evidence", () => {
	it("explains what PREGREET means", () => {
		const html = render(postscreen, {
			client_sent: [String.raw`EHLO User\r\n`],
		});
		expect(html).toContain("Sent before greeting");
		expect(html).toContain("before the mail server finished its greeting");
		expect(html).toContain("EHLO User");
	});

	it("keeps a newline-only greeting visible", () => {
		const html = render(postscreen, { client_sent: [String.raw`\n`] });
		expect(html).toContain("Line break without an SMTP command");
		expect(html).toContain(String.raw`\n`);
	});

	it("describes HTTP input without an unrelated disconnect stage", () => {
		const html = render(postfixCommand, { smtp_command: ["GET / HTTP/1.1"] });
		expect(html).toContain("HTTP request sent to the mail server");
		expect(html).toContain("GET / HTTP/1.1");
		expect(html).toContain("Non-SMTP input");
		expect(html).not.toContain("Disconnected after");
	});

	it.each([
		String.raw`\026\003\001\000\203\001`,
		String.raw`\\026\\003\\003\\001Y\\001`,
	])("identifies TLS-like input and keeps the logged bytes: %s", (command) => {
		const html = render(postfixCommand, { smtp_command: [command] });
		expect(html).toContain("Looks like a TLS handshake");
		expect(html).toContain(command);
		expect(html).not.toContain("TLS 1.2");
	});

	it("keeps unfamiliar input without guessing its protocol", () => {
		const html = render(postfixCommand, { smtp_command: ["future command"] });
		expect(html).toContain("future command");
		expect(html).not.toContain("TLS handshake");
		expect(html).not.toContain("HTTP request");
	});

	it("explains the disconnect stages", () => {
		const html = render(postfixSpam, { lost_after: ["CONNECT", "UNKNOWN"] });
		expect(html).toContain("Disconnected after");
		expect(html).toContain("before an SMTP command was recorded");
		expect(html).toContain("a command Postfix did not recognise");
		expect(html).toContain("lost connections and authentication failures");
	});

	it("shows Dovecot details without pairing them with individual attempts", () => {
		const html = render(dovecot, {
			target_user: ["info@example.com"],
			protocol: ["imap"],
			login_message: ["Password mismatch (SHA1 of given password: abc123)"],
		});
		expect(html).toContain("info@example.com");
		expect(html).toContain("imap");
		expect(html).toContain("Password mismatch");
		expect(html).not.toContain("SHA1");
		expect(html).toContain("failed login events");
		expect(html).toContain("not linked to individual attempts");
	});

	it("shows missing details without hiding the failed logins", () => {
		const html = render(dovecot);
		expect(html).toContain("Not recorded");
		expect(html).not.toContain("None recorded");
		expect(html).toContain("Login failed");
	});
});
