import * as z from "zod";

export const DecisionScalarFieldEnumSchema = z.enum([
	"id",
	"hostIp",
	"type",
	"origin",
	"scenario",
	"duration",
	"createdAt",
	"expiresAt",
	"active",
]);

export type DecisionScalarFieldEnum = z.infer<
	typeof DecisionScalarFieldEnumSchema
>;
