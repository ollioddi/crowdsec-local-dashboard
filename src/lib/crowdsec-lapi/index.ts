import { env } from "@/env";
import { LapiClient } from "./lapi-client";

let client: LapiClient | null = null;

export function getLapiClient(): LapiClient {
	if (!client) {
		if (!env.LAPI_URL || !env.LAPI_BOUNCER_API_TOKEN) {
			throw new Error(
				"LAPI_URL and LAPI_BOUNCER_API_TOKEN must be set to use the LAPI client",
			);
		}

		client = new LapiClient({
			url: env.LAPI_URL,
			bouncerApiToken: env.LAPI_BOUNCER_API_TOKEN,
			machineId: env.LAPI_MACHINE_ID,
			machinePassword: env.LAPI_MACHINE_PASSWORD,
		});
	}

	return client;
}
