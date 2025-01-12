import createScheduleForGroup from "~/lib/utils/schedule/generate-example-schedule";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../../trpc";
import { z } from "~/lib/utils/zod-russian"

import DateTime from "~/lib/utils/datetime"
import { TRPCClientError } from "@trpc/client";
import getStudentSchedule from "./_lib/utils/get-student-schedule";
import getTeacherSchedule from "./_lib/utils/get-teacher-schedule";
import updateSchedule from "./_lib/utils/update-schedule";
import getScheduleDifference from "./_lib/utils/get-schedule-difference";


export default createTRPCRouter({
    generate: protectedProcedure.input(
        z.object({
            groupId: z.string()
        })
    ).mutation(async ({ ctx, input }) => {
        if (!ctx.session?.user?.isAdmin) throw new TRPCClientError('Доступ запрещен')

        const group = await ctx.db.group.findFirst({
            where: {
                id: input.groupId
            }
        })
        if (!group) throw new Error('Не найден')

        await createScheduleForGroup()

        return true
    }),
    get: publicProcedure.input(z.object(
        {
            groupId: z.string().optional(),
            teacherId: z.string().optional(),
            weekStart: z.date()
        }
    )).query(async ({ input, ctx }) => {
        if (input.groupId) {
            return await getStudentSchedule(input.groupId, input.weekStart)
        }
        else if (input.teacherId) {
            return await getTeacherSchedule(input.teacherId, input.weekStart)
        }
        throw new TRPCClientError('Не указан ни groupId, ни teacherId')
    }),

    update: protectedProcedure.input(z.any()).mutation(async ({ ctx, input }) => {
        if (!ctx.session?.user?.isAdmin) throw new TRPCClientError('Доступ запрещен')
        return await updateSchedule(input)
    }),

    difference: publicProcedure.input(z.any()).mutation(async ({ ctx, input }) => {
        if (!ctx.session?.user?.isAdmin) throw new TRPCClientError('Доступ запрещен')
        const difference = await getScheduleDifference(input)
        return difference
    })
})