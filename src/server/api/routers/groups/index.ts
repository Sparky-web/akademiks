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
});
