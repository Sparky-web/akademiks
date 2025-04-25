import Favourites from "./_lib/components/favourites";
import SelectSchedule from "./_lib/components/select-schedule";
import { api } from "~/trpc/server";
import SetSchedule from "./_lib/utils/set-schedule";
import CollegeCard from "./_lib/components/college-card";

export const revalidate = 1200;

export default async function AllSchedules() {
  const [groups, teachers] = await Promise.all([
    api.groups.get(),
    api.teachers.get(),
  ]);

  return (
    <div className="grid gap-6">
      <SetSchedule teachers={teachers} groups={groups}>
        <CollegeCard />
        <div className="grid gap-4 lg:grid-cols-2">
          <SelectSchedule />
          <Favourites />
        </div>
      </SetSchedule>
    </div>
  );
}
