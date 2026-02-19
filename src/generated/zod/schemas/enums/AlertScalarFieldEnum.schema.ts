import * as z from "zod";

export const AlertScalarFieldEnumSchema = z.enum([
	"id",
	"scenario",
	"message",
	"createdAt",
	"paths",
	"hostIp",
	"events",
]);

export type AlertScalarFieldEnum = z.infer<typeof AlertScalarFieldEnumSchema>;
