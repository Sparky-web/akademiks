"use client";
import React, { useState } from "react";
import type { z } from "zod";
import { type ExtendedColumnDef } from "../table/types/new";
import { api } from "~/trpc/react";
import DataTable from "../table/data-table-new";
import { Button } from "~/components/ui/button";
import { PencilIcon, Plus, TrashIcon } from "lucide-react";
import { CrudTableAdd } from "./add";
import { toast } from "sonner";
import Card from "../card";
import { CrudTableEdit } from "./edit";
import type { CrudTableFormProps } from "./form";
import PopConfirm from "../popconfirm";

export type CrudTableRouter = typeof api.base;

export type CrudTableFormField = {
  name: string;
  label: string;
  schema: z.ZodTypeAny;
};

export const CrudTable = <T,>({
  router,
  columns,
  fields,
  customForm,
  defaultFormValues,
}: {
  router: CrudTableRouter;
  columns: ExtendedColumnDef<T>[];
  fields: CrudTableFormField[];
  customForm?: React.FC<CrudTableFormProps>;
  defaultFormValues?: any;
}) => {
  const { data, isPending, refetch } = router.get.useQuery();

  const { mutate: create, isPending: isCreating } = router.create.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Успешно добавлено");
      setOpenDialogAdd(false);
    },
    onError: () => {
      toast.error("Ошибка добавления");
    },
  });

  const [openDialogAdd, setOpenDialogAdd] = useState(false);

  return (
    <div className="grid gap-4">
      <Button className="w-[300px]" onClick={() => setOpenDialogAdd(true)}>
        <Plus className="h-4 w-4" />
        Добавить
      </Button>
      <CrudTableAdd
        fields={fields}
        onSubmit={(data) => {
          create(data);
        }}
        isPending={isCreating}
        open={openDialogAdd}
        onOpenChange={(open) => setOpenDialogAdd(open)}
        customForm={customForm}
        defaultValues={defaultFormValues}
      />
      <DataTable
        columns={[
          ...columns,
          {
            accessorKey: "actions",
            header: "Действия",
            cell: ({ row }) => {
              const { mutate: deleteRow, isPending: isDeletePending } =
                router.delete.useMutation({
                  onSuccess: () => {
                    refetch();
                    toast.success("Успешно удалено");
                  },
                  onError: () => {
                    toast.error("Ошибка удаления");
                  },
                });

              const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

              const { mutate: editRow, isPending: isEditPending } =
                router.update.useMutation({
                  onSuccess: () => {
                    refetch();
                    toast.success("Успешно обновлено");
                    setIsEditDialogOpen(false);
                  },
                  onError: () => {
                    toast.error("Ошибка обновления");
                  },
                });

              return (
                <div className="flex gap-2">
                  <PopConfirm
                    title="Удалить аудиторию"
                    description="Вы уверены, что хотите удалить аудиторию?"
                    onConfirm={() =>
                      deleteRow({
                        id: row.original.id,
                      })
                    }
                    onCancel={() => {}}
                    isPending={isDeletePending}
                  >
                    <Button
                      variant={"tenary"}
                      className="bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-500"
                      size={"sm"}
                      disabled={isDeletePending}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </PopConfirm>

                  <Button
                    variant="outline"
                    size={"sm"}
                    onClick={() => {
                      setIsEditDialogOpen(true);
                    }}
                  >
                    <PencilIcon className="h-4 w-4" />
                  </Button>
                  <CrudTableEdit
                    initialValues={row.original}
                    fields={fields}
                    onSubmit={(data) => {
                      editRow({
                        id: row.original.id,
                        data,
                      });
                    }}
                    isPending={isEditPending}
                    open={isEditDialogOpen}
                    onOpenChange={(open) => setIsEditDialogOpen(open)}
                    customForm={customForm}
                  />
                </div>
              );
            },
          },
        ]}
        data={data || []}
        loading={isPending}
        refetchData={refetch}
        options={{
          virtualization: {
            enabled: false,
          },
          footer: {
            pagination: {
              enabled: false,
            },
          },
          filters: {
            enabled: true,
          },
          header: {
            columnManagement: false,
          },
        }}
      />
    </div>
  );
};
