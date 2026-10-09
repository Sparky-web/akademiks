import ExcelJS from "exceljs";
import { DateTime } from "luxon";

export const URTK_ZONE = "Asia/Yekaterinburg";

const SLOTS = [
  "08:00–09:35",
  "09:45–11:20",
  "11:50–13:25",
  "13:35–15:10",
  "15:40–17:15",
  "17:25–19:00",
  "19:00–20:30",
];
const WEEKDAYS = [
  "ПОНЕДЕЛЬНИК",
  "ВТОРНИК",
  "СРЕДА",
  "ЧЕТВЕРГ",
  "ПЯТНИЦА",
  "СУББОТА",
  "ВОСКРЕСЕНЬЕ",
];

const FIRST_DATA_ROW = 6;
const FIRST_COLUMN = 5;
const LIGHT = "FFB7B7B7";
const DARK = "FF666666";
const TEXT = "FF191919";

export type ExportLesson = {
  start: Date;
  index: number;
  subgroup: number | null;
  title: string;
  group: string;
  teacher: string;
  classroom: string;
};

export type ExportKind = "groups" | "teachers";

type Cell = { title: string; classroom: string; caption: string };

/** Подгруппа пишется явно: по порядку в ячейке её не восстановить, а одиночная пара подгруппы иначе выглядит как пара всей группы. */
const withSubgroup = (text: string, subgroup: number | null) =>
  subgroup ? `${text} (${subgroup} подгр.)` : text;

const thin = (argb: string): Partial<ExcelJS.Border> => ({
  style: "thin",
  color: { argb },
});

/** Ячейки одной пары: подгруппы и разные занятия через пустую строку, как в таблицах колледжа, с номером подгруппы. */
function toCell(lessons: ExportLesson[], kind: ExportKind): Cell {
  const sorted = [...lessons].sort(
    (a, b) => (a.subgroup ?? 0) - (b.subgroup ?? 0),
  );

  if (kind === "groups") {
    return {
      title: sorted.map((l) => withSubgroup(l.title, l.subgroup)).join("\n\n"),
      classroom: sorted.map((l) => l.classroom).join("\n\n"),
      caption: sorted.map((l) => l.teacher).join("\n"),
    };
  }

  // У преподавателя поток из нескольких групп — одно занятие с перечнем групп.
  const streams = new Map<string, { lesson: ExportLesson; groups: string[] }>();
  for (const lesson of sorted) {
    const key = `${lesson.title}\u0000${lesson.classroom}`;
    const group = withSubgroup(lesson.group, lesson.subgroup);
    const stream = streams.get(key);
    if (stream) {
      if (!stream.groups.includes(group)) stream.groups.push(group);
    } else {
      streams.set(key, { lesson, groups: [group] });
    }
  }
  const items = [...streams.values()];
  return {
    title: items.map((s) => s.lesson.title).join("\n\n"),
    classroom: items.map((s) => s.lesson.classroom).join("\n\n"),
    caption: items.map((s) => sortNames(s.groups).join(", ")).join("\n"),
  };
}

function style(
  cell: ExcelJS.Cell,
  options: {
    bold?: boolean;
    size?: number;
    horizontal?: ExcelJS.Alignment["horizontal"];
    vertical?: ExcelJS.Alignment["vertical"];
    wrap?: boolean;
    border?: Partial<ExcelJS.Borders>;
  } = {},
) {
  cell.font = {
    name: "Arial",
    size: options.size ?? 10,
    bold: options.bold ?? false,
    color: { argb: TEXT },
  };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFFFFF" },
  };
  cell.alignment = {
    horizontal: options.horizontal ?? "center",
    vertical: options.vertical ?? "middle",
    wrapText: options.wrap ?? true,
  };
  if (options.border) cell.border = options.border;
}

/**
 * Лист одной недели в формате таблиц УРТК: строка на номер пары и строка на
 * преподавателя (или группы — в таблице преподавателей), по две колонки на столбец.
 */
export function addWeekSheet(
  workbook: ExcelJS.Workbook,
  options: {
    kind: ExportKind;
    week: DateTime;
    columns: string[];
    lessons: ExportLesson[];
  },
) {
  const { kind, columns } = options;
  const week = options.week.setZone(URTK_ZONE).startOf("week");
  const lessons = options.lessons.map((lesson) => ({
    lesson,
    start: DateTime.fromJSDate(lesson.start, { zone: URTK_ZONE }),
  }));

  const hasSunday = lessons.some(({ start }) => start.weekday === 7);
  const dayCount = hasSunday ? 7 : 6;
  // Строк пар столько, какая самая поздняя пара на неделе; пустая неделя — шесть пар.
  const lastIndex = Math.max(0, ...lessons.map(({ lesson }) => lesson.index));
  const slotCount = Math.min(lastIndex || 6, SLOTS.length);
  const lastDay = week.plus({ days: dayCount - 1 });
  const period = `${week.toFormat("dd.MM.yyyy")}–${lastDay.toFormat("dd.MM.yyyy")}`;

  const sheet = workbook.addWorksheet(
    `${week.toFormat("dd.MM.yyyy")} – ${lastDay.toFormat("dd.MM.yyyy")}`,
    {
      views: [{ state: "frozen", xSplit: 4, ySplit: 5, showGridLines: false }],
    },
  );

  const lastColumn = FIRST_COLUMN + columns.length * 2 - 1;
  sheet.getColumn(1).width = 7.13;
  sheet.getColumn(2).width = 9.13;
  sheet.getColumn(3).width = 6.13;
  sheet.getColumn(4).width = 14.13;
  for (let i = 0; i < columns.length; i++) {
    sheet.getColumn(FIRST_COLUMN + i * 2).width = 34.63;
    sheet.getColumn(FIRST_COLUMN + i * 2 + 1).width = 10.13;
  }

  const lastRow = FIRST_DATA_ROW + dayCount * slotCount * 2 - 1;
  for (let row = 1; row <= lastRow; row++) {
    sheet.getRow(row).height = 24;
    for (let column = 1; column <= Math.max(lastColumn, 4); column++) {
      style(sheet.getCell(row, column));
    }
  }

  // Заголовок
  const titleEnd = Math.max(
    Math.min(lastColumn, FIRST_COLUMN + 5),
    FIRST_COLUMN,
  );
  sheet.mergeCells(1, FIRST_COLUMN, 1, titleEnd);
  sheet.mergeCells(2, FIRST_COLUMN, 2, titleEnd);
  const title = sheet.getCell(1, FIRST_COLUMN);
  title.value =
    kind === "groups" ? "Расписание занятий" : "Расписание преподавателей";
  style(title, { bold: true, size: 15, horizontal: "left" });
  const subtitle = sheet.getCell(2, FIRST_COLUMN);
  subtitle.value = period;
  style(subtitle, { horizontal: "left" });

  const headerTop = { top: thin(DARK) };
  ["День недели", "Занятие", "Урок", "Время"].forEach((text, i) => {
    sheet.mergeCells(3, i + 1, 4, i + 1);
    const cell = sheet.getCell(3, i + 1);
    cell.value = text;
    style(cell, { border: { ...headerTop, right: thin(LIGHT) } });
  });

  const headerRow5 = { top: thin(DARK), bottom: thin(DARK) };
  for (const [column, text] of [
    [2, "№"],
    [3, "№"],
    [4, kind === "groups" ? "Группа:" : "Преподаватель:"],
  ] as const) {
    const cell = sheet.getCell(5, column);
    cell.value = text;
    style(cell, { bold: true, size: 11, border: headerRow5 });
  }
  style(sheet.getCell(5, 1), { border: headerRow5 });

  columns.forEach((name, i) => {
    const column = FIRST_COLUMN + i * 2;
    const sides = { left: thin(LIGHT), right: thin(LIGHT) };

    sheet.getCell(3, column).value = "Дисциплина";
    style(sheet.getCell(3, column), {
      border: { ...headerTop, left: thin(LIGHT) },
    });
    sheet.getCell(3, column + 1).value = "Ауд.";
    style(sheet.getCell(3, column + 1), {
      border: { ...headerTop, right: thin(LIGHT) },
    });

    sheet.mergeCells(4, column, 4, column + 1);
    sheet.getCell(4, column).value =
      kind === "groups" ? "Преподаватель" : "Группа";
    style(sheet.getCell(4, column), { border: sides });

    sheet.mergeCells(5, column, 5, column + 1);
    sheet.getCell(5, column).value = name;
    style(sheet.getCell(5, column), {
      bold: true,
      size: 11,
      border: { ...sides, ...headerRow5 },
    });
  });

  // Занятия по столбцам, дням и парам
  const byKey = new Map<string, ExportLesson[]>();
  for (const { lesson, start } of lessons) {
    const columnName = kind === "groups" ? lesson.group : lesson.teacher;
    const key = `${columnName}\u0000${start.weekday}\u0000${lesson.index}`;
    byKey.set(key, [...(byKey.get(key) ?? []), lesson]);
  }

  for (let day = 0; day < dayCount; day++) {
    const date = week.plus({ days: day });
    const dayRow = FIRST_DATA_ROW + day * slotCount * 2;
    const dayEnd = dayRow + slotCount * 2 - 1;

    sheet.mergeCells(dayRow, 1, dayEnd, 1);
    const dayCell = sheet.getCell(dayRow, 1);
    dayCell.value = `${date.toFormat("dd.MM.yyyy")}\n${WEEKDAYS[day]}`;
    style(dayCell, {
      bold: true,
      wrap: false,
      border: {
        left: thin(LIGHT),
        right: thin(LIGHT),
        top: thin(DARK),
        bottom: thin(DARK),
      },
    });

    for (let slot = 0; slot < slotCount; slot++) {
      const row = dayRow + slot * 2;
      const top = slot === 0 ? thin(DARK) : undefined;
      const bottom = row + 1 === lastRow ? thin(DARK) : thin(LIGHT);

      sheet.mergeCells(row, 2, row + 1, 2);
      sheet.getCell(row, 2).value = slot + 1;
      style(sheet.getCell(row, 2), {
        border: { right: thin(LIGHT), top, bottom },
      });
      sheet.getCell(row, 3).value = slot * 2 + 1;
      style(sheet.getCell(row, 3), { border: { top } });
      sheet.getCell(row + 1, 3).value = slot * 2 + 2;
      style(sheet.getCell(row + 1, 3), { border: { bottom } });
      sheet.mergeCells(row, 4, row + 1, 4);
      sheet.getCell(row, 4).value = SLOTS[slot];
      style(sheet.getCell(row, 4), { border: { top, bottom } });

      columns.forEach((name, i) => {
        const column = FIRST_COLUMN + i * 2;
        const items = byKey.get(`${name}\u0000${day + 1}\u0000${slot + 1}`);
        const cell = items ? toCell(items, kind) : undefined;

        const titleCell = sheet.getCell(row, column);
        titleCell.value = cell?.title || null;
        style(titleCell, {
          bold: true,
          horizontal: "left",
          vertical: "bottom",
          border: { left: thin(LIGHT), top },
        });
        const classroomCell = sheet.getCell(row, column + 1);
        classroomCell.value = cell?.classroom || null;
        style(classroomCell, {
          bold: true,
          vertical: "bottom",
          border: { right: thin(LIGHT), top },
        });

        sheet.mergeCells(row + 1, column, row + 1, column + 1);
        const captionCell = sheet.getCell(row + 1, column);
        captionCell.value = cell?.caption || null;
        style(captionCell, {
          horizontal: "left",
          vertical: "top",
          border: { left: thin(LIGHT), right: thin(LIGHT), bottom },
        });
      });
    }
  }

  return sheet;
}

/** Таблицы групп раскладываются по файлам по префиксу названия: «Ис-231» → «Ис». */
export function groupFileName(groupTitle: string) {
  return groupTitle.split("-")[0]?.trim() || groupTitle;
}

const collator = new Intl.Collator("ru", { numeric: true });
export const sortNames = (names: Iterable<string>) =>
  [...new Set(names)].sort(collator.compare);
