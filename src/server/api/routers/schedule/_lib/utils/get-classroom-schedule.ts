import { Lesson } from "@prisma/client";
import DateTime from "~/lib/utils/datetime";
import { db } from "~/server/db";

const getClassroomSchedule = async (
  classroomId: number,
  weekStart: Date,
  isAdmin: boolean,
) => {
  const classroom = await db.classroom.findUnique({
    where: {
      id: classroomId,
    },
  });

  if (!classroom) throw new Error("Не найдена аудитория c id:" + classroomId);

  const data = await db.lesson.findMany({
    orderBy: {
      start: "asc",
    },
    where: {
      Classroom: {
        id: classroomId,
      },
      start: {
        gte: weekStart,
        lt: DateTime.fromJSDate(weekStart).plus({ week: 1 }).toJSDate(),
      },
    },
    include: {
      Teacher: {
        select: {
          id: true,
          name: true,
        },
      },
      Group: {
        select: {
          id: true,
          title: true,
        },
      },
      Classroom: true,
    },
  });

  const days: {
    start: Date;
    lessons: Lesson[];
  }[] = [];

  for (let lesson of data) {
    const foundDay = days.find(
      (day) => day.start.toString() === lesson.startDay.toString(),
    );

    if (!foundDay) {
      days.push({
        start: lesson.startDay,
        lessons: [lesson],
      });
    } else {
      foundDay.lessons.push(lesson);
    }
  }

  return {
    data: days,
    type: "classroom",
    classroom: classroom,
  };
};

export default getClassroomSchedule;
