import ExcelJS from "exceljs";
import { DateTime } from "luxon";

import {
  addWeekSheet,
  groupFileName,
  sortNames,
  URTK_ZONE,
  type ExportKind,
  type ExportLesson,
} from "./export-workbook";
import type { SpreadsheetStore } from "./google-drive";

export const TEACHERS_FILE = "Преподаватели";

export type ExportFile = {
  name: string;
  kind: ExportKind;
  columns: string[];
};

export type ExportResult = {
  weeks: string[];
  created: string[];
  updated: string[];
  errors: string[];
};

/**
 * Недели выгрузки: текущая и все следующие, где есть занятия.
 * В воскресенье текущей считается следующая неделя.
 * Если впереди занятий нет, берётся последняя неделя с занятиями.
 */
export function pickWeeks(lessons: ExportLesson[], now: DateTime): DateTime[] {
  const local = now.setZone(URTK_ZONE);
  const current = (
    local.weekday === 7 ? local.plus({ days: 1 }) : local
  ).startOf("week");
  const weeks = new Map<number, DateTime>();
  for (const lesson of lessons) {
    const week = DateTime.fromJSDate(lesson.start, { zone: URTK_ZONE }).startOf(
      "week",
    );
    weeks.set(week.toMillis(), week);
  }
  const all = [...weeks.values()].sort((a, b) => a.toMillis() - b.toMillis());
  const upcoming = all.filter((week) => week >= current);
  if (upcoming.length) {
    return upcoming[0]! > current ? [current, ...upcoming] : upcoming;
  }
  return all.length ? [all.at(-1)!] : [current];
}

/** Файлы по префиксам групп и общий файл преподавателей. */
export function planFiles(groups: string[], teachers: string[]): ExportFile[] {
  const byPrefix = new Map<string, string[]>();
  for (const group of groups) {
    const name = groupFileName(group);
    byPrefix.set(name, [...(byPrefix.get(name) ?? []), group]);
  }
  return [
    ...sortNames(byPrefix.keys()).map((name) => ({
      name,
      kind: "groups" as const,
      columns: sortNames(byPrefix.get(name)!),
    })),
    { name: TEACHERS_FILE, kind: "teachers", columns: sortNames(teachers) },
  ];
}

export async function buildWorkbook(
  file: ExportFile,
  weeks: DateTime[],
  lessons: ExportLesson[],
): Promise<Buffer> {
  const columns = new Set(file.columns);
  const own = lessons.filter((lesson) =>
    columns.has(file.kind === "groups" ? lesson.group : lesson.teacher),
  );
  const workbook = new ExcelJS.Workbook();
  for (const week of weeks) {
    const end = week.plus({ weeks: 1 });
    addWeekSheet(workbook, {
      kind: file.kind,
      week,
      columns: file.columns,
      lessons: own.filter((lesson) => {
        const start = DateTime.fromJSDate(lesson.start);
        return start >= week && start < end;
      }),
    });
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

/**
 * Выгружает расписание УРТК из базы в Google-таблицы папки бэкапа.
 * Таблица с тем же названием перезаписывается, история остаётся в версиях Google Таблиц.
 */
export async function exportUrtkScheduleToDrive(options: {
  store: SpreadsheetStore;
  folderId: string;
  groups: string[];
  teachers: string[];
  lessons: ExportLesson[];
  now?: DateTime;
}): Promise<ExportResult> {
  const { store, folderId, lessons } = options;
  const weeks = pickWeeks(lessons, options.now ?? DateTime.now());
  const result: ExportResult = {
    weeks: weeks.map((week) => week.toFormat("dd.MM.yyyy")),
    created: [],
    updated: [],
    errors: [],
  };

  const existing = await store.list(folderId);
  for (const file of planFiles(options.groups, options.teachers)) {
    try {
      const xlsx = await buildWorkbook(file, weeks, lessons);
      const fileId = existing.get(file.name);
      if (fileId) {
        await store.update(fileId, xlsx);
        result.updated.push(file.name);
      } else {
        await store.create(file.name, folderId, xlsx);
        result.created.push(file.name);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(`${file.name}: ${message}`);
    }
  }
  return result;
}
