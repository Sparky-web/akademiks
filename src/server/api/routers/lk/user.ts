import { TRPCError } from "@trpc/server";
import { z } from "~/lib/utils/zod-russian";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const userRouter = createTRPCRouter({
  changeGroup: protectedProcedure
    .input(z.object({ groupId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.update({
        where: {
          id: ctx.session.user.id,
        },
        data: {
          groupId: input.groupId,
        },
      });
      return user;
    }),

  addFavourite: protectedProcedure
    .input(
      z.object({
        type: z.enum(["student", "teacher", "classroom"]),
        groupId: z.string().optional(),
        teacherId: z.string().optional(),
        classroomId: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!input.groupId && !input.teacherId)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Не указан ни groupId, ни teacherId",
        });

      const favourite = await ctx.db.favourite.create({
        data: {
          userId: ctx.session.user.id,
          type: input.type,
          groupId: input.type === "student" ? input.groupId : undefined,
          teacherId: input.type === "teacher" ? input.teacherId : undefined,
          classroomId:
            input.type === "classroom" ? input.classroomId : undefined,
        },
        include: {
          Group: true,
          Teacher: true,
          Classroom: true,
        },
      });

      return favourite;
    }),
  removeFavourite: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.favourite.delete({
        where: {
          id: input.id,
        },
      });

      return;
    }),

  update: protectedProcedure
    .input(
      z.object({
        role: z.number().min(1).max(2),
        groupId: z.string().optional().nullable(),
        teacherId: z.string().optional().nullable(),
        email: z.string().email(),
        name: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.db.user.update({
        where: {
          id: ctx.session.user.id,
        },
        data: {
          role: input.role,
          groupId: input.role === 1 ? input.groupId : null,
          teacherId: input.role === 2 ? input.teacherId : null,
          email: input.email,
          name: input.name,
        },
        include: {
          Group: true,
          Favourites: {
            include: {
              Group: true,
              Teacher: true,
            },
          },
          Teacher: true,
        },
      });

      if (!data)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Не удалось обновить данные",
        });

      //@ts-ignore
      delete data.password;

      return data;
    }),
});
