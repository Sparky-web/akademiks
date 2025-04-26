import translit from "~/lib/utils/translit";
import { createTRPCRouter, publicProcedure } from "../../trpc";
import { z } from "~/lib/utils/zod-russian";

export default createTRPCRouter({
  get: publicProcedure.query(({ ctx }) => {
    return ctx.db.teacher.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });
  }),
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.isAdmin) {
        throw new Error("Not authorized");
      }
      await ctx.db.teacher.delete({
        where: {
          id: input.id,
        },
      });
    }),
  add: publicProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.isAdmin) {
        throw new Error("Not authorized");
      }
      const teacher = await ctx.db.teacher.create({
        data: {
          id: translit(input.name),
          name: input.name,
        },
      });
      return teacher;
    }),
});
