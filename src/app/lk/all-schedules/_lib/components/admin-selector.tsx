"use client";
import Link from "next/link";
import { useState } from "react";
import { useAppSelector } from "~/app/_lib/client-store";
import Card, { CardTitle } from "~/components/custom/card";
import WeekSelector from "~/components/custom/schedule/components/week-picker-desktop";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import DateTime from "~/lib/utils/datetime";

export default function ScheduleAdminSelector() {
  const [weekStart, setWeekStart] = useState(
    DateTime.now().startOf("week").toJSDate(),
  );

  const groups = useAppSelector((e) => e.schedule.groups);
  const teachers = useAppSelector((e) => e.schedule.teachers);

  const [searchGroup, setSearchGroup] = useState("");
  const [searchTeacher, setSearchTeacher] = useState("");

  if (!groups || !teachers)
    throw new Error("Не найдены группы и преподаватели");

  return (
    <div className="grid gap-4">
      <Card>
        <CardTitle>Выберите неделю</CardTitle>
        <div className="w-fit">
          <WeekSelector weekStart={weekStart} onChange={setWeekStart} />
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardTitle>Группы</CardTitle>
          <Input
            className="h-10"
            value={searchGroup}
            onChange={(e) => setSearchGroup(e.target.value)}
            placeholder="Поиск"
          />
          <div className="auto-fill-7xl grid gap-2">
            {groups
              .filter((group) =>
                group.title.toLowerCase().includes(searchGroup.toLowerCase()),
              )
              .map((group) => (
                <Link
                  target="_blank"
                  href={
                    "/lk/all-schedules/student/" +
                    group.id +
                    "?weekStart=" +
                    weekStart.toISOString()
                  }
                  key={group.id}
                >
                  <Button
                    key={group.id}
                    className="w-full"
                    variant={"tenary"}
                    size="xs"
                  >
                    {group.title}
                  </Button>
                </Link>
              ))}
          </div>
        </Card>

        <Card>
          <CardTitle>Преподаватели</CardTitle>
          <Input
            className="h-10"
            value={searchTeacher}
            onChange={(e) => setSearchTeacher(e.target.value)}
            placeholder="Поиск"
          />
          <div className="auto-fill-9xl grid gap-2">
            {teachers
              .filter((teacher) =>
                teacher.name
                  .toLowerCase()
                  .includes(searchTeacher.toLowerCase()),
              )
              .map((teacher) => (
                <Link
                  key={teacher.id}
                  target="_blank"
                  href={
                    "/lk/all-schedules/teacher/" +
                    teacher.id +
                    "?weekStart=" +
                    weekStart.toISOString()
                  }
                >
                  <Button
                    key={teacher.id}
                    className="w-full"
                    variant={"tenary"}
                    size="xs"
                  >
                    <span className="w-full truncate">{teacher.name}</span>
                  </Button>
                </Link>
              ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
