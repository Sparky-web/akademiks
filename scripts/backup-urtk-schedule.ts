import { db } from "../src/server/db";
import { exportUrtkScheduleToDrive } from "../src/lib/utils/schedule/urtk/export-to-drive";
import { createDriveSpreadsheetStore } from "../src/lib/utils/schedule/urtk/google-drive";

try {
  if (process.env.NEXT_PUBLIC_UNIVERSITY === "RGSU") {
    throw new Error(
      "Бэкап расписания в Google-таблицы предназначен только для УРТК",
    );
  }
  const folderId = process.env.GOOGLE_BACKUP_FOLDER_ID;
  if (!folderId) throw new Error("Не задан GOOGLE_BACKUP_FOLDER_ID");

  const [groups, teachers, lessons] = await Promise.all([
    db.group.findMany({ select: { title: true } }),
    db.teacher.findMany({ select: { name: true } }),
    db.lesson.findMany({
      select: {
        start: true,
        index: true,
        subgroup: true,
        title: true,
        Group: { select: { title: true } },
        Teacher: { select: { name: true } },
        Classroom: { select: { name: true } },
      },
    }),
  ]);

  const result = await exportUrtkScheduleToDrive({
    store: createDriveSpreadsheetStore(),
    folderId,
    groups: groups.map((group) => group.title),
    teachers: teachers.map((teacher) => teacher.name),
    lessons: lessons
      .filter((lesson) => lesson.Group)
      .map((lesson) => ({
        start: lesson.start,
        index: lesson.index,
        subgroup: lesson.subgroup,
        title: lesson.title,
        group: lesson.Group!.title,
        teacher: lesson.Teacher?.name ?? "",
        classroom: lesson.Classroom?.name ?? "",
      })),
  });

  console.log(
    `Бэкап расписания, недели ${result.weeks.join(", ")}: создано ${result.created.length}, обновлено ${result.updated.length}, ошибок ${result.errors.length}`,
  );
  for (const error of result.errors) console.error(error);
  process.exitCode = result.errors.length ? 1 : 0;
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
