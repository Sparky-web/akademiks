import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from "../../trpc"
import { TRPCError } from '@trpc/server'
import { db } from '~/server/db'

export default createTRPCRouter({
  get: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
        sortBy: z.enum(['id', 'startedAt', 'endedAt']).default('startedAt'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user?.isAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Доступ запрещен',
        })
      }
      const { page, limit, sortBy, sortOrder } = input
      const skip = (page - 1) * limit

      const reports = await db.report.findMany({
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
      })

      return reports.map(e => ({
        ...e,
        result: JSON.parse(e.result),
      }))
    })
})