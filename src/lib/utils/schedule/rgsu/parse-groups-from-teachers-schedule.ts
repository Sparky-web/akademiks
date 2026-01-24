import axios from "axios";
import { DateTime } from "luxon";
import { db } from "~/server/db";
import { parseWeeklyTimetable } from "./parse-schedule";

export const parseGroupsFromTeachersSchedule = async () => {
  const teachers = await db.teacher.findMany();

  const groups = new Set();

  for (const teacher of teachers) {
    try {
      const data = await getWeeklyResponse(
        teacher.name,
        DateTime.now().startOf("week").toSQLDate(),
        DateTime.now().endOf("week").toSQLDate(),
      );

      if (!data.success) {
        console.warn(`Не удалось запросить преподаватлея ${teacher.name}`);
        continue;
      }

      const lessons = Object.values(data.data.schedule).flatMap((slot) =>
        Object.values(slot),
      );

      const addGroupToSet = (group: string[] | string) => {
        if (Array.isArray(group))
          group.forEach((group) => addGroupToSet(group));
        else groups.add(group);
      };

      lessons.forEach((lesson) => {
        if (Array.isArray(lesson)) {
          lesson.forEach((lesson) => addGroupToSet(lesson.teacherName));
          return;
        }

        addGroupToSet(lesson.teacherName);
      });

      console.log(teacher.name, groups);
    } catch (e) {
      console.warn(
        "Произошла ошибка при обновлении групп из расписания преподавателей: " +
          e,
      );
    }

    await new Promise((r) => setTimeout(r, 10000));
  }

  return [...groups];
};

// Интерфейсы для типизации
interface RGSULessonData {
  discipline: string;
  teacherName: string | string[];
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

// Конфигурация для запросов
const TIMETABLE_URL = "https://rgsu.net/students/schedule/";

const HEADERS = {
  accept: "*/*",
  "accept-language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
  "cache-control": "no-cache",
  pragma: "no-cache",
  "sec-ch-ua":
    '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"macOS"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  referrer:
    "https://rgsu.net/students/schedule/?period=week&dateStart=2026-01-12&dateEnd=2026-01-17&teacher=%D0%98%D0%B1%D1%80%D0%B0%D0%B3%D0%B8%D0%BC%D0%BE%D0%B2+%D0%9E%D0%B4%D0%BB%D0%B0%D1%80+%D0%9C%D0%B5%D1%85%D0%BC%D0%B0%D0%BD+%D0%9E%D0%B3%D0%BB%D1%8B",
};

async function getWeeklyResponse(
  teacherName: string,
  dateFrom: string,
  dateTo: string,
): Promise<RGSUResponse> {
  try {
    const response = await axios.get<RGSUResponse>(
      `${TIMETABLE_URL}?nc_ctpl=827&date_from=${dateFrom}&date_to=${dateTo}&teacher=${teacherName}`,
      {
        headers: HEADERS,
        timeout: 10000,
      },
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw new Error(
          `Ошибка сервера для ${teacherName}: ${error.response.status} ${error.response.statusText}`,
        );
      } else if (error.request) {
        throw new Error(
          `${teacherName} Ошибка сети: не удалось получить ответ от сервера`,
        );
      }
    }
    throw new Error("Неизвестная ошибка при получении расписания");
  }
}
