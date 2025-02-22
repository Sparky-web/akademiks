"use client"
import { useAppSelector } from "~/app/_lib/client-store";
import DbTable from "~/components/custom/db-table";
import InitializationErrorCard from "~/components/custom/errors/initialization-error-card";
import PageTitle from "~/components/custom/page-title";

export default function Page() {
    const user = useAppSelector(e => e.user?.user)

    if (!user || !user.isAdmin) return <InitializationErrorCard message={"Вы не администратор, доступ запрещен"} />

    return (
        <div className="grid gap-6">
            <PageTitle>Преподаватели</PageTitle>
            <DbTable
                key="id"
                table="Teacher"
                sql={`select g.id, g.name, 
             count(l.id) as lessonsCount from "Teacher" g
      left join "Lesson" l on l."teacherId" = g.id
      group by g.id`}
                filters={{
                    enabled: true
                }}
                columns={[
                    { accessorKey: 'name', header: 'Преподаватель', enableSorting: true, },
                    { accessorKey: 'id', header: 'ID', enableSorting: true, },
                    { accessorKey: 'lessonsCount', header: 'Всего пар', enableSorting: true, },
                ]}
            />
        </div>
    )
}