import { db } from "~/server/db";
import translit from "~/lib/utils/translit";
import { rgsuGetToken, type RgsuTokens } from "./get-token";
import { client } from "./axios-client";
import { RgsuBotBlockedError, isRgsuBotBlockedError } from "./errors";
import { ensureRgsuProxy, rotateRgsuProxyAfterBlock } from "./proxy-manager";
import { sendRgsuTelegramMessage } from "./telegram";
import {
  createGroupNotificationQueue,
  type NewRgsuGroup,
} from "./group-notifications";
import { withGroupUpdateLock } from "./group-update-lock";
import { RGSU_SCHEDULE_HEADERS } from "./request-headers";
import { parseGroupsFromTeachersSchedule } from "./parse-groups-from-teachers-schedule";

interface RGSUGroupData {
  id: string;
  name: string;
}

export interface DeletedRgsuGroupResult {
  usersDetached: number;
  lessonsDeleted: number;
  favouritesDeleted: number;
}

interface RGSUGroupsResponse {
  success: boolean;
  message?: string;
  data: RGSUGroupData[];
}

async function fetchRgsuGroupsByQueryWithTokens(
  query: string,
  tokens: RgsuTokens,
): Promise<RGSUGroupData[]> {
  const formData = new FormData();
  formData.append("csrf_token", tokens.csrfToken);
  formData.append("check_token", tokens.checkToken);

  const response = await client.post<RGSUGroupsResponse>(
    `https://rgsu.net/students/schedule/?nc_ctpl=446&q=${encodeURIComponent(query)}&filial=&token=undefined`,
    formData,
    {
      headers: {
        ...RGSU_SCHEDULE_HEADERS,
        "x-csrf-token": tokens.csrfToken,
        cookie: `session_captcha=${tokens.csrfToken};`,
      },
      timeout: 10000,
      withCredentials: true,
    },
  );

  if (response.data.success && Array.isArray(response.data.data)) {
    return response.data.data;
  }
  if (response.data.message?.includes("Возможно вы бот")) {
    throw new RgsuBotBlockedError();
  }
  throw new Error("РГСУ не вернул список групп");
}

async function fetchRgsuGroupsWithRecovery(
  query: string,
  tokens: RgsuTokens,
): Promise<{ data: RGSUGroupData[]; tokens: RgsuTokens }> {
  try {
    return {
      data: await fetchRgsuGroupsByQueryWithTokens(query, tokens),
      tokens,
    };
  } catch (error) {
    if (!isRgsuBotBlockedError(error)) throw error;

    await rotateRgsuProxyAfterBlock();
    const refreshedTokens = await rgsuGetToken();
    return {
      data: await fetchRgsuGroupsByQueryWithTokens(query, refreshedTokens),
      tokens: refreshedTokens,
    };
  }
}

/**
 * Запрос списка групп из RGSU API по строке поиска.
 * @returns массив пар id и name из ответа API
 */
export async function fetchRgsuGroupsByQuery(
  text: string,
): Promise<{ id: string; name: string }[]> {
  await ensureRgsuProxy();
  const tokens = await rgsuGetToken();
  return (await fetchRgsuGroupsWithRecovery(text, tokens)).data;
}

export function findExactRgsuGroup(
  groups: RGSUGroupData[],
  title: string,
): RGSUGroupData | undefined {
  return groups.find((item) => item.name === title);
}

export async function refreshRgsuGroupAdditionalId(group: {
  id: string;
  title: string;
}): Promise<string | null> {
  const matches = await fetchRgsuGroupsByQuery(group.title);
  const exactMatch = findExactRgsuGroup(matches, group.title);
  if (!exactMatch) return null;

  await db.group.update({
    where: { id: group.id },
    data: { additionalId: exactMatch.id },
  });

  return exactMatch.id;
}

export async function deleteMissingRgsuGroup(group: {
  id: string;
  title: string;
  additionalId: string;
}): Promise<DeletedRgsuGroupResult> {
  const result = await db.$transaction(async (tx) => {
    const users = await tx.user.updateMany({
      where: { groupId: group.id },
      data: { groupId: null },
    });
    const lessons = await tx.lesson.deleteMany({
      where: { groupId: group.id },
    });
    const favourites = await tx.favourite.deleteMany({
      where: { groupId: group.id },
    });
    await tx.group.delete({ where: { id: group.id } });

    return {
      usersDetached: users.count,
      lessonsDeleted: lessons.count,
      favouritesDeleted: favourites.count,
    };
  });

  await sendRgsuTelegramMessage(
    [
      "🗑 Академикс РГСУ: группа удалена.",
      `Группа: ${group.title}.`,
      `Старый GUID: ${group.additionalId}.`,
      "Причина: РГСУ не нашёл GUID. Поиск по названию тоже не нашёл группу.",
      `Отвязано пользователей: ${result.usersDetached}.`,
      `Удалено занятий: ${result.lessonsDeleted}.`,
      `Удалено избранных: ${result.favouritesDeleted}.`,
    ].join("\n"),
  );

  return result;
}

/** Базовое имя без суффикса -N / -NN (подгруппа), нап. ИСТ-Б-02-Д-2025-1 → ИСТ-Б-02-Д-2025 */
function stripTrailingSubgroupSuffix(title: string): string | null {
  const m = title.match(/^(.+)-(\d{1,2})$/);
  if (!m?.[1]) return null;
  return m[1];
}

/** Обновляет GUID и добавляет группы из поиска и расписаний преподавателей. */
export async function updateRgsuGroupIds(
  options: {
    dryRun?: boolean;
    addOnly?: boolean;
    teacherConcurrency?: number;
  } = {},
) {
  if (options.dryRun) return runGroupUpdate(options);
  return withGroupUpdateLock(() => runGroupUpdate(options));
}

async function runGroupUpdate(options: {
  dryRun?: boolean;
  addOnly?: boolean;
  teacherConcurrency?: number;
}) {
  const notifications = createGroupNotificationQueue();
  const flushNotifications = () =>
    notifications.flush(async (group) => {
      const saved = await db.group.findUnique({ where: { id: group.id } });
      return saved?.title === group.title;
    });
  if (!options.dryRun) await flushNotifications();
  await ensureRgsuProxy();
  let tokens = await rgsuGetToken();
  const groups = await db.group.findMany();
  const teachers = await db.teacher.findMany({ select: { name: true } });
  const knownTitles = new Set(groups.map((group) => group.title));
  const addedGroups: NewRgsuGroup[] = [];
  let updated = 0;
  const errors: string[] = [];
  const warnings: string[] = [];
  const cache = new Map<string, RGSUGroupData[]>();
  const lookup = async (query: string) => {
    const cached = cache.get(query);
    if (cached) return cached;
    const response = await fetchRgsuGroupsWithRecovery(query, tokens);
    tokens = response.tokens;
    cache.set(query, response.data);
    return response.data;
  };
  const addGroup = async (
    item: RGSUGroupData,
    source: NewRgsuGroup["source"],
  ) => {
    if (knownTitles.has(item.name)) return;
    if (!item.name?.trim() || !item.id?.trim()) {
      throw new Error("РГСУ вернул группу без названия или GUID");
    }
    const id = translit(item.name);
    const conflict =
      groups.find(
        (group) => group.id === id || group.additionalId === item.id,
      ) ??
      addedGroups.find(
        (group) => group.id === id || group.additionalId === item.id,
      );
    if (conflict)
      throw new Error(`Конфликт ID группы ${item.name} с ${conflict.title}`);
    const group: NewRgsuGroup = {
      id,
      title: item.name,
      additionalId: item.id,
      source,
    };
    if (!options.dryRun) {
      // Повторная проверка нужна, если группа появилась после начала обновления.
      const existing = await db.group.findFirst({
        where: {
          OR: [{ id }, { title: item.name }, { additionalId: item.id }],
        },
      });
      if (existing?.title === item.name) {
        knownTitles.add(item.name);
        return;
      }
      if (existing)
        throw new Error(`Конфликт ID группы ${item.name} с ${existing.title}`);
      // Сначала сохраняем очередь. При сбое INSERT неподтверждённая запись не отправится.
      await notifications.enqueue(group);
      await db.group.create({
        data: { id, title: item.name, additionalId: item.id },
      });
    }
    knownTitles.add(item.name);
    addedGroups.push(group);
    console.log(
      `${options.dryRun ? "Будет добавлена" : "Добавлена"} группа ${item.name}; источник: ${source}`,
    );
  };

  let teacherResult:
    | Awaited<ReturnType<typeof parseGroupsFromTeachersSchedule>>
    | undefined;
  try {
    for (const group of options.addOnly ? [] : groups) {
      try {
        const exact = findExactRgsuGroup(
          await lookup(group.title),
          group.title,
        );
        if (exact) {
          if (!options.dryRun) {
            await db.group.update({
              where: { id: group.id },
              data: { additionalId: exact.id },
            });
          }
          group.additionalId = exact.id;
          updated++;
        } else {
          warnings.push(`Точное совпадение не найдено: ${group.title}`);
        }
      } catch (error) {
        if (isRgsuBotBlockedError(error)) throw error;
        errors.push(
          `Группа ${group.title}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      if ((updated + errors.length + warnings.length) % 50 === 0) {
        console.log(
          `GUID групп: ${updated + errors.length + warnings.length}/${groups.length}`,
        );
      }
    }

    teacherResult = await parseGroupsFromTeachersSchedule(
      teachers,
      tokens,
      options.teacherConcurrency ?? 1,
    );
    tokens = teacherResult.tokens;
    errors.push(...teacherResult.errors);
    warnings.push(...teacherResult.warnings);
    for (const title of teacherResult.titles) {
      if (knownTitles.has(title)) continue;
      try {
        const exact = findExactRgsuGroup(await lookup(title), title);
        if (exact) await addGroup(exact, "teachers");
        else
          warnings.push(
            `Группа из расписания преподавателя не найдена в поиске: ${title}`,
          );
      } catch (error) {
        if (isRgsuBotBlockedError(error)) throw error;
        errors.push(
          `Новая группа ${title}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    const baseTitles = new Set(
      [...knownTitles]
        .map(stripTrailingSubgroupSuffix)
        .filter((title): title is string => Boolean(title)),
    );
    for (const baseTitle of baseTitles) {
      try {
        for (const item of await lookup(baseTitle))
          await addGroup(item, "family");
      } catch (error) {
        if (isRgsuBotBlockedError(error)) throw error;
        errors.push(
          `Поиск ${baseTitle}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  } finally {
    // Уведомляем о сохранённых группах даже при сбое следующего запроса РГСУ.
    if (!options.dryRun) await flushNotifications();
  }

  return {
    updated,
    created: addedGroups.length,
    total: groups.length,
    teachersChecked: teacherResult?.checked ?? 0,
    teachersTotal: teacherResult?.total ?? teachers.length,
    teachersNotFound: teacherResult?.warnings.length ?? 0,
    teacherGroupTitles: teacherResult?.titles.length ?? 0,
    addedGroups,
    errors,
    warnings,
    dryRun: Boolean(options.dryRun),
    addOnly: Boolean(options.addOnly),
  };
}

/**
 * Парсит все группы из RGSU API
 * @returns Promise<string[]> - массив строк с названиями всех групп
 */
export async function parseRgsuGroups(): Promise<
  { id: string; databaseId: string; title: string }[]
> {
  try {
    const groups = await db.group.findMany({
      where: { additionalId: { not: null } },
    });
    return groups
      .filter((group) => group.additionalId)
      .map((group) => ({
        id: group.additionalId!,
        databaseId: group.id,
        title: group.title,
      }));
  } catch (error) {
    console.error("Ошибка при парсинге групп из RGSU:", error);
    throw new Error("Неизвестная ошибка при парсинге групп");
  }
}
