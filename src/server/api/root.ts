import { postRouter } from "~/server/api/routers/post";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { authRouter } from "./routers/auth";
import groupsRouter from "./routers/groups";
import teachersRouter from "./routers/teachers";
import schedule from "./routers/schedule";
import { userRouter } from "./routers/lk/user";
import users from "./routers/users";
import reports from "./routers/reports";
import { errorReportRouter } from "./routers/errors";
import push from "./routers/push";
import handbooks from "./routers/handbooks";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  auth: authRouter,
  user: userRouter,
  groups: groupsRouter,
  reports,
  errors: errorReportRouter,
  teachers: teachersRouter,
  users: users,
  schedule,
  push,
  handbooks
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
