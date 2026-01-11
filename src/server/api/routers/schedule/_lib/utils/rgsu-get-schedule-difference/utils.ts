import { Prisma } from "@prisma/client";
import { LessonsGrouped, LessonUpdate } from "./types";
import DateTime from "~/lib/utils/datetime";
import config from "~/lib/utils/schedule/config";
import _, { findIndex } from "lodash";
import { LessonParsed } from "~/lib/utils/schedule/flatten-schedule";

export const groupExistingLessonsByDay = (
  lessons: Prisma.LessonGetPayload<{
    include: {
      Group: true;
      Teacher: true;
      Classroom: true;
    };
  }>[],
  start: Date,
  end: Date,
) => {
  const lessonsGrouped: LessonsGrouped = [];

  const startDay = DateTime.fromJSDate(start).startOf("day");

  const daysToFill =
    Math.floor(
      DateTime.fromJSDate(end).startOf("day").diff(startDay, "days").toObject()
        .days ?? 0,
    ) + 1;

  const existingLessonsGrouped = _.groupBy(lessons, (lesson) =>
    DateTime.fromJSDate(lesson.startDay).toISO(),
  );

  for (let i = 0; i < daysToFill; i++) {
    const startDayCurrent = startDay.plus({ days: i }).toISO();

    // Не бывает
    if (!startDayCurrent)
      throw new Error(
        "groupExistingLessonsByDay: не удалось распарсить дату начала дня",
      );

    const existingDay = existingLessonsGrouped[startDayCurrent];

    if (!existingDay) {
      lessonsGrouped.push({
        startDay: startDayCurrent,
        slots: [],
      });
      continue;
    }

    const currentDay = {
      startDay: startDayCurrent,
      slots: getDaySlots(),
    };

    const existingDayLessonsGrouped = _.groupBy(
      existingDay,
      (lesson) => lesson.index,
    );

    for (const slot of currentDay.slots) {
      const existingLessonsInSlot =
        existingDayLessonsGrouped[slot.startIndex.toString()];

      if (existingLessonsInSlot?.length) {
        slot.lessons = existingLessonsInSlot.map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          groupId: lesson.Group?.id,
          index: lesson.index,
          type: lesson.type ?? undefined,
          start: lesson.start,
          classroom: lesson.Classroom?.name ?? "",
          classroomAddress: lesson.Classroom?.address ?? undefined,
          teacher: lesson.Teacher?.name ?? "",
          end: lesson.end,
          group: lesson.Group?.title ?? "",
          subgroup: lesson.subgroup,
        }));
      }
    }

    lessonsGrouped.push(currentDay);
  }

  return lessonsGrouped;
};

/**
 * Функция группировки обновленного расписания
 * @param lessons расписание на неделю, опирается на то,
 * что все слоты в периоде будут заполнены
 */
export const groupNewLessonsByDay = (
  lessons: LessonParsed[],
): LessonsGrouped => {
  const grouped: LessonsGrouped = [];

  const groupedByStartDay = _.groupBy(lessons, (lesson) =>
    DateTime.fromJSDate(lesson.start).startOf("day").toISO(),
  );

  for (const [startDay, lessons] of Object.entries(groupedByStartDay)) {
    const groupedBySlots = _.groupBy(lessons, (lesson) => lesson.index);

    const slots = Object.entries(groupedBySlots).map(([slot, lessons]) => ({
      startIndex: Number(slot),
      lessons: lessons.every((lesson) => lesson.title === null) ? [] : lessons,
    }));

    grouped.push({
      startDay,
      slots: slots.every((slot) => !slot.lessons.length) ? [] : slots,
    });
  }

  return grouped;
};

/**
 * Функция возвращает разницу старого и нового расписания
 * Предполагает что оба параметра имеют одинакувую заполненность по дням
 * @param oldSchedule старое расписание
 * @param newSchedule новое расписание
 */
export const compareSchedules = (
  oldSchedule: LessonsGrouped,
  newSchedule: LessonsGrouped,
): LessonUpdate[] => {
  const updates: LessonUpdate[] = [];

  if (oldSchedule.length !== newSchedule.length)
    throw new Error(
      "compareSchedules: невозможно сравнить массивы с разным периодом",
    );

  for (let i = 0; i < oldSchedule.length; i++) {
    const oldDay = oldSchedule[i]!;
    const newDay = newSchedule[i]!;

    if (oldDay.slots.length === 0 && newDay.slots.length === 0) continue;

    // Если внутри дня нет ничего, но при этом в новом массиве день не пустой - записываем все пары как новые
    if (oldDay.slots.length === 0 && newDay.slots.length !== 0) {
      const newLessons = newDay.slots.flatMap((slot) => slot.lessons);
      updates.push(...newLessons.map((lesson) => ({ from: null, to: lesson })));

      continue;
    }

    // Если внутри дня есть что-то но при этом в новом массиве день пустой - удаляем все пары
    if (oldDay.slots.length !== 0 && newDay.slots.length === 0) {
      const oldLessons = oldDay.slots.flatMap((slot) => slot.lessons);
      updates.push(...oldLessons.map((lesson) => ({ from: lesson, to: null })));

      continue;
    }

    // Проходимся по каждой паре исходного массива
    for (let slotI = 0; slotI < oldDay.slots.length; slotI++) {
      const oldSlot = oldDay.slots[slotI]!;
      const newSlot = newDay.slots[slotI]!;

      if (oldSlot.lessons.length === 0 && newSlot.lessons.length === 0)
        continue;

      // Если массив пар в слоте пустой и есть хотя бы одна пара в новом массиве - добавляем все пары из нового
      if (oldSlot.lessons.length === 0 && newSlot.lessons.length !== 0) {
        updates.push(
          ...newSlot.lessons.map((lesson) => ({ from: null, to: lesson })),
        );
        continue;
      }

      // Если массив пар наполнен, но в новом массиве слот пустой - удаляем все пары из исходного
      if (oldSlot.lessons.length !== 0 && newSlot.lessons.length === 0) {
        updates.push(
          ...oldSlot.lessons.map((lesson) => ({ from: lesson, to: null })),
        );
        continue;
      }

      for (const lesson of oldSlot.lessons) {
        // Проверяем есть ли в новом массиве такая пара по точному совпадению с подгруппой
        const foundInNewSlotIndex = newSlot.lessons.findIndex((newLesson) =>
          isLessonsEqual(lesson, newLesson),
        );

        // Если нет - удаляем пару
        if (foundInNewSlotIndex < 0) {
          updates.push({
            from: lesson,
            to: null,
          });
          continue;
        }

        // Если есть - удаляем эту пару из нового массива
        newSlot.lessons.splice(foundInNewSlotIndex, 1);
      }

      // Все, что осталось - добавляем
      if (newSlot.lessons.length) {
        updates.push(
          ...newSlot.lessons.map((lesson) => ({
            from: null,
            to: lesson,
          })),
        );
      }
    }
  }

  return updates;
};

const isLessonsEqual = (lesson1: LessonParsed, lesson2: LessonParsed) =>
  lesson1.title === lesson2.title &&
  lesson1.subgroup === lesson2.subgroup &&
  lesson1.type === lesson2.type &&
  "teacher" in lesson1 &&
  "teacher" in lesson2 &&
  lesson1.teacher === lesson2.teacher &&
  lesson1.classroom === lesson2.classroom &&
  lesson1.classroomAddress === lesson2.classroomAddress;

const getDaySlots = (): LessonsGrouped[number]["slots"] => {
  return config.timetable.map((slot) => ({
    startIndex: slot.index,
    lessons: [],
  }));
};
