import type { EventFields, Integration } from "../types";
import { appsec } from "./appsec";
import { opnsensePf } from "./opnsense-pf";
import { ssh } from "./ssh";
import { traefikHttp } from "./traefik-http";

/**
 * Every integration, in the order they get to claim an event. The first
 * `matches()` wins, so specific integrations go before the ones with broad
 * fallbacks: AppSec precedes Traefik because an in-band WAF event also carries
 * HTTP-shaped keys. To add an integration: write the module and list it here.
 */
export const INTEGRATIONS: ReadonlyArray<Integration<EventFields>> = [
	appsec,
	opnsensePf,
	ssh,
	traefikHttp,
];
