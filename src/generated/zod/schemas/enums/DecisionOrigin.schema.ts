import * as z from "zod";

export const DecisionOriginSchema = z.enum(["crowdsec", "cscli"]);

export type DecisionOrigin = z.infer<typeof DecisionOriginSchema>;
