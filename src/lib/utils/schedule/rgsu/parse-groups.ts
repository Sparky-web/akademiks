import axios from "axios";
import { db } from "~/server/db";

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
  const groups = await db.group.findMany();
  let updated = 0;
  const errors: string[] = [];

  for (const group of groups) {
    try {
      const response = await axios.get<RGSUGroupsResponse>(
        `https://rgsu.net/students/schedule/?nc_ctpl=446&q=${encodeURIComponent(group.title)}`,
        {
          headers: {
            accept: "*/*",
            "accept-language": "en-US,en;q=0.9,ru-RU;q=0.8,ru;q=0.7",
            "sec-ch-ua":
              '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"macOS"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
          },
          timeout: 10000,
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
