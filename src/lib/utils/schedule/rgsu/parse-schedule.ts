import axios from "axios";
import * as cheerio from "cheerio";
import { DateTime } from "luxon";
import config from "../config";
import { LessonParsed } from "../flatten-schedule";
import { RgsuTokens } from "./get-token";
import FormData from "form-data";
import { env } from "~/env";
// import { HttpsProxyAgent } from "https-proxy-agent";
// import { HttpProxyAgent } from "http-proxy-agent";

const rgsuTimetable = config.timetable;

// Интерфейсы для типизации
interface RGSULessonData {
  discipline: string;
  teacherName: string;
  type: string;
  address: string | false;
  auditorium: string;
  online: boolean;
}

interface RGSUWeeklySchedule {
  [timeSlot: string]: {
    [date: string]: RGSULessonData | RGSULessonData[];
  };
}

export interface RGSUResponse {
  success: boolean;
  data: {
    groupName: string;
    schedule: RGSUWeeklySchedule;
  };
}

/**
 * Определяет индекс пары по времени начала из конфига RGSU
 */
function getTimeSlotIndex(timeFrom: string): number {
  const slot = rgsuTimetable.find((slot) => slot.start === timeFrom);
  return slot ? slot.index : 0;
}

// Your configuration object
const proxyConfig = env.PROXY_PORT
  ? {
      host: env.PROXY_HOST,
      port: parseInt(env.PROXY_PORT),
      auth: {
        username: env.PROXY_USER,
        password: env.PROXY_PASS,
      },
    }
  : null;

// Generate proxy URL
// const proxyUrl = proxyConfig
//   ? `http://${proxyConfig.auth.username}:${proxyConfig.auth.password}@${proxyConfig.host}:${proxyConfig.port}`
//   : null;

// const client = axios.create(
//   proxyUrl
//     ? {
//         httpsAgent: new HttpsProxyAgent(proxyUrl),
//         httpAgent: new HttpProxyAgent(proxyUrl),
//         proxy: false,
//       }
//     : {},
// );

// Конфигурация для запросов
const TIMETABLE_URL = "https://rgsu.net/students/schedule/";

const HEADERS = {
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
};

/**
 * Получает ответ от RGSU API для недельного расписания группы
 */
async function getWeeklyResponse(
  groupId: string,
  dateFrom: string,
  dateTo: string,
  tokens: RgsuTokens,
): Promise<RGSUResponse> {
  try {
    const formData = new FormData();
    formData.append("csrf_token", tokens.csrfToken);
    formData.append("check_token", tokens.checkToken);

    const response = await axios.post<RGSUResponse>(
      `${TIMETABLE_URL}?nc_ctpl=846&date_from=${dateFrom}&date_to=${dateTo}&group=${groupId}&token=no+token`,
      formData,
      {
        headers: {
          ...HEADERS,
          "x-csrf-token": tokens.csrfToken,
          cookie: `session_captcha=${tokens.csrfToken};`,
        },
        // httpsAgent: new HttpsProxyAgent(proxyUrl),
        // httpAgent: new HttpProxyAgent(proxyUrl),
        withCredentials: true,
        timeout: 10000,
      },
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw new Error(
          `Ошибка сервера: ${error.response.status} ${error.response.statusText}`,
        );
      } else if (error.request) {
        throw new Error("Ошибка сети: не удалось получить ответ от сервера");
      }
    }
    throw new Error("Неизвестная ошибка при получении расписания");
  }
}

/**
 * Парсит данные недельного расписания из нового API и возвращает плоский массив уроков
 */
export function parseWeeklyTimetable(
  scheduleData: RGSUWeeklySchedule,
  groupTitle: string,
  isTeachersSchedule = false,
): LessonParsed[] {
  const lessons: LessonParsed[] = [];
  const allDates = new Set<string>();

  // Сначала собираем все даты из существующих слотов
  Object.values(scheduleData).forEach((dayData) => {
    Object.keys(dayData).forEach((date) => allDates.add(date));
  });

  // Добавляем недостающие временные слоты с пустыми массивами
  const completeScheduleData = { ...scheduleData };

  rgsuTimetable.forEach((timeSlot) => {
    const timeSlotKey = `${timeSlot.start}-${timeSlot.end}`;

    if (!completeScheduleData[timeSlotKey]) {
      completeScheduleData[timeSlotKey] = {};

      // Добавляем пустые массивы для всех дат
      Array.from(allDates).forEach((date) => {
        completeScheduleData[timeSlotKey]![date] = [];
      });
    } else {
      // Добавляем пустые массивы для дат, которых нет в этом слоте
      Array.from(allDates).forEach((date) => {
        if (!(date in completeScheduleData[timeSlotKey]!)) {
          completeScheduleData[timeSlotKey]![date] = [];
        }
      });
    }
  });

  // Проходим по каждому временному слоту
  Object.entries(completeScheduleData).forEach(([timeSlot, dayData]) => {
    // Извлекаем время начала и конца из строки типа "08:30-10:00"
    const [timeFrom, timeTo] = timeSlot.split("-");
    if (!timeFrom || !timeTo) return;

    // Определяем индекс пары
    const timeSlotIndex = getTimeSlotIndex(timeFrom);

    if (timeSlotIndex === 0) return; // Пропускаем неизвестные временные слоты

    // Проходим по каждому дню в этом временном слоте
    Object.entries(dayData).forEach(([dateString, lessonData]) => {
      const date = DateTime.fromISO(dateString);
      if (!date.isValid) return;

      // Парсим время
      const timeFromParts = timeFrom.split(":");
      const timeToParts = timeTo.split(":");

      let lessonsArray = Array.isArray(lessonData) ? lessonData : [lessonData];

      // Если занятие пустое (массив), пропускаем
      if (lessonsArray.length === 0) {
        lessons.push({
          index: timeSlotIndex,
          title: null,
          start: date
            .plus({
              hours: parseInt(timeFromParts[0]!),
              minutes: parseInt(timeFromParts[1]!),
            })
            .toJSDate(),
          end: date
            .plus({
              hours: parseInt(timeToParts[0]!),
              minutes: parseInt(timeToParts[1]!),
            })
            .toJSDate(),
          group: groupTitle,
          subgroup: null,
        });
        return;
      }

      lessonsArray.sort((a, b) => a.discipline.localeCompare(b.discipline));

      for (const lessonData of lessonsArray) {
        // Парсим данные занятия
        const { discipline, teacherName, type, address, auditorium, online } =
          lessonData;

        // Формируем classroom
        let classroom = "";
        if (online) {
          classroom = "Онлайн";
        } else if (auditorium) {
          classroom = auditorium;
        } else {
          classroom = "Не указан";
        }

        if (timeFromParts.length === 2 && timeToParts.length === 2) {
          lessons.push({
            index: timeSlotIndex,
            type: type,
            title: discipline,
            classroom,
            classroomAddress: typeof address === "string" ? address : "",
            teacher: teacherName
              ? teacherName?.replace(/[^a-zA-Zа-яА-ЯёЁ\s]/g, "") || "Не указан"
              : "Не указан",
            start: date
              .plus({
                hours: parseInt(timeFromParts[0]!),
                minutes: parseInt(timeFromParts[1]!),
              })
              .toJSDate(),
            end: date
              .plus({
                hours: parseInt(timeToParts[0]!),
                minutes: parseInt(timeToParts[1]!),
              })
              .toJSDate(),
            group: groupTitle,
            subgroup: null,
          });
        }
      }
    });
  });

  // Сортируем уроки по времени начала
  return lessons.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/**
 * Генерирует пустое расписание на неделю для всех временных слотов
 */
function generateEmptyWeekSchedule(
  weekStart: DateTime,
  groupTitle: string,
): LessonParsed[] {
  const lessons: LessonParsed[] = [];

  // Проходим по всем дням недели
  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const date = weekStart.plus({ days: dayIndex });

    // Проходим по всем временным слотам из конфига
    rgsuTimetable.forEach((timeSlot) => {
      const timeFromParts = timeSlot.start.split(":");
      const timeToParts = timeSlot.end.split(":");

      if (timeFromParts.length === 2 && timeToParts.length === 2) {
        lessons.push({
          index: timeSlot.index,
          title: null,
          start: date
            .plus({
              hours: parseInt(timeFromParts[0]!),
              minutes: parseInt(timeFromParts[1]!),
            })
            .toJSDate(),
          end: date
            .plus({
              hours: parseInt(timeToParts[0]!),
              minutes: parseInt(timeToParts[1]!),
            })
            .toJSDate(),
          group: groupTitle,
          subgroup: null,
        });
      }
    });
  }

  return lessons;
}

/**
 * Получает расписание на неделю для указанной группы в виде плоского массива
 */
export async function rgsuGetWeeklySchedule(
  groupId: string,
  groupTitle: string,
  weekStart: DateTime,
  tokens: RgsuTokens,
): Promise<LessonParsed[]> {
  try {
    // Определяем дату начала недели
    let startDate: DateTime;

    if (weekStart) {
      startDate = weekStart;
    } else {
      // Если дата не указана, используем начало текущей недели
      const today = DateTime.now();
      startDate = today.startOf("week");
    }

    const startDateString = startDate.toISODate() || "";
    const endDateString = startDate.plus({ days: 6 }).toISODate() || "";

    // Получаем недельное расписание одним запросом
    const data = await getWeeklyResponse(
      groupId,
      startDateString,
      endDateString,
      tokens,
    );

    if (!data.success) {
      throw new Error(JSON.stringify(data));
    }

    if (!data.success || !data.data.schedule) {
      // Если данные пустые, возвращаем пустой массив
      return [];
    }

    // Если расписание пустое, заполняем все слоты пустыми парами
    if (Object.keys(data.data.schedule).length === 0) {
      return generateEmptyWeekSchedule(startDate, groupTitle);
    }

    // Парсим данные недельного расписания
    return parseWeeklyTimetable(data.data.schedule, groupTitle);
  } catch (error) {
    console.error("Ошибка при получении недельного расписания:", error);
    throw error;
  }
}
