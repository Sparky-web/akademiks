import { TRPCError } from "@trpc/server";
import { type db } from "~/server/db";

/**
 * Возвращает пару, если её ведёт текущий подтверждённый преподаватель.
 * Иначе бросает FORBIDDEN. `what` — что именно правит преподаватель («ссылку», «комментарий»).
 */
export async function getOwnLessonOfVerifiedTeacher(
  ctx: { db: typeof db; session: { user: { id: string } } },
  lessonId: number,
  what: string,
) {
  const user = await ctx.db.user.findUnique({
    where: { id: ctx.session.user.id },
  });

  if (!user || user.role !== 2 || !user.teacherId)
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Добавить ${what} может только преподаватель`,
    });
  if (!user.isTeacherVerified)
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Аккаунт преподавателя ещё не подтверждён администратором",
    });

  const lesson = await ctx.db.lesson.findUnique({
    where: { id: lessonId },
    include: { Classroom: true },
  });
  if (!lesson || lesson.teacherId !== user.teacherId)
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Можно менять ${what} только в своих парах`,
    });

  return lesson;
}
