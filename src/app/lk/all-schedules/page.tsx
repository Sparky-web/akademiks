import { api } from "~/trpc/server";
import SetSchedule from "./_lib/utils/set-schedule";
import ScheduleContent from "./_lib/components/content";

export const revalidate = 1200;

export default async function AllSchedules() {
  const [groups, teachers] = await Promise.all([
    api.groups.get(),
    api.teachers.get(),
  ]);

  return (
    <div className="grid gap-6">
      <SetSchedule teachers={teachers} groups={groups}>
        <ScheduleContent />
      </SetSchedule>
    </div>
  );
}
