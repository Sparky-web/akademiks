import { Prisma, User } from "@prisma/client";
import schedule from "~/server/api/routers/schedule";

export type Schedule = Awaited<ReturnType<typeof schedule.get>>;

export type Day = Schedule["data"][number];

export type Lesson = Prisma.LessonGetPayload<{
  include: {
    Classroom: true;
    Teacher: true;
    Group: true;
  };
}>;

export type Teacher = Pick<User, "id" | "name">;

export type Favourite = Prisma.FavouriteGetPayload<{
  include: {
    Group: true;
    Teacher: true;
    Classroom: true;
  };
}>;
