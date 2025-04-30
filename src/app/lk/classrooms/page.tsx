"use client";
import { useAppSelector } from "~/app/_lib/client-store";
import { CrudTable } from "~/components/custom/crud-table";
import InitializationErrorCard from "~/components/custom/errors/initialization-error-card";
import PageTitle from "~/components/custom/page-title";
import { z } from "~/lib/utils/zod-russian";
import { api } from "~/trpc/react";

export default function ClassroomsPage() {
  const user = useAppSelector((state) => state.user.user);

  if (!user?.isAdmin)
    return (
      <InitializationErrorCard
        message={"Вы не администратор, доступ запрещен"}
      />
    );

  return (
    <div className="grid gap-6">
      <PageTitle>Аудитории</PageTitle>
      <CrudTable
        router={api.classrooms}
        columns={[
          {
            accessorKey: "name",
            header: "Название",
            cell: ({ row }) => {
              return <div>{row.getValue("name")}</div>;
            },
          },
          {
            accessorKey: "id",
            header: "ID",
          },
          {
            accessorKey: "isHidden",
            header: "Скрыто",
            cell: ({ row }) => {
              return <div>{row.getValue("isHidden") ? "Да" : "Нет"}</div>;
            },
          },
        ]}
        fields={[
          {
            label: "Название",
            schema: z.string(),
            name: "name",
          },
          {
            label: "Скрыто",
            schema: z.boolean(),
            name: "isHidden",
          },
        ]}
      />
    </div>
  );
}
