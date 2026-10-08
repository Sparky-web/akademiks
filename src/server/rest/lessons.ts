import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "~/server/db";
import DateTime from "~/lib/utils/datetime";
import { isDistantClassroom } from "~/lib/utils/distant-classroom";
import notifyFromReports from "~/server/api/routers/schedule/_lib/utils/notify-from-reports";
import generateReport from "~/server/api/routers/schedule/_lib/utils/generate-report";
import type {
  ResultItem,
  UpdateReport,
} from "~/server/api/routers/schedule/_lib/utils/update-schedule";
import type { NotificationResultItem } from "~/server/api/routers/schedule/_lib/utils/notify";
import type { ApiClient } from "./auth";
import { RestError, zodDetails } from "./http";
import { lessonSelect } from "./read";

export const MAX_OPERATIONS = 500;

const dateTime = z
  .string()
  .refine(
    (value) =>
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value) &&
      DateTime.fromISO(value).isValid,
    "Ожидается дата и время ISO 8601, например 2026-10-12T08:30:00+05:00",
  )
  .transform((value) => DateTime.fromISO(value).toJSDate());

const fields = {
  title: z.string().trim().min(1).max(300),
  start: dateTime,
  end: dateTime,
  index: z.number().int().min(0).max(20),
  subgroup: z.number().int().min(1).max(10).nullable(),
  type: z.string().trim().max(100).nullable(),
  teacherId: z.string().min(1).nullable(),
  groupId: z.string().min(1),
  classroomId: z.number().int().nullable(),
  shouldDisplayForStudents: z.boolean(),
};

export const createLessonData = z
  .object(fields)
  .partial({
    subgroup: true,
    type: true,
    teacherId: true,
    classroomId: true,
    shouldDisplayForStudents: true,
  })
  .strict();

export const updateLessonData = z
  .object(fields)
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, "Нет полей для изменения");

const lessonId = z.number().int().positive();

export const operationSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("create"), data: createLessonData }).strict(),
  z
    .object({ op: z.literal("update"), id: lessonId, data: updateLessonData })
    .strict(),
  z.object({ op: z.literal("delete"), id: lessonId }).strict(),
]);

export const batchSchema = z
  .object({
    operations: z.array(operationSchema).min(1).max(MAX_OPERATIONS),
    dryRun: z.boolean().optional(),
    notify: z.boolean().optional(),
  })
  .strict();

export type Operation = z.infer<typeof operationSchema>;

type Teacher = { id: string; name: string };
type Group = { id: string; title: string };
type Classroom = { id: number; name: string; address: string | null };

interface State {
  title: string;
  start: Date;
  end: Date;
  index: number;
  subgroup: number | null;
  type: string | null;
  meetingUrl: string | null;
  shouldDisplayForStudents: boolean;
  teacherId: string | null;
  groupId: string | null;
  classroomId: number | null;
}

interface Plan {
  index: number;
  op: Operation["op"];
  id?: number;
  before?: State;
  after?: State;
  changed: boolean;
}

export function parseBatch(body: unknown) {
  const parsed = batchSchema.safeParse(body);
  if (!parsed.success)
    throw new RestError(
      400,
      "INVALID_BODY",
      "Неверный формат операций",
      zodDetails(parsed.error),
    );
  return parsed.data;
}

// Проверяет все операции до записи, затем применяет их одной транзакцией:
// либо изменения применяются целиком, либо база остаётся прежней.
export async function applyOperations(
  client: ApiClient,
  operations: Operation[],
  options: { dryRun?: boolean; notify?: boolean },
) {
  const ids = operations.flatMap((op) => (op.op === "create" ? [] : [op.id]));
  const errors: { index: number; message: string }[] = [];
  const seen = new Set<number>();
  operations.forEach((op, index) => {
    if (op.op === "create") return;
    if (seen.has(op.id))
      errors.push({ index, message: `Пара ${op.id} встречается повторно` });
    seen.add(op.id);
  });

  const existing = await db.lesson.findMany({
    where: { id: { in: ids } },
    select: {
      ...lessonSelect,
      teacherId: true,
      groupId: true,
      classroomId: true,
    },
  });
  const lessons = new Map(existing.map((lesson) => [lesson.id, lesson]));

  const teacherIds = new Set<string>();
  const groupIds = new Set<string>();
  const classroomIds = new Set<number>();
  for (const op of operations) {
    if (op.op === "delete") continue;
    if (op.data.teacherId) teacherIds.add(op.data.teacherId);
    if (op.data.groupId) groupIds.add(op.data.groupId);
    if (op.data.classroomId) classroomIds.add(op.data.classroomId);
  }
  const [teacherRows, groupRows, classroomRows] = await Promise.all([
    db.teacher.findMany({
      where: { id: { in: [...teacherIds] } },
      select: { id: true, name: true },
    }),
    db.group.findMany({
      where: { id: { in: [...groupIds] } },
      select: { id: true, title: true },
    }),
    db.classroom.findMany({
      where: { id: { in: [...classroomIds] } },
      select: { id: true, name: true, address: true },
    }),
  ]);
  const teachers = new Map<string, Teacher>(teacherRows.map((t) => [t.id, t]));
  const groups = new Map<string, Group>(groupRows.map((g) => [g.id, g]));
  const classrooms = new Map<number, Classroom>(
    classroomRows.map((c) => [c.id, c]),
  );
  for (const lesson of existing) {
    if (lesson.Teacher) teachers.set(lesson.Teacher.id, lesson.Teacher);
    if (lesson.Group) groups.set(lesson.Group.id, lesson.Group);
    if (lesson.Classroom) classrooms.set(lesson.Classroom.id, lesson.Classroom);
  }

  const plans: Plan[] = operations.map((op, index) => {
    const fail = (message: string) => {
      errors.push({ index, message });
      return { index, op: op.op, changed: false };
    };
    let before: State | undefined;
    if (op.op !== "create") {
      const lesson = lessons.get(op.id);
      if (!lesson) return fail(`Пара ${op.id} не найдена`);
      before = {
        title: lesson.title,
        start: lesson.start,
        end: lesson.end,
        index: lesson.index,
        subgroup: lesson.subgroup,
        type: lesson.type,
        meetingUrl: lesson.meetingUrl,
        shouldDisplayForStudents: lesson.shouldDisplayForStudents,
        teacherId: lesson.teacherId,
        groupId: lesson.groupId,
        classroomId: lesson.classroomId,
      };
    }
    if (op.op === "delete")
      return { index, op: op.op, id: op.id, before, changed: true };

    const data = op.data;
    if (data.teacherId && !teachers.has(data.teacherId))
      return fail(`Преподаватель ${data.teacherId} не найден`);
    if (data.groupId && !groups.has(data.groupId))
      return fail(`Группа ${data.groupId} не найдена`);
    if (data.classroomId && !classrooms.has(data.classroomId))
      return fail(`Кабинет ${data.classroomId} не найден`);

    const after: State = {
      ...(before ?? {
        subgroup: null,
        type: null,
        meetingUrl: null,
        shouldDisplayForStudents: true,
        teacherId: null,
        classroomId: null,
      }),
      ...data,
    } as State;
    if (after.start >= after.end)
      return fail("Начало пары должно быть раньше конца");
    // Ссылка на встречу принадлежит преподавателю и бывает только у дистанта.
    if (
      before &&
      (after.teacherId !== before.teacherId ||
        (after.classroomId !== before.classroomId &&
          !isDistantClassroom(
            after.classroomId ? classrooms.get(after.classroomId)?.name : null,
          )))
    )
      after.meetingUrl = null;
    const changed = !before || !sameState(before, after);
    return {
      index,
      op: op.op,
      id: op.op === "update" ? op.id : undefined,
      before,
      after,
      changed,
    };
  });

  if (errors.length)
    throw new RestError(
      422,
      "VALIDATION_FAILED",
      "Операции не применены: исправьте ошибки и повторите запрос",
      errors,
    );

  const present = (state: State | undefined, id?: number) =>
    state && {
      id: id ?? null,
      title: state.title,
      start: state.start.toISOString(),
      end: state.end.toISOString(),
      index: state.index,
      subgroup: state.subgroup,
      type: state.type,
      meetingUrl: state.meetingUrl,
      shouldDisplayForStudents: state.shouldDisplayForStudents,
      teacher: (state.teacherId && teachers.get(state.teacherId)) || null,
      group: (state.groupId && groups.get(state.groupId)) || null,
      classroom:
        (state.classroomId && classrooms.get(state.classroomId)) || null,
    };

  const toApply = plans.filter((plan) => plan.changed);
  if (!options.dryRun && toApply.length) {
    try {
      await db.$transaction(
        async (tx) => {
          for (const plan of toApply) {
            if (plan.op === "delete") {
              await tx.lesson.delete({ where: { id: plan.id } });
              continue;
            }
            const data = {
              ...plan.after!,
              startDay: DateTime.fromJSDate(plan.after!.start)
                .startOf("day")
                .toJSDate(),
            };
            if (plan.op === "update")
              await tx.lesson.update({ where: { id: plan.id }, data });
            else
              plan.id = (
                await tx.lesson.create({ data, select: { id: true } })
              ).id;
          }
        },
        { maxWait: 10000, timeout: 60000 },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2025" || error.code === "P2003")
      )
        throw new RestError(
          409,
          "CONFLICT",
          "Данные изменились во время запроса. Перечитайте пары и повторите.",
        );
      throw error;
    }
  }

  const results = plans.map((plan) => ({
    index: plan.index,
    op: plan.op,
    id: plan.id ?? null,
    changed: plan.changed,
    before: present(plan.before, plan.id) ?? null,
    after: present(plan.after, plan.id) ?? null,
  }));
  const summary = {
    created: toApply.filter((plan) => plan.op === "create").length,
    updated: toApply.filter((plan) => plan.op === "update").length,
    deleted: toApply.filter((plan) => plan.op === "delete").length,
    unchanged: plans.length - toApply.length,
  };
  if (options.dryRun || !toApply.length)
    return { dryRun: !!options.dryRun, applied: false, summary, results };

  const reportItems: ResultItem[] = toApply.map((plan) => {
    const legacy = (state?: State) =>
      state && {
        ...present(state, plan.id)!,
        Group: state.groupId ? groups.get(state.groupId) : undefined,
        Teacher: state.teacherId ? teachers.get(state.teacherId) : undefined,
        group: state.groupId ? groups.get(state.groupId)?.title : undefined,
        teacher: state.teacherId
          ? teachers.get(state.teacherId)?.name
          : undefined,
        classroom: state.classroomId
          ? classrooms.get(state.classroomId)?.name
          : undefined,
      };
    const type = plan.op === "create" ? "add" : plan.op;
    return plan.op === "delete"
      ? { type, status: "success", item: legacy(plan.before) as never }
      : {
          type,
          status: "success",
          item: legacy(plan.after) as never,
          inputItem: legacy(plan.before) as never,
        };
  });

  let notificationResult: NotificationResultItem[] = [];
  let notificationError: string | null = null;
  if (options.notify) {
    // Студентов уведомляем только о видимых парах, преподавателей — обо всех.
    const isVisible = (item: ResultItem) =>
      !!(item.item as { shouldDisplayForStudents?: boolean } | undefined)
        ?.shouldDisplayForStudents ||
      !!(item.inputItem as { shouldDisplayForStudents?: boolean } | undefined)
        ?.shouldDisplayForStudents;
    try {
      notificationResult = [
        ...(await notifyFromReports(reportItems.filter(isVisible), true)),
        ...(await notifyFromReports(
          reportItems.filter((item) => !isVisible(item)),
          false,
        )),
      ];
    } catch (error) {
      notificationError = (error as Error).message;
      console.error("Ошибка отправки уведомлений API: " + notificationError);
    }
  }

  try {
    const startedAt = new Date();
    const report = generateReport(
      {
        error: null,
        notificationError,
        summary: {
          added: 0,
          updated: 0,
          deleted: 0,
          errors: 0,
          notificationsSent: 0,
          notificationsError: 0,
          groupsAffected: [],
          teachersAffected: [],
        },
        result: [],
        notificationResult: [],
      } satisfies UpdateReport,
      reportItems,
      notificationResult,
    );
    await db.report.create({
      data: {
        startedAt,
        endedAt: new Date(),
        result: JSON.stringify({
          ...report,
          apiToken: { id: client.id, name: client.name },
        }),
      },
    });
  } catch (error) {
    console.error(
      "Не удалось сохранить отчёт API: " + (error as Error).message,
    );
  }

  return {
    dryRun: false,
    applied: true,
    summary,
    results,
    ...(options.notify
      ? {
          notifications: {
            sent: notificationResult.filter((r) => r.status === "success")
              .length,
            failed: notificationResult.filter((r) => r.status === "error")
              .length,
            error: notificationError,
          },
        }
      : {}),
  };
}

function sameState(a: State, b: State) {
  return (Object.keys(a) as (keyof State)[]).every((key) => {
    const x = a[key];
    const y = b[key];
    return x instanceof Date && y instanceof Date
      ? x.getTime() === y.getTime()
      : x === y;
  });
}
