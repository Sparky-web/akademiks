import { publicProcedure } from "~/server/api/trpc";
import getStudentSchedule from "./get-student-schedule";
import { DateTime } from "luxon";

export const allSchedulesProcedure = publicProcedure.query(async ({ ctx }) => {
  const groups = await ctx.db.group.findMany();

  const groupsSchedules = await Promise.all(
    groups.map(async (group) => {
      return await getStudentSchedule(
        group.id,
        DateTime.now().startOf("week").toJSDate(),
        true,
      );
    }),
  );

  // Ссылки на видеовстречи видны только авторизованным пользователям.
  if (ctx.session?.user) return groupsSchedules;
  return groupsSchedules.map((schedule) => ({
    ...schedule,
    data: schedule.data.map((day) => ({
      ...day,
      lessons: day.lessons.map((lesson) => ({ ...lesson, meetingUrl: null })),
    })),
  }));
});
