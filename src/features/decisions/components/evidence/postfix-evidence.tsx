import type { ReactNode } from "react";
import { formatTime } from "@/common/lib/dates";
import type { PostfixAggregates } from "@/common/parsing/types";
import {
	EventList,
	type EventOf,
	type EvidenceProps,
	type EvidenceRenderer,
	Labeled,
	Line,
	Lines,
	SummaryGrid,
} from "./shared";

const NO_AGGREGATES: PostfixAggregates = { kind: "postfix" };

type SummaryRow = { label: string; value: ReactNode };

/** Interpret only recognisable prefixes; keep the logged payload verbatim. */
function clientLineMeaning(line: string): string | undefined {
	const escaped = line.replace(/\\+/g, "\\");
	if (/^(\\[rn])+$/.test(escaped)) {
		return "Line break without an SMTP command";
	}
	if (
		/^(GET|HEAD|POST|PUT|DELETE|OPTIONS|PATCH|CONNECT|TRACE) \S+ HTTP\/\d\.\d$/.test(
			line,
		)
	) {
		return "HTTP request sent to the mail server";
	}
	if (
		["\\026\\003\\001", "\\026\\003\\002", "\\026\\003\\003"].some((prefix) =>
			escaped.startsWith(prefix),
		)
	) {
		return "Looks like a TLS handshake";
	}
	return undefined;
}

function ClientLines({ values }: Readonly<{ values: string[] | undefined }>) {
	if (!values?.length) return "Not recorded";
	return [...new Set(values)].map((value) => {
		const meaning = clientLineMeaning(value);
		return (
			<div key={value} className="space-y-0.5">
				{meaning && <p>{meaning}</p>}
				<p className="font-mono">{value}</p>
			</div>
		);
	});
}

function eventLabel(fields: EventOf<"postfix">["fields"]): string | undefined {
	if (fields.violation === "PREGREET") return "Sent before greeting";
	if (fields.violation) return fields.violation;
	if (fields.action) return fields.action;
	if (fields.category === "non-smtp-command") return "Non-SMTP input";
	if (fields.category === "spam-attempt") return "Flagged SMTP event";
	return fields.category;
}

const STAGE_MEANINGS: Record<string, string> = {
	CONNECT: "before an SMTP command was recorded",
	UNKNOWN: "a command Postfix did not recognise",
};

function disconnectStage(stage: string): string {
	const meaning = STAGE_MEANINGS[stage];
	return meaning ? `${stage}: ${meaning}` : stage;
}

/**
 * The summary slots the logged programs can fill: postscreen knows what the
 * client sent before the greeting, smtpd where it hung up and what it sent
 * instead of SMTP. With no retained events, every slot shows.
 */
function summaryRows(
	aggregates: PostfixAggregates,
	events: EventOf<"postfix">[],
): SummaryRow[] {
	const postscreen = events.some((e) => e.fields.service === "postscreen");
	const smtpd = events.some((e) => e.fields.service !== "postscreen");
	const noEvents = events.length === 0;
	const showStages = events.some(
		({ fields }) =>
			fields.service !== "postscreen" && fields.category !== "non-smtp-command",
	);
	const showCommands = events.some(
		({ fields }) =>
			fields.service !== "postscreen" && fields.category !== "spam-attempt",
	);
	const rows: SummaryRow[] = [];
	if (aggregates.clientSent?.length || postscreen || !smtpd) {
		rows.push({
			label: "Client sent",
			value: <ClientLines values={aggregates.clientSent} />,
		});
	}
	if (aggregates.lostAfter?.length || noEvents || showStages) {
		rows.push({
			label: "Disconnected after",
			value: (
				<Lines
					values={aggregates.lostAfter?.map(disconnectStage)}
					emptyLabel="Not recorded"
				/>
			),
		});
	}
	if (aggregates.commands?.length || noEvents || showCommands) {
		rows.push({
			label: "Commands",
			value: <ClientLines values={aggregates.commands} />,
		});
	}
	return rows;
}

/**
 * Postfix evidence: what the client sent, from the alert context, then one
 * line per event, tagged with the postscreen test that failed or the verdict
 * smtpd gave, then why and the client's hostname.
 */
function PostfixEvidence({ alert, events }: EvidenceProps<"postfix">) {
	const aggregates =
		alert.aggregates.kind === "postfix" ? alert.aggregates : NO_AGGREGATES;
	const hasAlertValues = [
		aggregates.clientSent,
		aggregates.lostAfter,
		aggregates.commands,
	].some((values) => values?.length);

	return (
		<div className="space-y-2 text-xs">
			{events.some((event) => event.fields.violation === "PREGREET") && (
				<p>
					The client sent data before the mail server finished its greeting.
				</p>
			)}
			{events.some((event) => event.fields.category === "spam-attempt") && (
				<p>
					{aggregates.lostAfter?.length
						? "Postfix recorded lost SMTP connections. "
						: ""}
					CrowdSec groups lost connections and authentication failures under
					spam-attempt.
				</p>
			)}
			{events.some((event) => event.fields.category === "non-smtp-command") && (
				<p>
					The client sent input that Postfix could not read as an SMTP command.
				</p>
			)}
			<SummaryGrid rows={summaryRows(aggregates, events)} />
			{events.length > 1 && hasAlertValues && (
				<p className="text-muted-foreground">
					These values apply to the whole alert, not to individual events.
				</p>
			)}
			{events.length > 0 && (
				<EventList label={`SMTP events (${events.length})`}>
					{events.map((event) => {
						const { fields } = event;
						const tag = eventLabel(fields);
						const rawTag = fields.violation ?? fields.action ?? fields.category;
						return (
							<Line
								key={event.id}
								tag={tag}
								trailing={
									event.timestamp && (
										<span className="tabular-nums text-muted-foreground">
											{formatTime(event.timestamp)}
										</span>
									)
								}
								details={
									<>
										{fields.reason && <p>{fields.reason}</p>}
										<p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
											<Labeled label="Service" className="shrink-0">
												{fields.service ?? "-"}
											</Labeled>
											{fields.action && fields.action !== rawTag && (
												<Labeled label="Action" className="shrink-0">
													{fields.action}
												</Labeled>
											)}
											{fields.category && fields.category !== rawTag && (
												<Labeled label="Category" className="shrink-0">
													{fields.category}
												</Labeled>
											)}
											{fields.clientHostname && (
												<Labeled label="Client hostname" className="shrink-0">
													{fields.clientHostname}
												</Labeled>
											)}
										</p>
									</>
								}
							/>
						);
					})}
				</EventList>
			)}
		</div>
	);
}

export const postfixEvidence = {
	Component: PostfixEvidence,
	shownFields: new Set([
		"service",
		"violation",
		"category",
		"action",
		"reason",
		"clientHostname",
	] as const),
} satisfies EvidenceRenderer<"postfix">;
