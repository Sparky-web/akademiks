import createScheduleForGroup from "~/lib/utils/schedule/generate-example-schedule";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "../../trpc";
import { z } from "~/lib/utils/zod-russian";

import DateTime from "~/lib/utils/datetime";
import { TRPCClientError } from "@trpc/client";
import getStudentSchedule from "./_lib/utils/get-student-schedule";
import getTeacherSchedule from "./_lib/utils/get-teacher-schedule";
import updateSchedule, {
  ResultItem,
  UpdateReport,
} from "./_lib/utils/update-schedule";
import getScheduleDifference from "./_lib/utils/get-schedule-difference";
import { LessonParsed } from "~/lib/utils/schedule/flatten-schedule";
import { P } from "~/components/ui/typography";
import notifyFromReports from "./_lib/utils/notify-from-reports";
import generateReport from "./_lib/utils/generate-report";
import { allSchedulesProcedure } from "./_lib/utils/all-schedules-procedure";

export default createTRPCRouter({
  generate: protectedProcedure
    .input(
      z.object({
        groupId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.isAdmin)
        throw new TRPCClientError("Доступ запрещен");

      const group = await ctx.db.group.findFirst({
        where: {
          id: input.groupId,
        },
      });
      if (!group) throw new Error("Не найден");

      await createScheduleForGroup();

      return true;
    }),
  get: publicProcedure
    .input(
      z.object({
        groupId: z.string().optional(),
        teacherId: z.string().optional(),
        weekStart: z.date(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const isAdmin = ctx.session?.user?.isAdmin;

      if (input.groupId) {
        return await getStudentSchedule(
          input.groupId,
          input.weekStart,
          isAdmin,
        );
      } else if (input.teacherId) {
        return await getTeacherSchedule(input.teacherId, input.weekStart);
      }
      throw new TRPCClientError("Не указан ни groupId, ни teacherId");
    }),

  update: protectedProcedure
    .input(
      z.object({
        shouldDisplayForStudents: z.boolean(),
        updates: z.any(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.isAdmin)
        throw new TRPCClientError("Доступ запрещен");

      const startedAt = DateTime.now().toJSDate();

      const report = await updateSchedule(
        input.updates,
        input.shouldDisplayForStudents,
      );

      await ctx.db.report.create({
        data: {
          startedAt,
          endedAt: DateTime.now().toJSDate(),
          result: JSON.stringify(report),
        },
      });

      return report;
    }),
  difference: publicProcedure
    .input(z.any())
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.isAdmin)
        throw new TRPCClientError("Доступ запрещен");
      const difference = await getScheduleDifference(input);
      return difference;
    }),
  updateFromAdmin: protectedProcedure
    .input(
      z.object({
        shouldDisplayForStudents: z.boolean(),
        updates: z.any(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.isAdmin)
        throw new TRPCClientError("Доступ запрещен");
      const startedAt = DateTime.now().toJSDate();

      let updateReport: UpdateReport = {
        error: null,
        notificationError: null,
        summary: {
          added: 0,
          updated: 0,
          deleted: 0,
          notificationsSent: 0,
          notificationsError: 0,
          groupsAffected: [],
          teachersAffected: [],
        },
        result: [],
        notificationResult: [],
      };

      const lessons = input.updates as (LessonParsed & {
        id: number;
        isDeleted?: boolean;
        teacherId?: string;
        groupId?: string;
        classroomId: number;
        shouldDisplayForStudents: boolean;
      })[];

      const reports: ResultItem[] = [];

      for (let lesson of lessons) {
        if (lesson.isDeleted && lesson.id) {
          try {
            await ctx.db.lesson.delete({
              where: {
                id: lesson.id,
              },
            });
            reports.push({
              type: "delete",
              item: lesson,
              status: "success",
            });
          } catch (e) {
            reports.push({
              type: "delete",
              item: lesson,
              status: "error",
              error: e.message,
            });
            continue;
          }
          continue;
        }
        if (lesson.id) {
          try {
            const data = await ctx.db.lesson.findFirst({
              where: {
                id: lesson.id,
              },
              include: {
                Group: true,
                Teacher: true,
                Classroom: true,
              },
            });

            if (!data) {
              reports.push({
                type: "delete",
                inputItem: lesson,
                status: "error",
                error: "Не найдено пары для обновления",
              });
              continue;
            }

            await ctx.db.lesson.update({
              where: {
                id: lesson.id,
              },
              data: {
                title: lesson.title,
                start: lesson.start,
                end: lesson.end,
                index: lesson.index,
                subgroup: lesson.subgroup ? lesson.subgroup : null,
                teacherId: lesson.teacherId,
                groupId: lesson.Group?.id,
                classroomId: lesson.classroomId,
                shouldDisplayForStudents: input.shouldDisplayForStudents,
              },
            });

            reports.push({
              type: "update",
              inputItem: data,
              item: lesson,
              status: "success",
            });
          } catch (e) {
            reports.push({
              type: "update",
              inputItem: lesson,
              status: "error",
              error: e.message,
            });
          }
          continue;
        }

        try {
          const data = await ctx.db.lesson.create({
            data: {
              title: lesson.title,
              start: lesson.start,
              end: lesson.end,
              startDay: DateTime.fromJSDate(lesson.start)
                .startOf("day")
                .toJSDate(),
              index: lesson.index,
              subgroup: lesson.subgroup ? lesson.subgroup : null,
              teacherId: lesson.teacherId,
              groupId: lesson.Group?.id,
              classroomId: lesson.classroomId,
              shouldDisplayForStudents: input.shouldDisplayForStudents,
            },
          });
          reports.push({
            type: "add",
            item: lesson,
            status: "success",
          });
        } catch (e) {
          reports.push({
            type: "add",
            item: lesson,
            status: "error",
            error: e.message,
          });
        }
      }

      let notificationResult: UpdateReport["notificationResult"] = [];

      try {
        notificationResult = await notifyFromReports(
          reports,
          input.shouldDisplayForStudents,
        );
      } catch (e) {
        console.error("Ошибка отправки уведомлений: " + e.message);
        updateReport.notificationError = e.message;
      }

      updateReport = generateReport(updateReport, reports, notificationResult);

      await ctx.db.report.create({
        data: {
          startedAt,
          endedAt: DateTime.now().toJSDate(),
          result: JSON.stringify(updateReport),
        },
      });

      return updateReport;
    }),
  changeVisibility: protectedProcedure
    .input(
      z.object({
        dstart: z.date(),
        dend: z.date(),
        shouldDisplayForStudents: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.isAdmin)
        throw new TRPCClientError("Доступ запрещен");
      const { dstart, dend, shouldDisplayForStudents } = input;

      const startedAt = DateTime.now().toJSDate();

      await ctx.db.lesson.updateMany({
        where: {
          start: {
            gte: dstart,
            lte: dend,
          },
        },
        data: {
          shouldDisplayForStudents,
        },
      });

      const data = await ctx.db.lesson.findMany({
        where: {
          start: {
            gte: dstart,
            lte: dend,
          },
        },
        include: {
          Group: true,
          Teacher: true,
        },
      });

      let updateReport: UpdateReport = {
        error: null,
        notificationError: null,
        summary: {
          added: 0,
          updated: 0,
          deleted: 0,
          notificationsSent: 0,
          notificationsError: 0,
          groupsAffected: [],
          teachersAffected: [],
          errors: 0,
        },
        result: [],
        notificationResult: [],
      };

      const report: ResultItem[] = data.map((e) => ({
        type: "update",
        status: "success",
        item: e,
        inputItem: e,
        error: null,
      }));

      if (shouldDisplayForStudents) {
        try {
          updateReport.notificationResult = await notifyFromReports(
            report,
            shouldDisplayForStudents,
            false,
          );
        } catch (e) {
          console.error("Ошибка отправки уведомлений: " + e.message);
          return "ok";
        }
      }

      updateReport = generateReport(
        updateReport,
        report,
        updateReport.notificationResult,
      );

      await ctx.db.report.create({
        data: {
          startedAt,
          endedAt: DateTime.now().toJSDate(),
          result: JSON.stringify(updateReport),
        },
      });

      return updateReport;
    }),
  getIsVisible: protectedProcedure
    .input(
      z.object({
        start: z.date(),
        end: z.date(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user?.isAdmin)
        throw new TRPCClientError("Доступ запрещен");
      const { start, end } = input;

      const isVisible = await ctx.db.lesson.findFirst({
        where: {
          start: {
            gte: start,
            lt: end,
          },
          shouldDisplayForStudents: true,
        },
      });

      const isScheduleExists = await ctx.db.lesson.findFirst({
        where: {
          start: {
            gte: start,
            lt: end,
          },
        },
      });

      return {
        isScheduleExists: isScheduleExists !== null,
        isVisible: !!isVisible,
      };
    }),
  allSchedules: allSchedulesProcedure,
});
