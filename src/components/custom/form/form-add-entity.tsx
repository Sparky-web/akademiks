import { useForm } from "@tanstack/react-form";
import { Dialog, DialogContent, DialogTitle } from "~/components/ui/dialog";
import { Label, LabelGroup } from "../label-group";
import { z } from "~/lib/utils/zod-russian";
import TextFormField from "../text-form-field";
import { Button } from "~/components/ui/button";

export default function FormAddEntity({
  fields,
  onSubmit,
  title,
  isPending,
  isOpen,
  onOpenChange,
}: {
  fields: {
    key: string;
    title: string;
  }[];
  onSubmit: (values: any) => void;
  title: string;
  isPending: boolean;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}) {
  const form = useForm({
    defaultValues: fields.reduce((acc, el) => {
      acc[el.key] = "";
      return acc;
    }, {} as any),
    onSubmit: async (values) => {
      onSubmit(values.value);
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          {fields.map((fieldScheme) => (
            <form.Field
              key={fieldScheme.key}
              name={fieldScheme.key}
              validators={{
                onChange: z.string().min(1),
              }}
            >
              {(field) => (
                <TextFormField
                  field={field}
                  label={fieldScheme.title}
                  inputProps={{}}
                />
              )}
            </form.Field>
          ))}
          <form.Subscribe
            selector={(form) => [form.isSubmitting, form.canSubmit]}
          >
            {([isSubmitting, canSubmit]) => (
              <Button
                type="submit"
                disabled={isSubmitting || isPending || !canSubmit}
              >
                Сохранить
              </Button>
            )}
          </form.Subscribe>
        </form>
      </DialogContent>
    </Dialog>
  );
}
