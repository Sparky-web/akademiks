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

export default function Page() {
  const user = useAppSelector((e) => e.user?.user);

  const domain = typeof window !== "undefined" ? window.location.host : "";

  const { mutateAsync, isPending } =
    api.auth.createResetPasswordToken.useMutation();

  const [resetToken, setResetToken] = useState<{
    token: string;
    email: string;
  }>();

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
        sql={`select u.id, case when u.role = 1 then 'Студент' else 'Преподаватель' end as role, u.name, u.email, u."isAdmin", t.name as "teacherName", g.title as "groupTitle", u."isNotificationsEnabled", count(ps.id) as "enabledNotificationsCount" from "User" u 
      left join "PushSubscription" ps on ps."userId" = u.id 
      left join "Teacher" t on t.id = u."teacherId"
      left join "Group" g on g.id = u."groupId"
      group by u.id, t.name, g.title`}
        filters={{
          enabled: true,
        }}
        options={{
          size: "base",
          footer: {
            pagination: {
              enabled: false,
            },
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
                className="text-primary break-all"
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
