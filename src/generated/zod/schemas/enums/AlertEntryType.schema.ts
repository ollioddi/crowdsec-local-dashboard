import * as z from "zod";

export const AlertEntryTypeSchema = z.enum([
	"paths",
	"ports",
	"usernames",
	"none",
]);

export type AlertEntryType = z.infer<typeof AlertEntryTypeSchema>;
