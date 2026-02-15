import axios from "axios";
import { db } from "~/server/db";
import { rgsuGetToken } from "./get-token";

interface RGSUGroupData {
  id: string;
  name: string;
}

interface RGSUGroupsResponse {
  success: boolean;
  data: RGSUGroupData[];
}

/**
 * Обновляет additional_id для всех групп из RGSU API
 * @returns Promise<{ updated: number; total: number; errors: string[] }> - результат обновления
 */
export async function updateRgsuGroupIds(): Promise<{
  updated: number;
  total: number;
  errors: string[];
}> {
  const tokens = await rgsuGetToken();

  const groups = await db.group.findMany();
  let updated = 0;
  const errors: string[] = [];

  for (const group of groups) {
    const formData = new FormData();
    formData.append("csrf_token", tokens.csrfToken);
    formData.append("check_token", tokens.checkToken);

    try {
      const response = await axios.post<RGSUGroupsResponse>(
        `https://rgsu.net/students/schedule/?nc_ctpl=446&q=${encodeURIComponent(group.title)}&filial=&token=undefined`,
        formData,
        {
          headers: {
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
            "x-csrf-token": tokens.csrfToken,
            cookie: `session_captcha=${tokens.csrfToken};`,
          },
          timeout: 10000,
          withCredentials: true,
        },
      );

      if (response.data.success && Array.isArray(response.data.data)) {
        // Ищем точное совпадение по названию группы
        const exactMatch = response.data.data.find(
          (item) => item.name === group.title,
        );

        if (exactMatch) {
          // Обновляем additional_id в базе данных
          await db.group.update({
            where: { id: group.id },
            data: { additionalId: exactMatch.id },
          });

          console.log(
            `Обновлен additional_id для группы ${group.title}: ${exactMatch.id}`,
          );
          updated++;
        } else {
          console.log(
            `Точное совпадение не найдено для группы: ${group.title}`,
          );
          errors.push(
            `Точное совпадение не найдено для группы: ${group.title}`,
          );
        }
      }
    } catch (groupError) {
      console.error(`Ошибка при обновлении группы ${group.title}:`, groupError);
      errors.push(`Ошибка при обновлении группы ${group.title}: ${groupError}`);
    }
  }

  return {
    updated,
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
