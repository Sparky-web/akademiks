import { SheetSchedule } from "../../../app/lk/add-schedule/_lib/utils/parse-schedule";
import { Duration } from "luxon";

import DateTime from "~/lib/utils/datetime";
import { Lesson } from "~/types/schedule";
import config from "./config";

export type LessonParsed = {
  index: number;
  type?: string;
  start: Date;
  end: Date;
  group: string;
  subgroup: number | null;
} & (
  | {
      title: string;
      classroom: string;
      classroomAddress?: string;
      teacher: string;
    }
  | {
      title: null;
    }
);

export default function flattenSchedule(
  schedule: SheetSchedule[],
): LessonParsed[] {
  const lessons: LessonParsed[] = [];

  schedule.forEach((day) => {
    const startDay = DateTime.fromFormat(day.date, "dd.MM.yyyy").startOf("day");

    day.groups.forEach((group) => {
      group.lessons.forEach((lesson) => {
        const start = startDay.plus(
          Duration.fromISOTime(config.timetable[lesson.index - 1].start),
        );
        const end = startDay.plus(
          Duration.fromISOTime(config.timetable[lesson.index - 1].end),
        );

        if (lesson.title === null) {
          lessons.push({
            index: lesson.index,
            title: null,
            start: start.toJSDate(),
            end: end.toJSDate(),
            group: group.title,
            subgroup: lesson.group,
          });

          return;
        }

        lesson.classroom =
          lesson.classroom?.toString()?.trim?.() ||
          lesson.classroom ||
          "Не указан";

        lessons.push({
          index: lesson.index,
          title: lesson.title,
          start: start.toJSDate(),
          end: end.toJSDate(),
          classroom: lesson.classroom,
          teacher: lesson.teacher,
          group: group.title,
          subgroup: lesson.group,
        });
      });
    });
  });

  return lessons;
}
