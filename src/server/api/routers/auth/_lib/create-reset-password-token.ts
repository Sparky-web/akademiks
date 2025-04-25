import { z } from "~/lib/utils/zod-russian";
import crypto from "crypto";
import { protectedProcedure } from "~/server/api/trpc";

export const createResetPasswordTokenProcedure = protectedProcedure
  .input(
    z.object({
      email: z.string().email(),
    }),
  )
  .mutation(async ({ ctx: { db, session }, input }) => {
    if (!session.user.isAdmin) {
      throw new Error("Not authorized");
    }

    const user = await db.user.findUnique({
      where: {
        email: input.email,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const token = crypto.randomBytes(32).toString("hex");

    await db.user.update({
      where: {
        id: user.id,
      },
      data: {
        resetPasswordToken: token,
      },
    });

    return {
      token,
    };
  });
