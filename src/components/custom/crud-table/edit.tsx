import { useForm } from "@tanstack/react-form";
import type { CrudTableFormField } from ".";
import { Dialog, DialogContent, DialogTitle } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { CrudTableForm, type CrudTableFormProps } from "./form";

export const CrudTableEdit = ({
  initialValues,
  fields,
  onSubmit,
  isPending,
  open,
  onOpenChange,
  customForm,
}: {
  initialValues: any;
  fields: CrudTableFormField[];
  onSubmit: (data: any) => void;
  isPending?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customForm?: React.FC<CrudTableFormProps>;
}) => {
  const form = useForm({
    defaultValues: initialValues,
    onSubmit: (data) => {
      onSubmit(data.value);
    },
  });

  const Form = customForm || CrudTableForm;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-fit max-w-fit">
        <DialogTitle>Редактирование</DialogTitle>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <Form form={form} fields={fields} />
          <Button type="submit" disabled={isPending}>
            Сохранить
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
