import axios from "axios";
import * as cheerio from "cheerio";
import { DateTime } from "luxon";
import config from "../config";
import { LessonParsed } from "../flatten-schedule";

const rgsuTimetable = config.timetable;

// Интерфейсы для типизации
interface RGSUResponse {
  dateName: string;
  weekDay: string;
  weekName: string;
  year: number;
  html: string;
  status: string;
}

/**
 * Определяет индекс пары по времени начала из конфига RGSU
 */
function getTimeSlotIndex(timeFrom: string): number {
  const slot = rgsuTimetable.find((slot) => slot.start === timeFrom);
  return slot ? slot.index : 0;
}

// Конфигурация для запросов
const TIMETABLE_URL =
  "https://rgsu.net/for-students/timetable/timetable/novyy-format-json.html";

const HEADERS = {
  accept: "*/*",
  "accept-language": "en-US,en;q=0.9,ru-RU;q=0.8,ru;q=0.7",
  "sec-ch-ua":
    '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"macOS"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
};

/**
 * Получает ответ от RGSU API для недельного расписания группы
 */
async function getWeeklyResponse(
  group: string,
  date: string,
): Promise<RGSUResponse> {
  const parsedDate = DateTime.fromISO(date);
  const weekNumber = parsedDate.weekNumber;
  const month = parsedDate.month;
  const year = parsedDate.year;

  // Создаем FormData для multipart/form-data
  const formData = new FormData();
  formData.append("place", "first");
  formData.append("group", group);
  formData.append("mode", "week");
  formData.append("date", date);
  formData.append("week", weekNumber.toString());
  formData.append("month", month.toString());
  formData.append("year", year.toString());
  formData.append("isTeacher", "0");
  formData.append("userGuid", "null");

  try {
    const response = await axios.post<RGSUResponse>(
      `${TIMETABLE_URL}?filial=%D0%92%D0%A3%D0%97&isNaked=1`,
      formData,
      {
        headers: {
          ...HEADERS,
          "content-type": "multipart/form-data",
        },
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
 * Парсит HTML недельного расписания и возвращает плоский массив уроков
 */
function parseWeeklyTimetable(
  htmlContent: string,
  weekStartDate: string,
  groupTitle: string,
): LessonParsed[] {
  const $ = cheerio.load(htmlContent);
  const lessons: LessonParsed[] = [];
  const startDate = DateTime.fromISO(weekStartDate);

  // Парсим каждый временной слот
  $(".n-timetable-week__timeframe").each((_, timeframeElement) => {
    const $timeframe = $(timeframeElement);

    // Извлекаем время
    const timeFrom = $timeframe.find(".n-timetable-week__from").text().trim();
    const timeTo = $timeframe.find(".n-timetable-week__to").text().trim();

    // Определяем индекс пары
    const timeSlotIndex = getTimeSlotIndex(timeFrom);
    if (timeSlotIndex === 0) return; // Пропускаем неизвестные временные слоты

    // Парсим каждый день недели в этом временном слоте
    $timeframe.find(".n-timetable-week__day").each((_, dayElement) => {
      const $day = $(dayElement);
      const weekday = $day.attr("data-weekday");

      if (!weekday) return;

      // Вычисляем дату для этого дня недели
      const dayIndex = parseInt(weekday) - 1; // weekday начинается с 1
      const date = startDate.plus({ days: dayIndex });

      // Проверяем, есть ли занятия в этот день
      const noClassesElement = $day.find(".n-timetable-week__no-classes");
      if (noClassesElement.length > 0) {
        // Занятий нет - добавляем пустой урок
        const timeFromParts = timeFrom.split(":");
        const timeToParts = timeTo.split(":");

        if (timeFromParts.length === 2 && timeToParts.length === 2) {
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
        }
        return;
      }

      // Парсим карточки занятий
      $day.find(".n-timetable-week__card").each((_, cardElement) => {
        const $card = $(cardElement);

        const subject = $card.find(".n-timetable-card__title").text().trim();
        const category = $card
          .find(".n-timetable-card__category")
          .text()
          .trim();
        const teacher = $card
          .find(".n-timetable-card__affiliation")
          .text()
          .trim()
          .split("\n")?.[0]
          ?.trim();

        // Извлекаем информацию о местоположении
        const $geo = $card.find(".n-timetable-card__geo");
        let address =
          $geo.find(".n-timetable-card__address").text().trim() || "";
        const building =
          $geo.find(".n-timetable-card__affiliation").text().trim() || "";
        const auditorium =
          $card.find(".n-timetable-card__auditorium").text().trim() || "";

        if (address) {
          address = address.split("кор")?.[0] || "";
        }

        // Формируем classroom: building + auditorium
        let classroom = "";

        if (auditorium && building) {
          classroom = `${building} ${auditorium}`;
        } else if (auditorium) {
          classroom = auditorium;
        } else if (building) {
          classroom = building;
        } else if (address) {
          classroom = address;
        } else {
          classroom = "Не указан";
        }

        const timeFromParts = timeFrom.split(":");
        const timeToParts = timeTo.split(":");

        if (timeFromParts.length === 2 && timeToParts.length === 2) {
          lessons.push({
            index: timeSlotIndex,
            type: category,
            title: subject,
            classroom,
            classroomAddress: `${address}`,
            teacher: teacher || "Не указан",
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
    });
  });

  // Если уроков нет, создаем пустые уроки для всех временных слотов
  if (lessons.length === 0) {
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const date = startDate.plus({ days: dayIndex });

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
  }

  // Сортируем уроки по времени начала
  return lessons.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/**
 * Получает расписание на неделю для указанной группы в виде плоского массива
 */
export async function rgsuGetWeeklySchedule(
  groupTitle: string,
  weekStart?: DateTime,
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

    // Получаем недельное расписание одним запросом
    const data = await getWeeklyResponse(groupTitle, startDateString);

    if (!data.html) {
      // Если HTML пустой, возвращаем пустой массив
      return [];
    }

    // Парсим HTML недельного расписания
    return parseWeeklyTimetable(data.html, startDateString, groupTitle);
  } catch (error) {
    console.error("Ошибка при получении недельного расписания:", error);
    throw error;
  }
}
