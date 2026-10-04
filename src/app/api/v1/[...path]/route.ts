import { db } from "~/server/db";
import DateTime from "~/lib/utils/datetime";
import { hashToken, readBearer } from "~/server/rest/token";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...(status === 401 ? { "WWW-Authenticate": "Bearer" } : {}),
    },
  });
}
function error(status: number, code: string, message: string) {
  return json({ error: { code, message } }, status);
}

export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    const token = readBearer(request.headers.get("authorization"));
    if (!token) return error(401, "UNAUTHORIZED", "Требуется Bearer-токен");
    // Одна атомарная операция проверяет отзыв и считает запрос без потери параллельных обращений.
    const accepted = await db.apiToken.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { requestCount: { increment: 1 }, lastUsedAt: new Date() },
    });
    if (!accepted.count)
      return error(401, "UNAUTHORIZED", "Токен недействителен или отозван");
    const { path } = await context.params;
    const [resource, id, action] = path;
    if (resource !== "groups" && resource !== "teachers")
      return error(404, "NOT_FOUND", "Маршрут не найден");
    const url = new URL(request.url);
    if (path.length === 1) {
      if (
        [...url.searchParams.keys()].some(
          (key) => key !== "limit" && key !== "offset",
        )
      )
        return error(400, "INVALID_QUERY", "Допустимы limit и offset");
      const limit = url.searchParams.get("limit") ?? "100";
      const offset = url.searchParams.get("offset") ?? "0";
      if (
        !/^\d+$/.test(limit) ||
        !/^\d+$/.test(offset) ||
        +limit < 1 ||
        +limit > 500 ||
        !Number.isSafeInteger(+offset) ||
        +offset > 2147483647
      )
        return error(
          400,
          "INVALID_QUERY",
          "limit: 1–500, offset: 0–2147483647",
        );
      const args = {
        take: +limit,
        skip: +offset,
        orderBy: { id: "asc" as const },
      };
      const [data, total] =
        resource === "groups"
          ? await db.$transaction([
              db.group.findMany({ ...args, select: { id: true, title: true } }),
              db.group.count(),
            ])
          : await db.$transaction([
              db.teacher.findMany({
                ...args,
                select: { id: true, name: true },
              }),
              db.teacher.count(),
            ]);
      return json({
        data,
        pagination: { limit: +limit, offset: +offset, total },
      });
    }
    if (path.length !== 3 || !id || action !== "schedule")
      return error(404, "NOT_FOUND", "Маршрут не найден");
    if ([...url.searchParams.keys()].some((key) => key !== "weekStart"))
      return error(400, "INVALID_QUERY", "Допустим weekStart");
    const value = url.searchParams.get("weekStart");
    const start =
      value === null
        ? DateTime.now().startOf("week")
        : DateTime.fromISO(value).startOf("day");
    if (
      (value !== null && !/^\d{4}-\d{2}-\d{2}$/.test(value)) ||
      !start.isValid
    )
      return error(
        400,
        "INVALID_QUERY",
        "weekStart должен быть датой YYYY-MM-DD",
      );
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
      return error(404, "NOT_FOUND", "Группа или преподаватель не найдены");
    const end = start.plus({ weeks: 1 });
    const lessons = await db.lesson.findMany({
      where: {
        ...(resource === "groups" ? { groupId: id } : { teacherId: id }),
        shouldDisplayForStudents: true,
        start: { gte: start.toJSDate(), lt: end.toJSDate() },
      },
      orderBy: [{ start: "asc" }, { id: "asc" }],
      select: {
        id: true,
        title: true,
        start: true,
        end: true,
        index: true,
        subgroup: true,
        type: true,
        meetingUrl: true,
        Teacher: { select: { id: true, name: true } },
        Group: { select: { id: true, title: true } },
        Classroom: { select: { id: true, name: true, address: true } },
      },
    });
    return json({
      data: lessons.map(({ Teacher, Group, Classroom, ...lesson }) => ({
        ...lesson,
        teacher: Teacher,
        group: Group,
        classroom: Classroom,
      })),
      entity,
      period: {
        start: start.toISO(),
        end: end.toISO(),
        timezone: start.zoneName,
      },
    });
  } catch {
    return error(500, "INTERNAL_ERROR", "Не удалось обработать запрос");
  }
}

export function HEAD() {
  return new Response(null, {
    status: 405,
    headers: { Allow: "GET", "Cache-Control": "no-store" },
  });
}
