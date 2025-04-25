import { z } from "~/lib/utils/zod-russian";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

import bcrypt from "bcrypt";
import createUser from "./_lib/register-user";
import { createResetPasswordTokenProcedure } from "./_lib/create-reset-password-token";

export const authRouter = createTRPCRouter({
  register: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(8),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await createUser(input.name, input.email, input.password);
      return user;
    }),
  createResetPasswordToken: createResetPasswordTokenProcedure,
  getResetPasswordData: publicProcedure
    .input(
      z.object({
        token: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: {
          resetPasswordToken: input.token,
        },
      });

      if (!user) {
        throw new Error("Invalid token");
      }

      return {
        email: user.email,
        name: user.name,
      };
    }),
  resetPassword: protectedProcedure
    .input(
      z.object({
        token: z.string(),
        password: z.string().min(8),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.user.update({
        where: {
          resetPasswordToken: input.token,
        },
        data: {
          password: await bcrypt.hash(input.password, 10),
          resetPasswordToken: null,
        },
      });
    }),
});
