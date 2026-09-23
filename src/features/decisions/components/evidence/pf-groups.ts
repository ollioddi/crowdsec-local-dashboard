import type { PfEventFields } from "@/common/parsing/types";
import type { EventOf } from "./shared";

export type PfGroup = {
	key: string;
	fields: PfEventFields;
	count: number;
	first: Date | null;
	last: Date | null;
};

function earliest(a: Date | null, b: Date | null): Date | null {
	if (!a) return b;
	if (!b) return a;
	return a < b ? a : b;
}

function latest(a: Date | null, b: Date | null): Date | null {
	if (!a) return b;
	if (!b) return a;
	return a > b ? a : b;
}

function groupKey(fields: PfEventFields): string {
	const {
		action,
		interface: iface,
		protocol,
		ruleNumber,
		ruleId,
		machine,
	} = fields;
	return [action, iface, protocol, ruleNumber, ruleId, machine].join("|");
}

/**
 * pf repeats one line per dropped packet, so a port scan is dozens of events
 * that differ only in time. Folded by everything but the timestamp, with a
 * count and the span, so a scan across two interfaces or protocols shows
 * both rather than whichever came first.
 */
export function groupPfEvents(events: EventOf<"opnsense-pf">[]): PfGroup[] {
	const groups = new Map<string, PfGroup>();
	for (const event of events) {
		const key = groupKey(event.fields);
		const at = event.timestamp;
		const group = groups.get(key) ?? {
			key,
			fields: event.fields,
			count: 0,
			first: null,
			last: null,
		};
		group.count += 1;
		group.first = earliest(group.first, at);
		group.last = latest(group.last, at);
		groups.set(key, group);
	}
	return [...groups.values()];
}
