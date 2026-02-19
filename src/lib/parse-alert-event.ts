import type { AlertEvent } from "@/lib/crowdsec-lapi/types";

export type ParsedEventMeta = {
	timestamp: Date;
	sourceIp?: string;
	logType?: string;
	service?: string;
	datasourcePath?: string;
	httpVerb?: string;
	httpPath?: string;
	httpStatus?: number;
	httpUserAgent?: string;
	traefikRouterName?: string;
	asnNumber?: string;
	asnOrg?: string;
	isoCode?: string;
	isInEU?: boolean;
	sourceRange?: string;
};

function present(value: string | undefined): string | undefined {
	return value === undefined || value === "-" ? undefined : value;
}

export function parseAlertEvent(event: AlertEvent): ParsedEventMeta {
	const meta = Object.fromEntries(event.meta.map((m) => [m.key, m.value]));

	// meta.timestamp is ISO format; event.timestamp is Go format — prefer meta
	const rawTs = meta.timestamp ?? event.timestamp;
	const timestamp = rawTs ? new Date(rawTs) : new Date();

	const httpStatus = meta.http_status
		? Number.parseInt(meta.http_status, 10)
		: undefined;

	return {
		timestamp,
		sourceIp: present(meta.source_ip),
		logType: present(meta.log_type),
		service: present(meta.service),
		datasourcePath: present(meta.datasource_path),
		httpVerb: present(meta.http_verb),
		httpPath: present(meta.http_path),
		httpStatus:
			httpStatus !== undefined && !Number.isNaN(httpStatus)
				? httpStatus
				: undefined,
		httpUserAgent: present(meta.http_user_agent),
		traefikRouterName: present(meta.traefik_router_name),
		asnNumber: present(meta.ASNNumber),
		asnOrg: present(meta.ASNOrg),
		isoCode: present(meta.IsoCode),
		isInEU:
			meta.IsInEU === undefined
				? undefined
				: meta.IsInEU.toLowerCase() === "true",
		sourceRange: present(meta.SourceRange),
	};
}
