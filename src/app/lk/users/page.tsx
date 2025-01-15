'use client'

import { useAppSelector } from "~/app/_lib/client-store";
import InitializationErrorCard from "~/components/custom/errors/initialization-error-card";
import PageTitle from "~/components/custom/page-title";
import { api } from "~/trpc/react";
import UserTable from "./components/table";
import UserSummary from "./components/summary";
import DbTable from "~/components/custom/db-table";
import { Checkbox } from "~/components/ui/checkbox";

export default function Page() {
    const user = useAppSelector(e => e.user?.user)

    if (!user || !user.isAdmin) return <InitializationErrorCard message={"Вы не администратор, доступ запрещен"} />

    return (
        <div className="grid gap-6">
            <PageTitle>Пользователи</PageTitle>

            <DbTable
                key="id"
                table="User"
                sql={`select u.id, case when u.role = 1 then 'Студент' else 'Преподаватель' end as role, u.name, u.email, u.isAdmin, t.name as teacherName, g.title as groupTitle, u.isNotificationsEnabled, count(ps.id) as enabledNotificationsCount from "User" u 
      left join PushSubscription ps on ps.userId = u.id 
      left join Teacher t on t.id = u.teacherId 
      left join "Group" g on g.id = u.groupId
      group by u.id`}
                filters={{
                    enabled: true
                }}
                columns={[
                    { accessorKey: 'name', header: 'Имя', enableSorting: true },
                    { accessorKey: 'email', header: 'Email', enableSorting: true, size: 250 },
                    { accessorKey: 'role', header: 'Роль', enableSorting: true, size: 100 },
                    { accessorKey: 'isAdmin', header: 'Админ', enableSorting: true, cell: ({ cell }) => cell.getValue() ? 'Да' : 'Нет' },
                    { accessorKey: 'isNotificationsEnabled', header: 'Уведомления', enableSorting: true, cell: ({ cell }) => cell.getValue() ? 'Да' : 'Нет' },
                    { accessorKey: 'enabledNotificationsCount', header: 'Устройства (кол-во)', enableSorting: true, size: 100 },
                    { accessorKey: 'groupTitle', header: 'Группа', enableSorting: true },
                    { accessorKey: 'teacherName', header: 'Преподаватель', enableSorting: true },
                ]}
            />


            <UserSummary />
        </div>
    )
}