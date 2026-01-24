import { z } from "~/lib/utils/zod-russian";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "../../trpc";
import translit from "~/lib/utils/translit";

export default createTRPCRouter({
  get: publicProcedure.query(({ ctx }) => {
    return ctx.db.group.findMany({
      orderBy: {
        title: "asc",
      },
    });
  }),
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.isAdmin) {
        throw new Error("Not authorized");
      }
      await ctx.db.group.delete({
        where: {
          id: input.id,
        },
      });
    }),
  add: protectedProcedure
    .input(
      z.object({
        title: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.isAdmin) {
        throw new Error("Not authorized");
      }
      const group = await ctx.db.group.create({
        data: {
          id: translit(input.title),
          title: input.title,
        },
      });
      return group;
    }),

  updateFromTable: protectedProcedure
    .input(
      z.object({
        groups: z.array(
          z.object({
            title: z.string(),
            id: z.string(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.isAdmin) {
        throw new Error("Not authorized");
      }

      for (const group of input.groups) {
        const foundGroup = await ctx.db.group.findFirst({
          where: {
            id: translit(group.title),
          },
        });

        if (!foundGroup) {
          console.log("Добавление" + group.title, group.id);
          await ctx.db.group.create({
            data: {
              title: group.title,
              id: translit(group.title),
              additionalId: group.id,
            },
          });

          continue;
        }

        if (foundGroup.additionalId !== group.id) {
          console.log("Обновление: " + group.title, group.id);
          await ctx.db.group.update({
            where: {
              id: foundGroup.id,
            },
            data: {
              additionalId: group.id,
            },
          });
        }
      }
    }),
});
