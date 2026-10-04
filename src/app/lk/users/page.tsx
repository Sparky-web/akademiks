"use client";

import { useAppSelector } from "~/app/_lib/client-store";
import InitializationErrorCard from "~/components/custom/errors/initialization-error-card";
import PageTitle from "~/components/custom/page-title";
import { api } from "~/trpc/react";
import UserTable from "./components/table";
import UserSummary from "./components/summary";
import DbTable from "~/components/custom/db-table";
import { Checkbox } from "~/components/ui/checkbox";
import { Button } from "~/components/ui/button";
import { ClipboardIcon, RefreshCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "~/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Label, LabelGroup } from "~/components/custom/label-group";
import Link from "next/link";
import { Badge } from "~/components/ui/badge";

export default function Page() {
  const user = useAppSelector((e) => e.user?.user);

  const domain = typeof window !== "undefined" ? window.location.host : "";

  const { mutateAsync, isPending } =
    api.auth.createResetPasswordToken.useMutation();

  const utils = api.useUtils();
  const {
    mutateAsync: setTeacherVerified,
    isPending: isVerifyPending,
    variables: verifyVariables,
  } = api.users.setTeacherVerified.useMutation();
  // Блокируем только кнопку строки, по которой идёт запрос.
  const isVerifyPendingFor = (userId: string) =>
    isVerifyPending && verifyVariables?.userId === userId;

  const [resetToken, setResetToken] = useState<{
    token: string;
    email: string;
  }>();

  const toggleVerified = (userId: string, verified: boolean) => {
    setTeacherVerified({ userId, verified })
      .then(() => {
        toast.success(
          verified ? "Преподаватель подтверждён" : "Подтверждение отозвано",
        );
        return utils.table.get.invalidate();
      })
      .catch((e) => toast.error(e.message));
  };

  if (!user || !user.isAdmin)
    return (
      <InitializationErrorCard
        message={"Вы не администратор, доступ запрещен"}
      />
    );

  return (
    <div className="grid gap-6">
      <PageTitle>Пользователи</PageTitle>

      <DbTable
        key="id"
        table="User"
        sql={`select u.id, case when u.role = 1 then 'Студент' else 'Преподаватель' end as role, u.role as "roleId", u.name, u.email, u."isAdmin", u."isTeacherVerified", u."teacherId", t.name as "teacherName", g.title as "groupTitle", u."isNotificationsEnabled", count(ps.id) as "enabledNotificationsCount" from "User" u 
      left join "PushSubscription" ps on ps."userId" = u.id 
      left join "Teacher" t on t.id = u."teacherId"
      left join "Group" g on g.id = u."groupId"
      group by u.id, t.name, g.title`}
        filters={{
          enabled: true,
        }}
        options={{
          size: "base",
          header: {
            search: true,
            rowCount: true,
          },
          footer: {
            pagination: {
              enabled: false,
            },
          },
          virtualization: {
            enabled: true,
          },
        }}
        columns={[
          { accessorKey: "name", header: "Имя", enableSorting: true },
          {
            accessorKey: "email",
            header: "Email",
            enableSorting: true,
            size: 250,
          },
          {
            accessorKey: "role",
            header: "Роль",
            enableSorting: true,
            size: 200,
          },
          {
            accessorKey: "isAdmin",
            header: "Админ",
            enableSorting: true,
            cell: ({ cell }) => (cell.getValue() ? "Да" : "Нет"),
          },
          {
            accessorKey: "isNotificationsEnabled",
            header: "Уведомления",
            enableSorting: true,
            cell: ({ cell }) => (cell.getValue() ? "Да" : "Нет"),
          },
          {
            accessorKey: "enabledNotificationsCount",
            header: "Устройства (кол-во)",
            enableSorting: true,
            size: 100,
          },
          { accessorKey: "groupTitle", header: "Группа", enableSorting: true },
          {
            accessorKey: "teacherName",
            header: "Преподаватель",
            enableSorting: true,
          },
          {
            accessorKey: "isTeacherVerified",
            header: "Подтверждён",
            enableSorting: true,
            size: 220,
            cell: ({ row }) => {
              const { roleId, teacherId, isTeacherVerified, id } =
                row.original as unknown as {
                  id: string;
                  roleId: number;
                  teacherId: string | null;
                  isTeacherVerified: boolean;
                };
              if (roleId !== 2) return "—";

              if (isTeacherVerified)
                return (
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <Badge className="shrink-0 whitespace-nowrap">
                      Подтверждён
                    </Badge>
                    <Button
                      size={"xs"}
                      variant={"tenary"}
                      className="shrink-0"
                      disabled={isVerifyPendingFor(id)}
                      onClick={() => toggleVerified(id, false)}
                    >
                      Отозвать
                    </Button>
                  </div>
                );

              return (
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <Badge
                    variant={"outline"}
                    className="shrink-0 whitespace-nowrap"
                  >
                    Не подтверждён
                  </Badge>
                  <Button
                    size={"xs"}
                    className="shrink-0"
                    disabled={isVerifyPendingFor(id) || !teacherId}
                    title={
                      teacherId
                        ? undefined
                        : "Пользователь не выбрал преподавателя в профиле"
                    }
                    onClick={() => toggleVerified(id, true)}
                  >
                    Подтвердить
                  </Button>
                </div>
              );
            },
          },
          {
            accessorKey: "resetPassword",
            header: "Сбросить пароль",
            cell: ({ cell, row }) => {
              return (
                <Button
                  size={"xs"}
                  variant={"tenary"}
                  disabled={isPending}
                  onClick={() => {
                    mutateAsync({
                      email: row.original.email,
                    })
                      .then((data) => {
                        setResetToken({
                          email: row.original.email,
                          token: data.token,
                        });
                      })
                      .catch((e) => {
                        console.error(e);
                        toast.error(e.message);
                      });
                  }}
                >
                  <RefreshCcw className={cn("h-4 w-4")} />
                </Button>
              );
            },
          },
        ]}
      />

      <Dialog
        open={!!resetToken}
        onOpenChange={(isOpen) => {
          if (!isOpen) setResetToken(undefined);
        }}
      >
        {resetToken && (
          <DialogContent>
            <DialogTitle>Ссылка для сброса пароля</DialogTitle>
            <LabelGroup>
              <Label>email</Label>
              {resetToken.email}
            </LabelGroup>

            <LabelGroup>
              <Label>Ссылка</Label>
              <Link
                className="break-all text-primary"
                href={`https://${domain}/auth/reset-password?token=${resetToken.token}`}
              >
                {`https://${domain}/auth/reset-password?token=${resetToken.token}`}
              </Link>
              <Button
                size={"sm"}
                onClick={() => {
                  navigator.clipboard.writeText(
                    `https://${domain}/auth/reset-password?token=${resetToken.token}`,
                  );
                  toast.success("Ссылка скопирована в буфер обмена");
                }}
              >
                <ClipboardIcon className="h-4 w-4" />
                Скопировать
              </Button>
            </LabelGroup>

            <LabelGroup>
              <Label>QR код</Label>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://${domain}/auth/reset-password?token=${resetToken.token}`}
                alt="QR код"
              />
            </LabelGroup>
          </DialogContent>
        )}
      </Dialog>

      <UserSummary />
    </div>
  );
}
