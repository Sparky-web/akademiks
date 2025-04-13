import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "../../trpc";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import fs from "fs/promises";
import path from "path";

export const errorReportRouter = createTRPCRouter({
  submit: publicProcedure
    .input(
      z.object({
        description: z.string().min(3),
        screenshot: z
          .object({
            filename: z.string(),
            content: z.string(), // base64 encoded file content
          })
          .optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session?.user?.id;

      let filePath = "";
      if (input.screenshot) {
        const fileBuffer = Buffer.from(input.screenshot.content, "base64");
        const fileName = `${Date.now()}-${input.screenshot.filename}`;
        filePath = path.join(process.cwd(), "files", fileName);

        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, fileBuffer);
      }

      const errorReport = await db.errorReport.create({
        data: {
          message: input.description,
          filePath: filePath,
          userId: userId,
        },
      });

      return { success: true, errorReportId: errorReport.id };
    }),
  get: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
      }),
    )
    .query(async ({ input }) => {
      const { page, limit } = input;
      const skip = (page - 1) * limit;

      const [reports, total] = await Promise.all([
        db.errorReport.findMany({
          skip,
          take: limit,
          orderBy: { date: "desc" },
          include: {
            User: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        }),
        db.errorReport.count(),
      ]);

      return {
        reports,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      };
    }),
});
