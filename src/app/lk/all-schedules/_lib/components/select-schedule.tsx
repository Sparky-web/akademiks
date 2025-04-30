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

function SelectSchedule() {
  const { groups, teachers, classrooms } = useAppSelector(
    (state) => state.schedule,
  );

  if (!groups || !teachers)
    throw new Error("Не найдены группы и преподаватели");

  const types = [
    { value: "student", label: "Студент" },
    { value: "teacher", label: "Преподаватель" },
    { value: "classroom", label: "По аудитории" },
  ];

  const [scheduleType, setScheduleType] = React.useState<string | null>(
    "student",
  );
  const [groupId, setGroupId] = React.useState<string | null>(null);
  const [teacherId, setTeacherId] = React.useState<string | null>(null);
  const [classroomId, setClassroomId] = React.useState<number | null>(null);

  useEffect(() => {
    setGroupId(null);
    setTeacherId(null);
    setClassroomId(null);
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
              {/* {types.map((e) => (
                <SelectItem key={e.value} value={e.value}>
                  {e.label}
                </SelectItem>
              ))} */}
              <SelectItem value="student" className="font-medium">
                Студент
              </SelectItem>
              <SelectItem value="teacher" className="font-medium">
                Преподаватель
              </SelectItem>
              {!!classrooms?.length && (
                <SelectItem value="classroom" className="font-medium">
                  По аудитории
                </SelectItem>
              )}
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

        {scheduleType === "classroom" && (
          <div className="grid gap-1.5">
            <Label>Аудитория</Label>
            <Combobox
              data={
                classrooms?.map((classroom) => ({
                  value: classroom.id.toString(),
                  label: classroom.name,
                })) || []
              }
              value={classroomId?.toString() || ""}
              onChange={(value) => setClassroomId(value ? +value : null)}
            />
          </div>
        )}

        {(groupId || teacherId || classroomId) && (
          <Link
            href={`/lk/all-schedules/${scheduleType}/${groupId || teacherId || classroomId}`}
          >
            <Button className="w-full">Открыть расписание</Button>
          </Link>
        )}
      </div>
    </Card>
  );
}

export default withErrorBoundary(SelectSchedule);
