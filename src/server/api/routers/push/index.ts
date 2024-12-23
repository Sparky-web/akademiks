import { z } from "~/lib/utils/zod-russian";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { unsubscribe } from "diagnostics_channel";
import sendNotification from "./send-notification";

export default createTRPCRouter({
    subscribe: protectedProcedure.input(z.object({
        endpoint: z.string(),
        keys: z.string()
    })).mutation(async ({ ctx, input }) => {
        await ctx.db.pushSubscription.create({
            data: {
                endpoint: input.endpoint,
                keys: input.keys,
                userId: ctx.session.user.id
            }
        })

        return 'ok'
    }),
    unsubscribe: protectedProcedure.mutation(async ({ ctx }) => {
        const subscription = await ctx.db.pushSubscription.findFirst({
            where: {
                userId: ctx.session.user.id
            }
        })

        if (!subscription) throw new Error('Не найдена подписка на push')

        await ctx.db.pushSubscription.delete({
            where: {
                id: subscription.id
            }
        })

        return 'ok'
    }),
    test: protectedProcedure.mutation(async ({ ctx }) => {
        const subscription = await ctx.db.pushSubscription.findFirst({
            where: {
                userId: ctx.session.user.id
            }
        })

        if (!subscription) throw new Error('Не найдена подписка на push')

        await sendNotification(subscription.userId, 'Тестовое уведомление', 'Тестовое уведомление')

        return 'ok'
    }),
})