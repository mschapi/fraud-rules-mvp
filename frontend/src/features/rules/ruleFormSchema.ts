import { z } from "zod";

export const ruleFormSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional().default(""),
  action: z.enum(["review", "reject", "approve"]),
  conditions: z.object({
    all: z
      .array(
        z.object({
          field: z.string().min(1),
          operator: z.enum(["==", "!=", ">", ">=", "<", "<=", "in", "not_in"]),
          value: z.string().min(1),
        }),
      )
      .min(1),
  }),
});

export type RuleFormValues = z.infer<typeof ruleFormSchema>;
