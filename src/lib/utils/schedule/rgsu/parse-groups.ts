import { db } from "~/server/db";
import translit from "~/lib/utils/translit";
import { rgsuGetToken, type RgsuTokens } from "./get-token";
import { client } from "./axios-client";
import { RgsuBotBlockedError, isRgsuBotBlockedError } from "./errors";
import { ensureRgsuProxy, rotateRgsuProxyAfterBlock } from "./proxy-manager";

interface RGSUGroupData {
  id: string;
  name: string;
}

interface RGSUGroupsResponse {
  success: boolean;
  message?: string;
  data: RGSUGroupData[];
}

const RGSU_SCHEDULE_HEADERS = {
  accept: "*/*",
  "accept-language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
  "cache-control": "no-cache",
  pragma: "no-cache",
  priority: "u=1, i",
  "sec-ch-ua-platform": '"macOS"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  "x-requested-with": "XMLHttpRequest",
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
  referer: "https://rgsu.net/students/schedule",
  "sec-ch-ua": `"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"`,
  "sec-ch-ua-mobile": "?0",
  origin: "https://rgsu.net",
} as const;

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

/** Базовое имя без суффикса -N / -NN (подгруппа), нап. ИСТ-Б-02-Д-2025-1 → ИСТ-Б-02-Д-2025 */
function stripTrailingSubgroupSuffix(title: string): string | null {
  const m = title.match(/^(.+)-(\d{1,2})$/);
  if (!m?.[1]) return null;
  return m[1];
}

/**
 * Обновляет additional_id для всех групп из RGSU API, затем подтягивает остальные группы
 * того же «семейства» (по ответу API) и добавляет отсутствующие в базе.
 */
export async function updateRgsuGroupIds(): Promise<{
  updated: number;
  created: number;
  total: number;
  errors: string[];
}> {
  await ensureRgsuProxy();
  let tokens = await rgsuGetToken();

  const groups = await db.group.findMany();
  let updated = 0;
  let created = 0;
  const errors: string[] = [];

  for (const group of groups) {
    try {
      const response = await fetchRgsuGroupsWithRecovery(group.title, tokens);
      const data = response.data;
      tokens = response.tokens;

      const exactMatch = data.find((item) => item.name === group.title);

      if (exactMatch) {
        await db.group.update({
          where: { id: group.id },
          data: { additionalId: exactMatch.id },
        });

        console.log(
          `Обновлен additional_id для группы ${group.title}: ${exactMatch.id}`,
        );
        updated++;
      } else {
        console.log(`Точное совпадение не найдено для группы: ${group.title}`);
        errors.push(`Точное совпадение не найдено для группы: ${group.title}`);
      }
    } catch (groupError) {
      if (isRgsuBotBlockedError(groupError)) throw groupError;
      console.error(`Ошибка при обновлении группы ${group.title}:`, groupError);
      errors.push(`Ошибка при обновлении группы ${group.title}: ${groupError}`);
    }
  }

  const groupsAfter = await db.group.findMany();
  const baseTitles = new Set<string>();
  for (const g of groupsAfter) {
    const base = stripTrailingSubgroupSuffix(g.title);
    if (base) baseTitles.add(base);
  }

  for (const baseTitle of baseTitles) {
    try {
      const response = await fetchRgsuGroupsWithRecovery(baseTitle, tokens);
      const data = response.data;
      tokens = response.tokens;

      if (data.length === 0) {
        errors.push(
          `В API нет групп для префикса (ожидались варианты вроде ${baseTitle}, ${baseTitle}-1): ${baseTitle}`,
        );
        continue;
      }

      for (const item of data) {
        const already = await db.group.findFirst({
          where: { title: item.name },
        });
        if (already) continue;

        await db.group.create({
          data: {
            id: translit(item.name),
            title: item.name,
            additionalId: item.id,
          },
        });
        created++;
        console.log(`Добавлена группа ${item.name}, additionalId: ${item.id}`);
      }
    } catch (e) {
      if (isRgsuBotBlockedError(e)) throw e;
      console.error(
        `Ошибка при досинхронизации групп по префиксу ${baseTitle}:`,
        e,
      );
      errors.push(
        `Ошибка при досинхронизации групп по префиксу ${baseTitle}: ${e}`,
      );
    }
  }

  return {
    updated,
    created,
    total: groups.length,
    errors,
  };
}

/**
 * Парсит все группы из RGSU API
 * @returns Promise<string[]> - массив строк с названиями всех групп
 */
export async function parseRgsuGroups(): Promise<
  { id: string; title: string }[]
> {
  try {
    const groups = await db.group.findMany({
      where: { additionalId: { not: null } },
    });
    return groups
      .filter((group) => group.additionalId)
      .map((group) => ({ id: group.additionalId!, title: group.title }));
  } catch (error) {
    console.error("Ошибка при парсинге групп из RGSU:", error);
    throw new Error("Неизвестная ошибка при парсинге групп");
  }
}
