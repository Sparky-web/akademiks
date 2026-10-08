import type { z } from "zod";
import { authenticate, requireScope, type ApiClient } from "~/server/rest/auth";
import {
  checkQuery,
  errorResponse,
  json,
  readFlag,
  readJson,
  RestError,
  zodDetails,
} from "~/server/rest/http";
import {
  entitySchedule,
  getLesson,
  listClassrooms,
  listEntities,
  listLessons,
  me,
} from "~/server/rest/read";
import {
  applyOperations,
  createLessonData,
  parseBatch,
  updateLessonData,
} from "~/server/rest/lessons";
import {
  createEntry,
  deleteEntry,
  renameEntry,
  type DirectoryResource,
} from "~/server/rest/directory";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Method = "GET" | "POST" | "PATCH" | "DELETE";
type Context = { params: Promise<{ path: string[] }> };
type Handler = (
  client: ApiClient,
  request: Request,
  url: URL,
) => Promise<unknown> | unknown;

// Сопоставляет путь с обработчиками по методам. null — маршрута нет.
function route(path: string[]): Partial<Record<Method, Handler>> | null {
  const [resource, id, action, ...rest] = path;
  if (rest.length) return null;
  if (resource === "me" && path.length === 1) return { GET: (c) => me(c) };
  if (resource === "classrooms" && path.length === 1)
    return { GET: (_, __, url) => listClassrooms(url) };

  if (resource === "groups" || resource === "teachers") {
    const scope = resource === "groups" ? "groups:write" : "teachers:write";
    if (path.length === 1)
      return {
        GET: (_, __, url) => listEntities(resource, url),
        POST: async (client, request, url) => {
          requireScope(client, scope);
          checkQuery(url, []);
          return json(
            await createEntry(resource, await readJson(request)),
            201,
          );
        },
      };
    if (path.length === 2) return directoryItem(resource, scope, id!);
    if (path.length === 3 && action === "schedule")
      return { GET: (_, __, url) => entitySchedule(resource, id!, url) };
    return null;
  }

  if (resource === "lessons") {
    if (path.length === 1)
      return {
        GET: (client, _, url) => listLessons(client, url),
        POST: async (client, request, url) => {
          requireScope(client, "schedule:write");
          checkQuery(url, ["dryRun", "notify"]);
          const data = parseData(createLessonData, await readJson(request));
          const result = await applyOperations(
            client,
            [{ op: "create", data }],
            flags(url),
          );
          return result.applied ? json(result, 201) : result;
        },
      };
    if (path.length === 2 && id === "batch")
      return {
        POST: async (client, request, url) => {
          requireScope(client, "schedule:write");
          checkQuery(url, []);
          const { operations, ...options } = parseBatch(
            await readJson(request),
          );
          return applyOperations(client, operations, options);
        },
      };
    if (path.length === 2) {
      const lessonId = /^\d{1,9}$/.test(id!) ? +id! : null;
      if (!lessonId) return null;
      return {
        GET: (client, _, url) => {
          checkQuery(url, []);
          return getLesson(client, lessonId);
        },
        PATCH: async (client, request, url) => {
          requireScope(client, "schedule:write");
          checkQuery(url, ["dryRun", "notify"]);
          const data = parseData(updateLessonData, await readJson(request));
          return applyOperations(
            client,
            [{ op: "update", id: lessonId, data }],
            flags(url),
          );
        },
        DELETE: async (client, _, url) => {
          requireScope(client, "schedule:write");
          checkQuery(url, ["dryRun", "notify"]);
          return applyOperations(
            client,
            [{ op: "delete", id: lessonId }],
            flags(url),
          );
        },
      };
    }
  }
  return null;
}

function directoryItem(
  resource: DirectoryResource,
  scope: "groups:write" | "teachers:write",
  id: string,
): Partial<Record<Method, Handler>> {
  return {
    PATCH: async (client, request, url) => {
      requireScope(client, scope);
      checkQuery(url, []);
      return renameEntry(resource, id, await readJson(request));
    },
    DELETE: (client, _, url) => {
      requireScope(client, scope);
      checkQuery(url, ["force"]);
      return deleteEntry(resource, id, readFlag(url, "force"));
    },
  };
}

function flags(url: URL) {
  return { dryRun: readFlag(url, "dryRun"), notify: readFlag(url, "notify") };
}

function parseData<T extends z.ZodTypeAny>(
  schema: T,
  body: unknown,
): z.infer<T> {
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    throw new RestError(
      400,
      "INVALID_BODY",
      "Неверные поля пары",
      zodDetails(parsed.error),
    );
  return parsed.data;
}

function handle(method: Method) {
  return async (request: Request, context: Context) => {
    try {
      // Сначала авторизация: без действующего токена маршруты не раскрываются.
      const client = await authenticate(request);
      const { path } = await context.params;
      const handlers = route(path);
      if (!handlers) throw new RestError(404, "NOT_FOUND", "Маршрут не найден");
      const handler = handlers[method];
      if (!handler)
        return json(
          {
            error: {
              code: "METHOD_NOT_ALLOWED",
              message: `Метод ${method} не поддерживается для этого маршрута`,
            },
          },
          405,
          { Allow: Object.keys(handlers).join(", ") },
        );
      const result = await handler(client, request, new URL(request.url));
      return result instanceof Response ? result : json(result);
    } catch (error) {
      if (error instanceof RestError) return errorResponse(error);
      console.error("REST API error", error);
      return errorResponse(
        new RestError(500, "INTERNAL_ERROR", "Не удалось обработать запрос"),
      );
    }
  };
}

export const GET = handle("GET");
export const POST = handle("POST");
export const PATCH = handle("PATCH");
export const DELETE = handle("DELETE");

export function HEAD() {
  return new Response(null, {
    status: 405,
    headers: { Allow: "GET, POST, PATCH, DELETE", "Cache-Control": "no-store" },
  });
}
