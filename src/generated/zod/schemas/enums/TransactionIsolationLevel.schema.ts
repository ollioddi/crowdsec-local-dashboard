import * as z from "zod";

export const TransactionIsolationLevelSchema = z.enum(["Serializable"]);

export type TransactionIsolationLevel = z.infer<
	typeof TransactionIsolationLevelSchema
>;
