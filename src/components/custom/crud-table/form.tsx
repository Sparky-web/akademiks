import { type ReactFormExtendedApi } from "@tanstack/react-form";
import type { CrudTableFormField } from ".";
import { FormTextField } from "../form/form-text-field";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "../label-group";

export type CrudTableFormProps = {
  form: ReactFormExtendedApi<any, any, any, any, any, any, any, any, any, any>;
  fields: CrudTableFormField[];
};

export const CrudTableForm = ({ form, fields }: CrudTableFormProps) => {
  return (
    <>
      {fields.map((fieldSchema) => {
        const { label, schema, name } = fieldSchema;

        const type = schema._def.typeName;

        if (type === "ZodString") {
          return (
            <form.Field
              name={name}
              key={name}
              validators={{
                onChange: schema,
              }}
            >
              {(field) => <FormTextField field={field}>{label}</FormTextField>}
            </form.Field>
          );
        }

        if (type === "ZodBoolean") {
          return (
            <form.Field
              name={name}
              key={name}
              validators={{ onChange: schema }}
            >
              {(field) => (
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={field.state.value}
                    id="checkbox"
                    onCheckedChange={(e) => field.handleChange(e)}
                  />
                  <label htmlFor="checkbox" className="text-sm font-semibold">
                    {label}
                  </label>
                </div>
              )}
            </form.Field>
          );
        }

        return <div key={label} className="grid gap-2"></div>;
      })}
    </>
  );
};
