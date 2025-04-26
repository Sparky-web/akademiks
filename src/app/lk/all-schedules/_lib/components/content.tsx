"use client";

import { useAppSelector } from "~/app/_lib/client-store";
import CollegeCard from "./college-card";
import AdminSelector from "./admin-selector";
import Favourites from "./favourites";
import SelectSchedule from "./select-schedule";
import { useMediaQuery } from "usehooks-ts";

export default function ScheduleContent() {
  const user = useAppSelector((e) => e.user?.user);
  const isMobile = useMediaQuery("(max-width: 768px)");

  return (
    <>
      <CollegeCard />
      {user?.isAdmin && !isMobile ? (
        <AdminSelector />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <SelectSchedule />
          <Favourites />
        </div>
      )}
    </>
  );
}
