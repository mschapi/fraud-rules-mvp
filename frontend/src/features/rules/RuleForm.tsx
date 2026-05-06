import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Save, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";

import type { RulePayload, Variable } from "../../api/types";
import { ruleFormSchema, type RuleFormValues } from "./ruleFormSchema";
import { parseConditions, toFormValues } from "./valueParsing";

type Props = {
  variables: Variable[];
  initialRule?: RulePayload;
  submitLabel?: string;
  onSubmit: (payload: RulePayload) => void;
  isSubmitting?: boolean;
};

export function RuleForm({ variables, initialRule, submitLabel = "Save rule", onSubmit, isSubmitting }: Props) {
  const form = useForm<RuleFormValues>({
    resolver: zodResolver(ruleFormSchema),
    defaultValues: toFormValues(initialRule),
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "conditions.all",
  });

  useEffect(() => {
    form.reset(toFormValues(initialRule));
  }, [form, initialRule]);

  const watchedConditions = form.watch("conditions.all");

  return (
    <form
      className="space-y-5"
      onSubmit={form.handleSubmit((values) =>
        onSubmit({
          name: values.name,
          description: values.description ?? "",
          action: values.action,
          conditions: { all: parseConditions(values, variables) },
        }),
      )}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <label className="field lg:col-span-2">
          <span className="label">Rule name</span>
          <input className="input" placeholder="high_velocity_new_user" {...form.register("name")} />
        </label>
        <label className="field">
          <span className="label">Action</span>
          <select className="input" {...form.register("action")}>
            <option value="reject">reject</option>
            <option value="review">review</option>
            <option value="approve">approve</option>
          </select>
        </label>
      </div>

      <label className="field">
        <span className="label">Description</span>
        <textarea className="textarea" {...form.register("description")} />
      </label>

      <section className="card p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Conditions</h2>
            <p className="text-sm text-muted">All conditions must match.</p>
          </div>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => append({ field: variables[0]?.name ?? "", operator: "==", value: "" })}
          >
            <Plus size={16} aria-hidden="true" />
            Add
          </button>
        </div>
        <div className="space-y-3">
          {fields.map((field, index) => {
            const selectedVariable = variables.find((item) => item.name === watchedConditions[index]?.field);
            const operators = selectedVariable?.allowed_operators ?? [];
            return (
              <div className="grid gap-3 rounded-md border border-line bg-[#fbfbfc] p-3 lg:grid-cols-[1.4fr_0.8fr_1fr_auto]" key={field.id}>
                <label className="field">
                  <span className="label">Variable</span>
                  <select
                    className="input"
                    {...form.register(`conditions.all.${index}.field`)}
                    onChange={(event) => {
                      const nextVariable = variables.find((item) => item.name === event.target.value);
                      form.setValue(`conditions.all.${index}.field`, event.target.value);
                      form.setValue(`conditions.all.${index}.operator`, nextVariable?.allowed_operators[0] ?? "==");
                    }}
                  >
                    {variables.map((variable) => (
                      <option key={variable.name} value={variable.name}>
                        {variable.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span className="label">Operator</span>
                  <select className="input" {...form.register(`conditions.all.${index}.operator`)}>
                    {operators.map((operator) => (
                      <option key={operator} value={operator}>
                        {operator}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span className="label">Value</span>
                  {selectedVariable?.type === "boolean" ? (
                    <select className="input" {...form.register(`conditions.all.${index}.value`)}>
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  ) : (
                    <input
                      className="input"
                      placeholder={watchedConditions[index]?.operator === "in" ? "AR, BR, CL" : "7"}
                      {...form.register(`conditions.all.${index}.value`)}
                    />
                  )}
                </label>
                <div className="flex items-end">
                  <button
                    className="btn btn-danger w-full"
                    type="button"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                    title="Remove condition"
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {form.formState.errors.root ? <p className="text-sm text-rose-700">{form.formState.errors.root.message}</p> : null}
      <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
        <Save size={16} aria-hidden="true" />
        {submitLabel}
      </button>
    </form>
  );
}
