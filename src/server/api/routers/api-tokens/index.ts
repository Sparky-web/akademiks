import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { issueToken } from "~/server/rest/token";

const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const user = await ctx.db.user.findUnique({
    where: { id: ctx.session.user.id },
    select: { isAdmin: true },
  });
  if (!user?.isAdmin) throw new TRPCError({ code: "FORBIDDEN" });
  return next();
});

export const apiTokensRouter = createTRPCRouter({
  list: adminProcedure.query(async ({ ctx }) => {
    const tokens = await ctx.db.apiToken.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        prefix: true,
        createdAt: true,
        revokedAt: true,
        lastUsedAt: true,
        requestCount: true,
      },
    });
    return tokens.map((token) => ({
      ...token,
      requestCount: token.requestCount.toString(),
    }));
  }),
  create: adminProcedure
    .input(z.object({ name: z.string().trim().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const { token, tokenHash, prefix } = issueToken();
      await ctx.db.apiToken.create({
        data: {
          name: input.name,
          tokenHash,
          prefix,
          createdById: ctx.session.user.id,
        },
      });
      return { token };
    }),
  revoke: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.apiToken.updateMany({
        where: { id: input.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return { success: true };
    }),
});
