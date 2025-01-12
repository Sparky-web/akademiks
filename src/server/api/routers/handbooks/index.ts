import { z } from "~/lib/utils/zod-russian";
import { createTRPCRouter, protectedProcedure } from "../../trpc";

export default createTRPCRouter({
    getUniqueLessonTitles: protectedProcedure
        .input(z.object({
            teacherId: z.string().optional(),
            groupId: z.string().optional(),
        }))
        .query(async ({ ctx, input }) => {
            if (!ctx.session?.user?.isAdmin) throw new Error('Доступ запрещен')

            let targetLessons = [];
            let targetTitle;

            if (input.teacherId) {
                targetLessons = await ctx.db.$queryRaw`SELECT title, count(*) as c
                FROM Lesson
                WHERE TeacherId = ${input.teacherId} 
                GROUP BY title
                ORDER BY 
                    c DESC;`

                targetTitle = `Предметы преподавателя ${(await ctx.db.teacher.findUnique({
                    where: {
                        id: input.teacherId
                    },
                    select: {
                        name: true
                    }
                }))?.name || ''}`
            }

            else if (input.groupId) {
                targetLessons = await ctx.db.$queryRaw`SELECT title, count(*) as c
                FROM Lesson
                WHERE GroupId = ${input.groupId} 
                GROUP BY title
                ORDER BY 
                    c DESC;`

                targetTitle = `Предметы группы ${(await ctx.db.group.findUnique({
                    where: {
                        id: input.groupId
                    },
                    select: {
                        title: true
                    }
                }))?.title || ''}`
            }

            let allLessons = await ctx.db.$queryRaw`SELECT title, count(*) as c
                FROM Lesson
                GROUP BY title
                ORDER BY 
                    c DESC;`

            
            allLessons = allLessons.filter(e => !targetLessons?.find(e2 => e2.title === e.title))

            return [
                ...(targetLessons?.length ? [{
                    label: targetTitle,
                    values: targetLessons.map(e => ({
                        label: e.title,
                        value: e.title
                    }))
                }] : []),
                {
                    label: 'Все предметы',
                    values: allLessons.map(e => ({
                        label: e.title,
                        value: e.title
                    }))
                }
            ]
        })
});
