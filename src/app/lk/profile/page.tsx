"use client";

import PageTitle from "~/components/custom/page-title";
import { api } from "~/trpc/react";
import SetSchedule from "../all-schedules/_lib/utils/set-schedule";
import EditData from "./_lib/componetns/edit-data";
import LogOutButton from "./_lib/componetns/log-out-button";
import NoUserBoundary from "./_lib/utils/no-user-boudary";

export default function Profile() {
  const { data: groups } = api.groups.get.useQuery(undefined, {
    suspense: true,
  });
  const { data: teachers } = api.teachers.get.useQuery(undefined, {
    suspense: true,
  });

  if (!groups || !teachers) return "Загрузка...";

  return (
    <SetSchedule groups={groups} teachers={teachers}>
      <div className="grid gap-6">
        <PageTitle>Профиль</PageTitle>
        <NoUserBoundary>
          <EditData />
          <div className="mt-auto">
            <LogOutButton />
          </div>
        </NoUserBoundary>
      </div>
    </SetSchedule>
  );
}
