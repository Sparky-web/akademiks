import assert from "node:assert/strict";
import { test } from "node:test";
import ExcelJS from "exceljs";
import { DateTime } from "luxon";

import {
  buildWorkbook,
  exportUrtkScheduleToDrive,
  pickWeeks,
  planFiles,
} from "./export-to-drive";
import type { ExportLesson } from "./export-workbook";
import type { SpreadsheetStore } from "./google-drive";

const zone = "Asia/Yekaterinburg";
const at = (iso: string) => DateTime.fromISO(iso, { zone }).toJSDate();
const lesson = (overrides: Partial<ExportLesson>): ExportLesson => ({
  start: at("2026-10-06T08:00"),
  index: 1,
  subgroup: null,
  title: "Физика",
  group: "Ис-231",
  teacher: "Иванов И.И.",
  classroom: "101",
  ...overrides,
});

test("файлы групп по префиксу и общий файл преподавателей", () => {
  const files = planFiles(
    ["Ис-232", "Рм-112", "Ис-231", "Ис-329-330"],
    ["Петров П.П.", "Иванов И.И."],
  );
  assert.deepEqual(
    files.map((f) => [f.name, f.columns]),
    [
      ["Ис", ["Ис-231", "Ис-232", "Ис-329-330"]],
      ["Рм", ["Рм-112"]],
      ["Преподаватели", ["Иванов И.И.", "Петров П.П."]],
    ],
  );
});

test("выгружаются текущая и следующие недели с занятиями", () => {
  const now = DateTime.fromISO("2026-10-09T12:00", { zone });
  const weeks = (lessons: ExportLesson[]) =>
    pickWeeks(lessons, now).map((w) => w.toISODate());

  assert.deepEqual(
    weeks([
      lesson({ start: at("2026-09-29T08:00") }),
      lesson({ start: at("2026-10-06T08:00") }),
      lesson({ start: at("2026-10-20T08:00") }),
    ]),
    ["2026-10-05", "2026-10-19"],
  );
  assert.deepEqual(weeks([lesson({ start: at("2026-10-13T08:00") })]), [
    "2026-10-05",
    "2026-10-12",
  ]);
  assert.deepEqual(weeks([lesson({ start: at("2026-09-22T08:00") })]), [
    "2026-09-21",
  ]);
});

async function readSheet(xlsx: Buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(xlsx as unknown as ArrayBuffer);
  return workbook.worksheets[0]!;
}

test("в воскресенье выгружается следующая неделя", () => {
  const sunday = DateTime.fromISO("2026-10-11T00:15", { zone });
  const weeks = (lessons: ExportLesson[]) =>
    pickWeeks(lessons, sunday).map((w) => w.toISODate());
  const thisWeek = lesson({ start: at("2026-10-06T08:00") });

  assert.deepEqual(
    weeks([thisWeek, lesson({ start: at("2026-10-13T08:00") })]),
    ["2026-10-12"],
  );
  // Расписание на следующую неделю ещё не загружено — остаётся уходящая неделя.
  assert.deepEqual(weeks([thisWeek]), ["2026-10-05"]);
});

test("подгруппы группы и поток у преподавателя", async () => {
  const week = DateTime.fromISO("2026-10-05", { zone });
  const lessons = [
    lesson({
      subgroup: 2,
      title: "Информатика",
      classroom: "Дистант",
      teacher: "Петров П.П.",
    }),
    lesson({ subgroup: 1 }),
    lesson({ group: "Ис-232" }),
  ];

  const groups = await readSheet(
    await buildWorkbook(
      { name: "Ис", kind: "groups", columns: ["Ис-231", "Ис-232"] },
      [week],
      lessons,
    ),
  );
  assert.equal(groups.name, "05.10.2026 – 10.10.2026");
  assert.equal(groups.getCell("D5").value, "Группа:");
  assert.equal(groups.getCell("E5").value, "Ис-231");
  // Вторник, первая пара: строки 8 и 9 (понедельник — строки 6 и 7)
  assert.equal(groups.getCell("A8").value, "06.10.2026\nВТОРНИК");
  assert.equal(groups.getCell("E8").value, "Физика\n\nИнформатика");
  assert.equal(groups.getCell("F8").value, "101\n\nДистант");
  assert.equal(groups.getCell("E9").value, "Иванов И.И.\nПетров П.П.");
  assert.equal(groups.getCell("G8").value, "Физика");

  const teachers = await readSheet(
    await buildWorkbook(
      { name: "Преподаватели", kind: "teachers", columns: ["Иванов И.И."] },
      [week],
      lessons,
    ),
  );
  assert.equal(teachers.getCell("E1").value, "Расписание преподавателей");
  assert.equal(teachers.getCell("D5").value, "Преподаватель:");
  assert.equal(teachers.getCell("E4").value, "Группа");
  assert.equal(teachers.getCell("E8").value, "Физика");
  assert.equal(teachers.getCell("E9").value, "Ис-231, Ис-232");
});

test("создаёт новые таблицы и перезаписывает существующие", async () => {
  const calls: string[] = [];
  const store: SpreadsheetStore = {
    list: async () => new Map([["Ис", "file-is"]]),
    create: async (name) => {
      calls.push(`create ${name}`);
      if (name === "Рм") throw new Error("квота");
      return "new";
    },
    update: async (fileId) => {
      calls.push(`update ${fileId}`);
    },
  };

  const result = await exportUrtkScheduleToDrive({
    store,
    folderId: "folder",
    groups: ["Ис-231", "Рм-112"],
    teachers: ["Иванов И.И."],
    lessons: [lesson({})],
    now: DateTime.fromISO("2026-10-09T12:00", { zone }),
  });

  assert.deepEqual(calls, [
    "update file-is",
    "create Рм",
    "create Преподаватели",
  ]);
  assert.deepEqual(result.updated, ["Ис"]);
  assert.deepEqual(result.created, ["Преподаватели"]);
  assert.deepEqual(result.errors, ["Рм: квота"]);
});
