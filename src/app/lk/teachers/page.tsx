"use client";
import { Plus, Trash } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAppSelector } from "~/app/_lib/client-store";
import DbTable from "~/components/custom/db-table";
import InitializationErrorCard from "~/components/custom/errors/initialization-error-card";
import FormAddEntity from "~/components/custom/form/form-add-entity";
import PageTitle from "~/components/custom/page-title";
import PopConfirm from "~/components/custom/popconfirm";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";

export default function Page() {
  const user = useAppSelector((e) => e.user?.user);
  const utils = api.useUtils();
  const { mutate: deleteTeacher, isPending } = api.teachers.delete.useMutation({
    onSuccess: () => {
      toast.success("Преподаватель успешно удален");
      utils.table.get.invalidate();
      utils.table.get.refetch();
    },
    onError: (e) => {
      toast.error("Что-то пошло не так: " + e.message);
    },
  });

  const { mutate: addTeacher, isPending: isPendingAdd } =
    api.teachers.add.useMutation({
      onSuccess: () => {
        toast.success("Преподаватель успешно добавлен");
        utils.table.get.invalidate();
        utils.table.get.refetch();
        setIsOpen(false);
      },
      onError: (e) => {
        toast.error("Что-то пошло не так: " + e.message);
      },
    });

  const [isOpen, setIsOpen] = useState(false);

  if (!user || !user.isAdmin)
    return (
      <InitializationErrorCard
        message={"Вы не администратор, доступ запрещен"}
      />
    );

  return (
    <div className="grid gap-6">
      <PageTitle>Преподаватели</PageTitle>
      <Button
        onClick={() => setIsOpen(true)}
        className="w-[350px]"
        variant={"tenary"}
      >
        <Plus className="h-4 w-4" />
        Добавить преподавателя
      </Button>

      <FormAddEntity
        title="Добавить преподавателя"
        isPending={isPendingAdd}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        onSubmit={(values) => {
          addTeacher({
            name: values.name,
          });
        }}
        fields={[
          {
            title: "Имя",
            key: "name",
          },
        ]}
      />
      <DbTable
        key="id"
        table="Teacher"
        sql={`select g.id, g.name, 
             count(l.id) as lessonsCount from "Teacher" g
      left join "Lesson" l on l."teacherId" = g.id
      group by g.id`}
        filters={{
          enabled: true,
        }}
        columns={[
          { accessorKey: "name", header: "Преподаватель", enableSorting: true },
          { accessorKey: "id", header: "ID", enableSorting: true },
          {
            accessorKey: "lessonsCount",
            header: "Всего пар",
            enableSorting: true,
          },
          {
            accessorKey: "delete",
            header: "Удалить",
            cell: ({ cell, row }) => (
              <PopConfirm
                title="Удалить преподавателя"
                description="Вы уверены, что хотите удалить преподавателя?"
                onConfirm={() => deleteTeacher({ id: row.original.id })}
                onCancel={() => {}}
                isPending={isPending}
              >
                <Button size={"sm"} variant={"tenary"}>
                  <Trash className="h-4 w-4" />
                </Button>
              </PopConfirm>
            ),
          },
        ]}
      />
    </div>
  );
}
