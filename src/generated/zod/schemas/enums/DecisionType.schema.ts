import * as z from "zod";

export const DecisionTypeSchema = z.enum(["ban", "captcha", "whitelist"]);

export type DecisionType = z.infer<typeof DecisionTypeSchema>;
