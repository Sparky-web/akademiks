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
  const { mutate: deleteGroup, isPending } = api.groups.delete.useMutation({
    onSuccess: () => {
      toast.success("Группа успешно удалена");
      utils.table.get.invalidate();
      utils.table.get.refetch();
    },
    onError: (e) => {
      toast.error("Что-то пошло не так: " + e.message);
    },
  });
  const { mutate: addGroup, isPending: isPendingAdd } =
    api.groups.add.useMutation({
      onSuccess: () => {
        toast.success("Группа успешно добавлена");
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
      <PageTitle>Группы</PageTitle>

      <Button
        onClick={() => setIsOpen(true)}
        className="w-[350px]"
        variant={"tenary"}
      >
        <Plus className="h-4 w-4" />
        Добавить группу
      </Button>

      <FormAddEntity
        title="Добавить группу"
        isPending={isPendingAdd}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        onSubmit={(values) => {
          addGroup({
            title: values.title,
          });
        }}
        fields={[
          {
            title: "Название",
            key: "title",
          },
        ]}
      />
      <DbTable
        key="id"
        table="Group"
        sql={`select g.id, g.title, 
                (select count(*) from "User" u where u."groupId" = g.id) as "usersCount",
             count(l.id) as lessonsCount from "Group" g
      left join "Lesson" l on l."groupId" = g.id
      group by g.id`}
        filters={{
          enabled: true,
        }}
        columns={[
          { accessorKey: "title", header: "Название", enableSorting: true },
          { accessorKey: "id", header: "ID", enableSorting: true },
          {
            accessorKey: "usersCount",
            header: "Пользователей",
            enableSorting: true,
          },
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
                title="Удалить группу"
                description="Вы уверены, что хотите удалить группу?"
                onConfirm={() => deleteGroup({ id: row.original.id })}
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
