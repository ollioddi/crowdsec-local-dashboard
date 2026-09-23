import { Badge } from "@/common/components/ui/badge";
import { EventList, type EvidenceProps } from "./shared";

/**
 * AppSec (WAF) evidence: which rule fired, whether the request was actually
 * blocked, and which part of the request matched.
 */
export function AppsecEvidence({ events }: EvidenceProps) {
	if (events.length === 0) return null;

	return (
		<EventList>
			{events.map((event) => {
				if (event.fields.kind !== "appsec") return null;
				const {
					ruleName,
					description,
					matchedZones,
					method,
					interrupted,
					action,
					data,
					ruleIds,
					requestUuid,
					remediationComponentIp,
				} = event.fields;
				const uri = event.facets.target?.uri;
				const fqdn = event.facets.target?.fqdn;

				return (
					<div key={event.id} className="space-y-0.5 py-1 text-xs">
						<div className="flex flex-wrap items-center gap-1.5">
							{interrupted !== undefined && (
								<Badge
									variant={interrupted ? "destructive" : "outline"}
									className="px-1 py-0 text-[10px]"
								>
									{interrupted ? (action ?? "blocked") : "detected"}
								</Badge>
							)}
							{ruleName && (
								<span
									className="font-mono text-[11px] font-semibold"
									title={[
										ruleName,
										ruleIds?.length && `Rule ids: ${ruleIds.join(", ")}`,
										requestUuid && `Request ${requestUuid}`,
										remediationComponentIp &&
											`Asked by bouncer ${remediationComponentIp}`,
									]
										.filter(Boolean)
										.join("\n")}
								>
									{ruleName.replace(/^crowdsecurity\//, "")}
								</span>
							)}
						</div>

						{description && (
							<p className="text-[11px] text-muted-foreground">{description}</p>
						)}

						<div className="flex items-center gap-2">
							{method && (
								<span className="shrink-0 rounded bg-muted px-1 py-0.5 font-mono text-[10px] font-bold">
									{method}
								</span>
							)}
							<span
								className="flex-1 truncate font-mono text-[11px]"
								title={[fqdn && `Host: ${fqdn}`, uri]
									.filter(Boolean)
									.join("\n")}
							>
								{uri ?? "-"}
							</span>
						</div>

						{matchedZones && matchedZones.length > 0 && (
							<p
								className="truncate font-mono text-[10px] text-muted-foreground"
								title={matchedZones.join("\n")}
							>
								matched: {matchedZones.join(", ")}
							</p>
						)}

						{data && (
							<p
								className="truncate font-mono text-[10px] text-muted-foreground"
								title={data}
							>
								payload: {data}
							</p>
						)}
					</div>
				);
			})}
		</EventList>
	);
}
