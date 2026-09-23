import type { Alert } from "@/generated/prisma/client";

/** A pf row as `encodeAlertRow` would have stored it. */
export const pfRow: Alert = {
	id: 1,
	scenario: "firewallservices/pf-scan-multi_ports",
	message: "Ip 37.120.148.140 performed 'firewallservices/pf-scan-multi_ports'",
	createdAt: new Date("2026-09-22T04:22:20Z"),
	startAt: new Date("2026-09-22T04:22:18Z"),
	stopAt: new Date("2026-09-22T04:22:20Z"),
	eventsCount: 12,
	hostIp: "37.120.148.140",
	entries: '["tcp:3389","tcp:445"]',
	entryType: "ports",
	integration: "opnsense-pf",
	machineId: "opnsense",
	uuid: "6f0b1f3e",
	scenarioVersion: "0.3",
	capacity: 5,
	leakspeed: null,
	simulated: false,
	remediation: true,
	sourceScope: "Ip",
	sourceRange: "37.120.144.0/20",
	events: JSON.stringify([
		{
			timestamp: "2026-09-22T04:22:18Z",
			meta: [
				{ key: "log_type", value: "pf_drop" },
				{ key: "iface", value: "em0" },
				{ key: "IsoCode", value: "ES" },
				{ key: "some_future_key", value: "value" },
			],
		},
	]),
	meta: JSON.stringify({ dst_port: '["tcp:3389","tcp:445"]' }),
};
