"use client";

import DateTime from "~/lib/utils/datetime";
import { FC, useEffect, useState } from "react";
import { api } from "~/trpc/react";
import Day from "./components/day";
import DayPicker from "./components/day-picker";
import PageTitle from "../page-title";
import EmptyWeek from "./components/empty-week";
import EmptyDay from "./components/empty-day";
import { P } from "~/components/ui/typography";
import { withErrorBoundary } from "../../../app/_lib/utils/error-boundary";
import DesktopSchedule from "./components/desktop-new";
import WeekSelector from "./components/week-picker-desktop";
import ErrorReportModal from "../errors/report-error";
import Card from "../card";

export interface ScheduleProps {
  type: "student" | "teacher" | "classroom";
  groupId?: string;
  teacherId?: string;
  classroomId?: number;
  endTitleElement?: React.ReactNode;
  weekStart?: string;
}

function Schedule(props: ScheduleProps) {
  const [weekStart, setWeekStart] = useState(
    props.weekStart
      ? new Date(props.weekStart)
      : DateTime.now().weekday === 7
        ? DateTime.now().startOf("week").plus({ week: 1 }).toJSDate()
        : DateTime.now().startOf("week").toJSDate(),
  );

  const [selectedDayStart, setSelectedDayStart] = useState(
    props.weekStart
      ? new Date(props.weekStart)
      : DateTime.now().weekday === 7
        ? DateTime.now().startOf("day").plus({ day: 1 }).toJSDate()
        : DateTime.now().startOf("day").toJSDate(),
  );

  const [_, { data }] = api.schedule.get.useSuspenseQuery(
    {
      groupId: props.type === "student" ? props.groupId : undefined,
      teacherId: props.type === "teacher" ? props.teacherId : undefined,
      classroomId: props.type === "classroom" ? props.classroomId : undefined,
      weekStart,
    },
    {
      refetchInterval: 60000,
    },
  );

  useEffect(() => {
    if (
      weekStart.toISOString() !==
      DateTime.now().startOf("week").toJSDate().toISOString()
    ) {
      setSelectedDayStart(
        DateTime.fromJSDate(weekStart).startOf("day").toJSDate(),
      );
    } else {
      setSelectedDayStart(DateTime.now().startOf("day").toJSDate());
    }
  }, [weekStart]);

  if (!data) return "Загрузка...";

  const foundDay = data.data.find(
    (day) => day.start.toISOString() === selectedDayStart.toISOString(),
  );

  const isEmpty =
    !data.data.length || !data.data.find((day) => day.lessons.length);

  return (
    <div className="grid w-full gap-6 overflow-hidden">
      <div className="flex content-center items-center gap-3">
        <PageTitle className="flex w-full items-center justify-between gap-4">
          Расписание:{" "}
          {data.type === "student"
            ? data.group?.title
            : data.type === "classroom"
              ? "аудитория " + data.classroom?.name
              : data.teacher?.name}
          {props.endTitleElement}
        </PageTitle>
        <div className="ml-auto w-fit max-lg:hidden">
          <WeekSelector weekStart={weekStart} onChange={setWeekStart} />
        </div>
      </div>

      <div className="grid gap-6 lg:hidden">
        <DayPicker
          days={data.data}
          weekStart={weekStart}
          onChange={setWeekStart}
          selectedDayStart={selectedDayStart}
          onSelectDay={setSelectedDayStart}
        />

        <div className="mt-4 grid gap-4">
          {isEmpty && (
            <div className="mt-6">
              <EmptyWeek
                onReturn={() =>
                  setWeekStart(DateTime.now().startOf("week").toJSDate())
                }
              />
            </div>
          )}

          {!isEmpty && !foundDay?.lessons.length && (
            <div className="mt-6">
              <EmptyDay />
            </div>
          )}

          {!isEmpty && foundDay && <Day day={foundDay} type={props.type} />}

          {!isEmpty && (
            <P className="bg-muted mx-auto mt-3 w-fit rounded-xl px-3 py-1 text-sm font-medium">
              {DateTime.fromJSDate(selectedDayStart).toLocaleString(
                DateTime.DATE_HUGE,
              )}
            </P>
          )}
        </div>
      </div>

      <div className="hidden w-full gap-6 overflow-hidden lg:grid">
        <DesktopSchedule schedule={data} weekStart={weekStart} />
      </div>

      <Card className="bg-primary/10 mt-6 rounded-md border-none max-lg:w-full lg:max-w-[400px]">
        <div className="text-sm">
          Если вы обнаружили ошибку в расписании, или другую неисправность,
          пожалуйста нажмите на кнопку ниже.
        </div>
        <ErrorReportModal />
      </Card>
    </div>
  );
}

export default withErrorBoundary(Schedule);
