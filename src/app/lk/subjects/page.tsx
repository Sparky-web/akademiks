'use client'
import { useAppSelector } from "~/app/_lib/client-store";
import DbTable from "~/components/custom/db-table";
import InitializationErrorCard from "~/components/custom/errors/initialization-error-card";
import PageTitle from "~/components/custom/page-title";

export default function Page() {
    const user = useAppSelector(e => e.user?.user)

    if (!user || !user.isAdmin) return <InitializationErrorCard message={"Вы не администратор, доступ запрещен"} />


    return (
        <div className="grid gap-6">
            <PageTitle>Группы</PageTitle>
            <DbTable
                key="id"
                table="Subject"
                sql={`select l.title, group_concat(DISTINCT t.name) as teachers , group_concat(distinct g.title) as groups from Lesson l
left join Teacher t ON t.id = l.teacherId 
left join "Group" g on g.id = l.groupId 
GROUP by l.title`}
                filters={{
                    enabled: true
                }}
                columns={[
                    { accessorKey: 'title', header: 'Название', enableSorting: true, },
                    { accessorKey: 'teachers', header: 'Преподаватели', enableSorting: true,  },
                    { accessorKey: 'groups', header: 'Группы', enableSorting: true,  },
                ]}
            />
        </div>
    )
}