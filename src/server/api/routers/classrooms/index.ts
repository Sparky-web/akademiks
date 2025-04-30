import { emit } from "process";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "../../trpc";
import { z } from "~/lib/utils/zod-russian";
import translit from "~/lib/utils/translit";

export const classroomsRouter = createTRPCRouter({
  get: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.classroom.findMany({
      orderBy: {
        name: "asc",
      },
      where: {
        isHidden: ctx.session?.user?.isAdmin ? undefined : false,
      },
    });
  }),
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.classroom.findUnique({
        where: {
          id: input.id,
        },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        isHidden: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.isAdmin) {
        throw new Error("Not authorized");
      }
      const classroom = await ctx.db.classroom.create({
        data: {
          name: input.name,
          isHidden: input.isHidden,
        },
      });
      return classroom;
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.isAdmin) {
        throw new Error("Not authorized");
      }
      await ctx.db.classroom.delete({
        where: {
          id: input.id,
        },
      });
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          name: z.string(),
          isHidden: z.boolean(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.isAdmin) {
        throw new Error("Not authorized");
      }
      await ctx.db.classroom.update({
        where: {
          id: input.id,
        },
        data: {
          name: input.data.name,
          isHidden: input.data.isHidden,
        },
      });
    }),
});
