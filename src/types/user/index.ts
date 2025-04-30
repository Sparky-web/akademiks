import { Prisma } from "@prisma/client";

export type User = Omit<
  Prisma.UserGetPayload<{
    include: {
      Group: true;
      Favourites: {
        include: {
          Group: true;
          Teacher: true;
          Classroom: true;
        };
      };
    };
  }>,
  "password"
>;
