"use client";

import dynamic from "next/dynamic";
import { api } from "~/trpc/react";
import SetSchedule from "./_lib/utils/set-schedule";

// Рендерим только на клиенте: внутри useMediaQuery, который на сервере и клиенте
// даёт разное значение и ломал гидрацию (React #418)
const ScheduleContent = dynamic(() => import("./_lib/components/content"), {
  ssr: false,
});

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
