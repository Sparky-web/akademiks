import { DateTime } from "luxon";
import pMap from "p-map";
import { client } from "./axios-client";
import { rgsuGetToken, type RgsuTokens } from "./get-token";
import { RgsuBotBlockedError, isRgsuBotBlockedError } from "./errors";
import { rotateRgsuProxyAfterBlock } from "./proxy-manager";
import { RGSU_SCHEDULE_HEADERS } from "./request-headers";

export class RgsuTeacherNotFoundError extends Error {}

export function extractTeacherGroupTitles(response: unknown): string[] {
  if (!response || typeof response !== "object") {
    throw new Error("РГСУ вернул некорректный ответ преподавателя");
  }
  const data = response as {
    success?: boolean;
    message?: string;
    data?: { schedule?: unknown };
  };
  if (!data.success) {
    if (data.message?.includes("Возможно вы бот")) {
      throw new RgsuBotBlockedError();
    }
    if (data.message?.includes("Не удалось найти GUID преподавателя")) {
      throw new RgsuTeacherNotFoundError(data.message);
    }
    throw new Error(data.message || "РГСУ не вернул расписание преподавателя");
  }
  const schedule = data.data?.schedule;
  if (!schedule || typeof schedule !== "object") {
    throw new Error("В ответе преподавателя отсутствует schedule");
  }

  const titles = new Set<string>();
  const addTitle = (value: unknown) => {
    if (Array.isArray(value)) value.forEach(addTitle);
    else if (typeof value === "string" && value.trim())
      titles.add(value.trim());
  };
  const visitLesson = (lesson: unknown) => {
    if (Array.isArray(lesson)) lesson.forEach(visitLesson);
    else if (lesson && typeof lesson === "object" && "teacherName" in lesson) {
      // В расписании преподавателя teacherName содержит названия групп.
      addTitle(lesson.teacherName);
    }
  };
  for (const slot of Object.values(schedule)) {
    if (slot && typeof slot === "object")
      Object.values(slot).forEach(visitLesson);
  }
  return [...titles];
}

export async function fetchTeacherGroupTitles(
  teacherName: string,
  tokens: RgsuTokens,
  start = DateTime.now().setZone("Europe/Moscow").startOf("week"),
): Promise<string[]> {
  const params = new URLSearchParams({
    nc_ctpl: "846",
    date_from: start.toISODate()!,
    date_to: start.plus({ weeks: 4 }).minus({ days: 1 }).toISODate()!,
    teacher: teacherName,
    token: "no token",
  });
  const body = new FormData();
  body.append("csrf_token", tokens.csrfToken);
  body.append("check_token", tokens.checkToken);
  const response = await client.post<unknown>(
    `https://rgsu.net/students/schedule/?${params}`,
    body,
    {
      headers: {
        ...RGSU_SCHEDULE_HEADERS,
        "x-csrf-token": tokens.csrfToken,
        cookie: `session_captcha=${tokens.csrfToken};`,
      },
      timeout: 15000,
      withCredentials: true,
    },
  );
  return extractTeacherGroupTitles(response.data);
}

export async function parseGroupsFromTeachersSchedule(
  teachers: { name: string }[],
  initialTokens: RgsuTokens,
  concurrency = 1,
) {
  let tokens = initialTokens;
  const titles = new Set<string>();
  const errors: string[] = [];
  const warnings: string[] = [];
  let checked = 0;
  const names = [
    ...new Set(teachers.map((teacher) => teacher.name.trim()).filter(Boolean)),
  ];
  const start = DateTime.now().setZone("Europe/Moscow").startOf("week");

  await pMap(
    names,
    async (name) => {
      try {
        let groups: string[];
        try {
          groups = await fetchTeacherGroupTitles(name, tokens, start);
        } catch (error) {
          if (!isRgsuBotBlockedError(error)) throw error;
          await rotateRgsuProxyAfterBlock();
          tokens = await rgsuGetToken();
          groups = await fetchTeacherGroupTitles(name, tokens, start);
        }
        groups.forEach((title) => titles.add(title));
        checked++;
      } catch (error) {
        if (isRgsuBotBlockedError(error)) throw error;
        const message = error instanceof Error ? error.message : String(error);
        if (error instanceof RgsuTeacherNotFoundError) {
          warnings.push(`Преподаватель ${name}: ${message}`);
        } else {
          errors.push(`Преподаватель ${name}: ${message}`);
        }
      }
      if ((checked + errors.length + warnings.length) % 25 === 0) {
        console.log(
          `Преподаватели: ${checked + errors.length + warnings.length}/${names.length}, найдено групп: ${titles.size}`,
        );
      }
    },
    { concurrency },
  );
  return {
    titles: [...titles],
    checked,
    total: names.length,
    errors,
    warnings,
    tokens,
  };
}
