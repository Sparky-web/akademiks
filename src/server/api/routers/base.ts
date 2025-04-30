import { z } from "~/lib/utils/zod-russian";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

export const baseRouter = createTRPCRouter({
  get: publicProcedure.query(({ ctx }) => {
    return [] as any[];
  }),
  getById: publicProcedure
    .input(z.object({ id: z.string().or(z.number()) }))
    .query(({ ctx, input }) => {
      return {} as any;
    }),
  create: protectedProcedure.input(z.any()).mutation(({ ctx, input }) => {
    return true as boolean;
  }),
  update: protectedProcedure
    .input(z.object({ id: z.string().or(z.number()), data: z.any() }))
    .mutation(({ ctx, input }) => {
      return true as boolean;
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.string().or(z.number()) }))
    .mutation(({ ctx, input }) => {
      return true as boolean;
    }),
});
