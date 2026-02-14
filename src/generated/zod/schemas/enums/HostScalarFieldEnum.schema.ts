import * as z from "zod";

export const HostScalarFieldEnumSchema = z.enum([
	"id",
	"ip",
	"scope",
	"firstSeen",
	"lastSeen",
	"totalBans",
	"country",
	"asNumber",
	"asName",
	"latitude",
	"longitude",
]);

export type HostScalarFieldEnum = z.infer<typeof HostScalarFieldEnumSchema>;
