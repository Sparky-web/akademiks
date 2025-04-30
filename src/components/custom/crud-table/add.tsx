import { useForm } from "@tanstack/react-form";
import type { CrudTableFormField } from ".";
import { Dialog, DialogContent, DialogTitle } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { CrudTableForm, type CrudTableFormProps } from "./form";

export const CrudTableAdd = ({
  fields,
  onSubmit,
  isPending,
  open,
  onOpenChange,
  customForm,
  defaultValues,
}: {
  fields: CrudTableFormField[];
  onSubmit: (data: any) => void;
  isPending?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: any;
  customForm?: React.FC<CrudTableFormProps>;
}) => {
  const form = useForm({
    defaultValues: defaultValues
      ? defaultValues
      : fields.reduce((acc, field) => {
          if (field.schema._def.typeName === "ZodString") {
            acc[field.name] = "";
          }
          if (field.schema._def.typeName === "ZodBoolean") {
            acc[field.name] = false;
          }
          acc[field.name] = "";
          return acc;
        }, {} as any),
    onSubmit: (data) => {
      onSubmit(data.value);
      form.reset();
    },
  });

  const Form = customForm || CrudTableForm;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-fit max-w-fit">
        <DialogTitle>Добавить</DialogTitle>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <Form form={form} fields={fields} />
          <Button type="submit" disabled={isPending}>
            Добавить
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
