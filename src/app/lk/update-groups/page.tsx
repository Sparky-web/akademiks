"use client";
import { useEffect, useState } from "react";
import Dropzone from "~/components/custom/dropzone";
import PageTitle from "~/components/custom/page-title";
import parseGroups from "./_lib/parse-groups";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { H4 } from "~/components/ui/typography";
import DataTable from "~/components/custom/table/data-table-new";
import { Button } from "~/components/ui/button";

export default function UpdateGroupsPage() {
  const [files, setFiles] = useState<File[]>([]);

  const [groups, setGroups] = useState<
    {
      id: string;
      title: string;
    }[]
  >([]);

  const { mutate, isPending } = api.groups.updateFromTable.useMutation({
    onSuccess: (value) => {
      toast.success("Группы успешно обновлены");
      setGroups([]);
      setFiles([]);
    },
    onError: (error) => {
      toast.error("Ошибка обновления групп: " + error.message);
      console.error(error);
    },
  });

  useEffect(() => {
    if (!files[0]) return;

    (async () => {
      const data = await parseGroups(files[0]!);
      console.log(data);
      setGroups(data);
      return;
    })();
  }, [files]);

  return (
    <div className="grid gap-6">
      <PageTitle>Обновить группы из таблицы</PageTitle>
      <Dropzone files={files.length ? [files[0]!] : []} setFiles={setFiles} />

      {groups.length ? (
        <div className="grid gap-4">
          <H4>Группы из таблицы</H4>

          <DataTable
            setTable={() => {}}
            columns={[
              {
                header: "Название",
                accessorKey: "title",
              },
              {
                header: "ID",
                accessorKey: "id",
              },
            ]}
            data={groups}
          />

          <Button
            onClick={() => mutate({ groups })}
            disabled={isPending}
            className="max-w-[200px]"
          >
            Загрузить группы
          </Button>
        </div>
      ) : undefined}
    </div>
  );
}
