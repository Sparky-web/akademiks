import axios from "axios";

interface RGSUGroupsResponse {
  query: string;
  suggestions: string[];
}

/**
 * Парсит все группы из RGSU API
 * @returns Promise<string[]> - массив строк с названиями всех групп
 */
export async function parseRgsuGroups(): Promise<string[]> {
  try {
    const response = await axios.post<RGSUGroupsResponse>(
      "https://rgsu.net/for-students/timetable/timetable/novyy-format-den-json.html?mode=group&filial=%D0%92%D0%A3%D0%97",
      "group=-", // Используем "-" для получения всех групп
      {
        headers: {
          accept: "text/plain, */*; q=0.01",
          "accept-language": "en-US,en;q=0.9,ru-RU;q=0.8,ru;q=0.7",
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          "sec-ch-ua":
            '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"macOS"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "x-requested-with": "XMLHttpRequest",
        },
        timeout: 10000,
      },
    );

    if (response.data && Array.isArray(response.data.suggestions)) {
      return response.data.suggestions;
    }

    throw new Error("Неверный формат ответа от API");
  } catch (error) {
    console.error("Ошибка при парсинге групп из RGSU:", error);

    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw new Error(
          `Ошибка сервера: ${error.response.status} ${error.response.statusText}`,
        );
      } else if (error.request) {
        throw new Error("Ошибка сети: не удалось получить ответ от сервера");
      }
    }

    throw new Error("Неизвестная ошибка при парсинге групп");
  }
}
