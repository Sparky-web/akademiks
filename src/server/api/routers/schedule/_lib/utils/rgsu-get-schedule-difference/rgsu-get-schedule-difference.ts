import _ from "lodash";
import { LessonParsed } from "~/lib/utils/schedule/flatten-schedule";
import getPeriod from "~/lib/utils/schedule/get-period";
import getUniqueGroups from "~/lib/utils/schedule/get-unique-groups";
import { db } from "~/server/db";
import {
  compareSchedules,
  groupExistingLessonsByDay,
  groupNewLessonsByDay,
} from "./utils";

/**
 * Новый алгоритм обновления расписания, с группировкой
 * @param schedule расписание для обновления - строго одна группа
 */
export const rgsuGetScheduleDifference = async (schedule: LessonParsed[]) => {
  const groups = getUniqueGroups(schedule);

  if (groups.length > 1) {
    throw new Error(
      "rgsuGetScheduleDifference: не поддерживает несколько групп",
    );
  }

  // Запрашиваем только для актуального периода
  const { minDate, maxDate } = getPeriod(schedule);

  const existingLessons = await db.lesson.findMany({
    where: {
      start: {
        gte: minDate,
        lte: maxDate,
      },
      Group: {
        title: {
          in: groups,
        },
      },
    },
    orderBy: {
      start: "asc",
    },
    include: {
      Group: true,
      Teacher: true,
      Classroom: true,
    },
  });

  const existingLessonsGrouped = groupExistingLessonsByDay(
    existingLessons,
    minDate,
    maxDate,
  );

  const newLessonsGrouped = groupNewLessonsByDay(schedule);

  return compareSchedules(existingLessonsGrouped, newLessonsGrouped);
};
