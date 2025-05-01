"use client";

import { api } from "~/trpc/react";
import SetSchedule from "./_lib/utils/set-schedule";
import ScheduleContent from "./_lib/components/content";

export default function AllSchedules() {
  const { data: teachers } = api.teachers.get.useQuery(undefined, {
    suspense: true,
  });
  const { data: groups } = api.groups.get.useQuery(undefined, {
    suspense: true,
  });
  const { data: classrooms } = api.classrooms.get.useQuery(undefined, {
    suspense: true,
  });

  if (!teachers || !groups || !classrooms) return "Загрузка...";

  return (
    <div className="grid gap-6">
      <SetSchedule teachers={teachers} groups={groups} classrooms={classrooms}>
        <ScheduleContent />
      </SetSchedule>
    </div>
  );
}
