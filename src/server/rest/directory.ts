import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "~/server/db";
import translit from "~/lib/utils/translit";
import { RestError, zodDetails } from "./http";

export type DirectoryResource = "teachers" | "groups";

const label = { teachers: "Преподаватель", groups: "Группа" } as const;
const nameField = { teachers: "name", groups: "title" } as const;

function parse<T extends z.ZodTypeAny>(schema: T, body: unknown): z.infer<T> {
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    throw new RestError(
      400,
      "INVALID_BODY",
      "Неверное тело запроса",
      zodDetails(parsed.error),
    );
  return parsed.data;
}

const name = z.string().trim().min(1).max(200);
const id = z
  .string()
  .regex(/^[A-Za-z0-9_.-]{1,100}$/, "ID: латиница, цифры, - _ .");

export async function createEntry(resource: DirectoryResource, body: unknown) {
  const field = nameField[resource];
  const data = parse(
    z.object({ [field]: name, id: id.optional() }).strict(),
    body,
  ) as { id?: string } & Record<string, string>;
  const value = data[field]!;
  // ID по умолчанию строится так же, как при добавлении из админки.
  const entryId = data.id ?? translit(value);
  if (!entryId)
    throw new RestError(
      400,
      "INVALID_BODY",
      "Не удалось построить ID, укажите id",
    );
  try {
    const entry =
      resource === "teachers"
        ? await db.teacher.create({
            data: { id: entryId, name: value },
            select: { id: true, name: true },
          })
        : await db.group.create({
            data: { id: entryId, title: value },
            select: { id: true, title: true },
          });
    return { data: entry };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      throw new RestError(
        409,
        "CONFLICT",
        `${label[resource]} с ID ${entryId} уже существует`,
      );
    throw error;
  }
}

export async function renameEntry(
  resource: DirectoryResource,
  entryId: string,
  body: unknown,
) {
  const field = nameField[resource];
  const data = parse(z.object({ [field]: name }).strict(), body) as Record<
    string,
    string
  >;
  const value = data[field]!;
  try {
    const entry =
      resource === "teachers"
        ? await db.teacher.update({
            where: { id: entryId },
            data: { name: value },
            select: { id: true, name: true },
          })
        : await db.group.update({
            where: { id: entryId },
            data: { title: value },
            select: { id: true, title: true },
          });
    return { data: entry };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    )
      throw new RestError(404, "NOT_FOUND", `${label[resource]} не найден(а)`);
    throw error;
  }
}

// Без force удаление разрешено, только если на запись не ссылаются пары и пользователи.
// С force: пары преподавателя остаются без преподавателя, пары группы удаляются.
export async function deleteEntry(
  resource: DirectoryResource,
  entryId: string,
  force: boolean,
) {
  const key = resource === "teachers" ? "teacherId" : "groupId";
  const exists =
    resource === "teachers"
      ? await db.teacher.findUnique({ where: { id: entryId } })
      : await db.group.findUnique({ where: { id: entryId } });
  if (!exists)
    throw new RestError(404, "NOT_FOUND", `${label[resource]} не найден(а)`);
  const [lessons, users] = await Promise.all([
    db.lesson.count({ where: { [key]: entryId } }),
    db.user.count({ where: { [key]: entryId } }),
  ]);
  if ((lessons || users) && !force)
    throw new RestError(
      409,
      "HAS_DEPENDENCIES",
      `${label[resource]} используется: пар ${lessons}, пользователей ${users}. ` +
        (resource === "teachers"
          ? "Повторите с ?force=true, чтобы снять преподавателя с пар."
          : "Повторите с ?force=true, чтобы удалить группу вместе с её парами."),
      { lessons, users },
    );
  await db.$transaction(async (tx) => {
    if (resource === "teachers")
      await tx.lesson.updateMany({
        where: { teacherId: entryId },
        data: { teacherId: null, meetingUrl: null },
      });
    else await tx.lesson.deleteMany({ where: { groupId: entryId } });
    await tx.user.updateMany({
      where: { [key]: entryId },
      data: { [key]: null },
    });
    await tx.favourite.deleteMany({ where: { [key]: entryId } });
    if (resource === "teachers")
      await tx.teacher.delete({ where: { id: entryId } });
    else await tx.group.delete({ where: { id: entryId } });
  });
  return {
    data: {
      id: entryId,
      deleted: true,
      lessonsAffected: lessons,
      usersAffected: users,
    },
  };
}
