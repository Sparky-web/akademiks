"use client";
import Link from "next/link";
import React, { useEffect } from "react";
import { useAppSelector } from "~/app/_lib/client-store";
import Card, { CardTitle } from "~/components/custom/card";
import { Combobox } from "~/components/custom/combobox";
import { withErrorBoundary } from "~/app/_lib/utils/error-boundary";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { api } from "~/trpc/react";

function SelectSchedule() {
  const { groups, teachers } = useAppSelector((state) => state.schedule);

  const { data } = api.schedule.allSchedules.useQuery();

  console.log(data);

  if (!groups || !teachers)
    throw new Error("Не найдены группы и преподаватели");

  const types = [
    { value: "student", label: "Студент" },
    { value: "teacher", label: "Преподаватель" },
  ];

  const [scheduleType, setScheduleType] = React.useState<string | null>(
    "student",
  );
  const [groupId, setGroupId] = React.useState<string | null>(null);
  const [teacherId, setTeacherId] = React.useState<string | null>(null);

  useEffect(() => {
    setGroupId(null);
    setTeacherId(null);
  }, [scheduleType]);

  return (
    <Card>
      <CardTitle>Просмотр расписания</CardTitle>
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <Label>Тип расписания</Label>
          <Select
            value={scheduleType || undefined}
            onValueChange={setScheduleType}
          >
            <SelectTrigger>
              <SelectValue placeholder="Выберите тип расписания" />
            </SelectTrigger>
            <SelectContent>
              {types.map((e) => (
                <SelectItem key={e.value} value={e.value}>
                  {e.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {scheduleType === "student" && (
          <div className="grid gap-1.5">
            <Label>Группа</Label>

            <Combobox
              data={groups.map((group) => ({
                value: group.id,
                label: group.title,
              }))}
              value={groupId}
              onChange={setGroupId}
            />
          </div>
        )}

        {scheduleType === "teacher" && (
          <div className="grid gap-1.5">
            <Label>Преподаватель</Label>
            <Combobox
              data={teachers.map((teacher) => ({
                value: teacher.id,
                label: teacher.name,
              }))}
              value={teacherId}
              onChange={setTeacherId}
            />
          </div>
        )}

        {(groupId || teacherId) && (
          <Link
            href={`/lk/all-schedules/${scheduleType}/${groupId || teacherId}`}
          >
            <Button className="w-full">Открыть расписание</Button>
          </Link>
        )}
      </div>
    </Card>
  );
}

export default withErrorBoundary(SelectSchedule);
