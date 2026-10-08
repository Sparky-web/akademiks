import { db } from "~/server/db";
import DateTime from "~/lib/utils/datetime";
import type { ApiClient } from "./auth";
import { checkQuery, readFlag, readPagination, RestError } from "./http";

export const lessonSelect = {
  id: true,
  title: true,
  start: true,
  end: true,
  index: true,
  subgroup: true,
  type: true,
  meetingUrl: true,
  shouldDisplayForStudents: true,
  Teacher: { select: { id: true, name: true } },
  Group: { select: { id: true, title: true } },
  Classroom: { select: { id: true, name: true, address: true } },
} as const;

type Related = {
  Teacher: { id: string; name: string } | null;
  Group: { id: string; title: string } | null;
  Classroom: { id: number; name: string; address: string | null } | null;
};

export function presentLesson<T extends Related>({
  Teacher,
  Group,
  Classroom,
  ...lesson
}: T) {
  return { ...lesson, teacher: Teacher, group: Group, classroom: Classroom };
}

export function me(client: ApiClient) {
  return {
    data: {
      name: client.name,
      scopes: ["read", ...client.scopes],
      timezone: DateTime.now().zoneName,
    },
  };
}

export async function listEntities(resource: "groups" | "teachers", url: URL) {
  checkQuery(url, ["limit", "offset"]);
  const { limit, offset } = readPagination(url, 500, 100);
  const args = { take: limit, skip: offset, orderBy: { id: "asc" as const } };
  const [data, total] =
    resource === "groups"
      ? await db.$transaction([
          db.group.findMany({ ...args, select: { id: true, title: true } }),
          db.group.count(),
        ])
      : await db.$transaction([
          db.teacher.findMany({ ...args, select: { id: true, name: true } }),
          db.teacher.count(),
        ]);
  return { data, pagination: { limit, offset, total } };
}

export async function listClassrooms(url: URL) {
  checkQuery(url, []);
  const data = await db.classroom.findMany({
    orderBy: [{ name: "asc" }, { id: "asc" }],
    select: { id: true, name: true, address: true, isHidden: true },
  });
  return { data };
}

export async function entitySchedule(
  resource: "groups" | "teachers",
  id: string,
  url: URL,
) {
  checkQuery(url, ["weekStart"]);
  const value = url.searchParams.get("weekStart");
  const start =
    value === null
      ? DateTime.now().startOf("week")
      : readDate(value, "weekStart");
  const entity =
    resource === "groups"
      ? await db.group.findUnique({
          where: { id },
          select: { id: true, title: true },
        })
      : await db.teacher.findUnique({
          where: { id },
          select: { id: true, name: true },
        });
  if (!entity)
    throw new RestError(
      404,
      "NOT_FOUND",
      "Группа или преподаватель не найдены",
    );
  const end = start.plus({ weeks: 1 });
  const lessons = await db.lesson.findMany({
    where: {
      ...(resource === "groups" ? { groupId: id } : { teacherId: id }),
      shouldDisplayForStudents: true,
      start: { gte: start.toJSDate(), lt: end.toJSDate() },
    },
    orderBy: [{ start: "asc" }, { id: "asc" }],
    select: lessonSelect,
  });
  return {
    // Публичное расписание содержит только видимые пары, флаг видимости не нужен.
    data: lessons.map(({ shouldDisplayForStudents: _, ...lesson }) =>
      presentLesson(lesson),
    ),
    entity,
    period: {
      start: start.toISO(),
      end: end.toISO(),
      timezone: start.zoneName,
    },
  };
}

const MAX_LESSON_RANGE_DAYS = 31;

// Поиск пар за период с фильтрами — основа массовых изменений.
export async function listLessons(client: ApiClient, url: URL) {
  checkQuery(url, [
    "from",
    "to",
    "groupId",
    "teacherId",
    "classroomId",
    "index",
    "includeHidden",
    "limit",
    "offset",
  ]);
  const fromValue = url.searchParams.get("from");
  if (fromValue === null)
    throw new RestError(400, "INVALID_QUERY", "Укажите from=YYYY-MM-DD");
  const from = readDate(fromValue, "from");
  const toValue = url.searchParams.get("to");
  const to = toValue === null ? from : readDate(toValue, "to");
  const end = to.plus({ days: 1 });
  if (to < from || end.diff(from, "days").days > MAX_LESSON_RANGE_DAYS)
    throw new RestError(
      400,
      "INVALID_QUERY",
      `to не раньше from, период не длиннее ${MAX_LESSON_RANGE_DAYS} дней`,
    );
  const includeHidden = readFlag(url, "includeHidden");
  if (includeHidden && !client.scopes.includes("schedule:write"))
    throw new RestError(
      403,
      "FORBIDDEN",
      "Скрытые пары доступны только токену с правом schedule:write",
    );
  const classroomId = readInt(url, "classroomId");
  const index = readInt(url, "index");
  const { limit, offset } = readPagination(url, 1000, 500);
  const where = {
    start: { gte: from.toJSDate(), lt: end.toJSDate() },
    ...(includeHidden ? {} : { shouldDisplayForStudents: true }),
    ...(url.searchParams.has("groupId")
      ? { groupId: url.searchParams.get("groupId")! }
      : {}),
    ...(url.searchParams.has("teacherId")
      ? { teacherId: url.searchParams.get("teacherId")! }
      : {}),
    ...(classroomId === undefined ? {} : { classroomId }),
    ...(index === undefined ? {} : { index }),
  };
  const [lessons, total] = await db.$transaction([
    db.lesson.findMany({
      where,
      orderBy: [{ start: "asc" }, { id: "asc" }],
      take: limit,
      skip: offset,
      select: lessonSelect,
    }),
    db.lesson.count({ where }),
  ]);
  return {
    data: lessons.map(presentLesson),
    pagination: { limit, offset, total },
    period: {
      start: from.toISO(),
      end: end.toISO(),
      timezone: from.zoneName,
    },
  };
}

export async function getLesson(client: ApiClient, id: number) {
  const lesson = await db.lesson.findUnique({
    where: { id },
    select: lessonSelect,
  });
  if (
    !lesson ||
    (!lesson.shouldDisplayForStudents &&
      !client.scopes.includes("schedule:write"))
  )
    throw new RestError(404, "NOT_FOUND", "Пара не найдена");
  return { data: presentLesson(lesson) };
}

function readDate(value: string, key: string) {
  const date = DateTime.fromISO(value).startOf("day");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !date.isValid)
    throw new RestError(
      400,
      "INVALID_QUERY",
      `${key} должен быть датой YYYY-MM-DD`,
    );
  return date;
}

function readInt(url: URL, key: string) {
  const value = url.searchParams.get(key);
  if (value === null) return undefined;
  if (!/^\d{1,9}$/.test(value))
    throw new RestError(
      400,
      "INVALID_QUERY",
      `${key} должен быть целым числом`,
    );
  return +value;
}
