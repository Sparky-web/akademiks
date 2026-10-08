import type { ZodError } from "zod";

export class RestError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export function json(body: unknown, status = 200, headers?: HeadersInit) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...(status === 401 ? { "WWW-Authenticate": "Bearer" } : {}),
      ...headers,
    },
  });
}

export function errorResponse(error: RestError) {
  return json(
    {
      error: {
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
      },
    },
    error.status,
  );
}

export function zodDetails(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

const MAX_BODY_BYTES = 1024 * 1024;

export async function readJson(request: Request): Promise<unknown> {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES)
    throw new RestError(413, "PAYLOAD_TOO_LARGE", "Тело запроса больше 1 МБ");
  try {
    return JSON.parse(text);
  } catch {
    throw new RestError(400, "INVALID_JSON", "Тело запроса должно быть JSON");
  }
}

export function checkQuery(url: URL, allowed: string[]) {
  const extra = [...url.searchParams.keys()].filter(
    (key) => !allowed.includes(key),
  );
  if (extra.length)
    throw new RestError(
      400,
      "INVALID_QUERY",
      allowed.length
        ? `Допустимы параметры: ${allowed.join(", ")}`
        : "Параметры запроса не поддерживаются",
    );
}

export function readFlag(url: URL, key: string) {
  const value = url.searchParams.get(key);
  if (value === null || value === "false") return false;
  if (value === "true") return true;
  throw new RestError(400, "INVALID_QUERY", `${key}: true или false`);
}

export function readPagination(url: URL, max: number, fallback: number) {
  const limit = url.searchParams.get("limit") ?? String(fallback);
  const offset = url.searchParams.get("offset") ?? "0";
  if (
    !/^\d+$/.test(limit) ||
    !/^\d+$/.test(offset) ||
    +limit < 1 ||
    +limit > max ||
    !Number.isSafeInteger(+offset) ||
    +offset > 2147483647
  )
    throw new RestError(
      400,
      "INVALID_QUERY",
      `limit: 1–${max}, offset: 0–2147483647`,
    );
  return { limit: +limit, offset: +offset };
}
